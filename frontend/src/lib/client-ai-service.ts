
export type { AIResponse } from "./ai-service";
import { AIResponse } from "./ai-service";
import { retrieveKnowledge } from "./client-knowledge-service";
import { getOpenAIKey, getGeminiKey, getActiveProvider } from "./api-config";

export async function sendMessageToAI(
  message: string,
  sessionId: string,
  conversationId?: string
): Promise<AIResponse> {
  const provider = getActiveProvider();
  
  // 1. Retrieve Context (Best Effort)
  let context = "";
  try {
    // Attempt to retrieve knowledge using the active provider
    context = await retrieveKnowledge(message);
  } catch (e) {
    console.warn("RAG Retrieval failed, proceeding without context:", e);
  }
    
  // 2. Build System Prompt
  const systemPrompt = `
You are a helpful and intelligent AI support agent.
Your goal is to assist users with their questions accurately and efficiently.

Context from Knowledge Base:
${context || "No context available."}

Instructions:
- Use the provided context to answer the user's question.
- If the context doesn't contain the answer, use your general knowledge but be transparent.
- Be polite, professional, and concise.
- Output your response in JSON format matching the schema below.

Response Schema (JSON):
{
  "content": "The actual response text to the user",
  "intent": "The classified intent (e.g., general_query, technical_issue)",
  "confidence": 0.0 to 1.0,
  "sentiment": "positive" | "neutral" | "negative",
  "action": "resolve" | "clarify" | "escalate",
  "reasoning": "Brief explanation of your decision"
}
    `;

  if (provider === 'gemini') {
    return sendMessageToGemini(message, systemPrompt, !!context);
  } else {
    return sendMessageToOpenAI(message, systemPrompt, !!context);
  }
}

async function sendMessageToGemini(message: string, systemPrompt: string, hasContext: boolean): Promise<AIResponse> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key. Please configure it in Settings.");

  try {
    // Use the Gemini Flash model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // For REST v1, simplify: send system + user content together
        contents: [{
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser message:\n${message}` }]
        }]
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) throw new Error("Empty response from Gemini");

    // Parse JSON response
    try {
      let cleanContent = content;
      // Remove markdown code blocks if present
      if (cleanContent.includes("```json")) {
        cleanContent = cleanContent.replace(/```json\n?|\n?```/g, "");
      } else if (cleanContent.includes("```")) {
        cleanContent = cleanContent.replace(/```\n?|\n?```/g, "");
      }
      
      const parsed = JSON.parse(cleanContent);
      return {
        ...parsed,
        ragSourcesUsed: hasContext
      };
    } catch (e) {
      console.error("Failed to parse AI JSON response", e);
      return {
        content: content,
        intent: "general_query",
        confidence: 0.5,
        sentiment: "neutral",
        action: "clarify",
        reasoning: "Failed to parse structured response",
        ragSourcesUsed: hasContext
      };
    }

  } catch (error: any) {
    console.error("Client AI Service Error (Gemini):", error);
    
    let errorMessage = "I apologize, but I'm having trouble connecting to Gemini. Please check your API key.";
    let intent = "error";
    
    if (error.message.includes("429") || error.message.includes("quota") || error.message.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "I apologize, but the AI service is currently overloaded (Quota Exceeded). Please try again later or check your API plan.";
        intent = "overloaded";
    }

    return {
      content: errorMessage,
      intent: intent,
      confidence: 0,
      sentiment: "neutral",
      action: "escalate",
      error: error.message
    };
  }
}

async function sendMessageToOpenAI(message: string, systemPrompt: string, hasContext: boolean): Promise<AIResponse> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("Missing OpenAI API Key. Please configure it in Settings.");

  try {
    // 3. Call OpenAI Chat Completion
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or gpt-3.5-turbo
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        
        // Check for quota exceeded
        if (response.status === 429 || errorText.includes("insufficient_quota")) {
          return {
            content: "I apologize, but the AI service is currently unavailable due to quota limits (Mock Mode). \n\n" + 
                     "However, I can confirm that your system is functioning correctly. Please update the OpenAI API key to restore full intelligence.",
            intent: "technical_issue",
            confidence: 1.0,
            sentiment: "neutral",
            action: "escalate",
            reasoning: "OpenAI Quota Exceeded",
            ragSourcesUsed: false
          };
        }

        throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // Parse JSON response
    try {
      let cleanContent = content;
      // Remove markdown code blocks if present
      if (cleanContent.includes("```json")) {
        cleanContent = cleanContent.replace(/```json\n?|\n?```/g, "");
      } else if (cleanContent.includes("```")) {
        cleanContent = cleanContent.replace(/```\n?|\n?```/g, "");
      }

      const parsed = JSON.parse(cleanContent);
      return {
        ...parsed,
        ragSourcesUsed: hasContext
      };
    } catch (e) {
      console.error("Failed to parse AI JSON response", e);
      return {
        content: content,
        intent: "general_query",
        confidence: 0.5,
        sentiment: "neutral",
        action: "clarify",
        reasoning: "Failed to parse structured response",
        ragSourcesUsed: hasContext
      };
    }

  } catch (error: any) {
    console.error("Client AI Service Error (OpenAI):", error);
    return {
      content: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
      intent: "error",
      confidence: 0,
      sentiment: "neutral",
      action: "escalate",
      error: error.message
    };
  }
}
