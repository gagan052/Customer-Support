import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== TOOL REGISTRY =====
// AI can invoke these tools to perform actions
const toolRegistry = {
  reset_password: {
    description: "Initiates password reset for a user",
    parameters: { email: "string" },
    execute: async (params: { email: string }) => {
      // In production: trigger actual password reset flow
      console.log(`[TOOL] Password reset initiated for: ${params.email}`);
      return { 
        success: true, 
        action: "email_sent",
        message: "Password reset email has been sent. Please check your inbox."
      };
    }
  },
  check_refund_policy: {
    description: "Checks if an order is eligible for refund",
    parameters: { order_id: "string" },
    execute: async (params: { order_id: string }) => {
      // Simulate policy check (in production: query orders table)
      const daysSincePurchase = Math.floor(Math.random() * 45);
      const eligible = daysSincePurchase <= 30;
      return {
        order_id: params.order_id,
        eligible,
        days_since_purchase: daysSincePurchase,
        reason: eligible 
          ? "Order is within 30-day refund window" 
          : "Order is past the 30-day refund window"
      };
    }
  },
  create_ticket: {
    description: "Creates a support ticket for human review",
    parameters: { title: "string", priority: "string", description: "string" },
    execute: async (params: { title: string; priority: string; description: string }) => {
      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      console.log(`[TOOL] Ticket created: ${ticketId}`);
      return {
        ticket_id: ticketId,
        status: "created",
        priority: params.priority,
        message: `Ticket ${ticketId} has been created and will be reviewed shortly.`
      };
    }
  },
  escalate_to_human: {
    description: "Escalates the conversation to a human agent",
    parameters: { reason: "string", urgency: "string" },
    execute: async (params: { reason: string; urgency: string }) => {
      console.log(`[TOOL] Escalation triggered: ${params.reason}`);
      return {
        escalated: true,
        estimated_wait: params.urgency === "high" ? "2-5 minutes" : "10-15 minutes",
        message: "Connecting you with a human specialist who can better assist you."
      };
    }
  }
};

// Tool definitions for LLM function calling
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "analyze_and_respond",
      description: "Analyze user message and generate structured response with decision",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["login_issue", "payment_issue", "refund_request", "technical_bug", "feature_request", "account_management", "general_query"],
            description: "The classified intent of the user's message"
          },
          confidence: {
            type: "number",
            description: "Confidence score 0.0-1.0 for the classification"
          },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Detected emotional tone of the user"
          },
          decision: {
            type: "string",
            enum: ["resolve", "clarify", "escalate"],
            description: "Action decision based on confidence: resolve if >=0.85, clarify if 0.6-0.85, escalate if <0.6"
          },
          response: {
            type: "string",
            description: "The helpful response to send to the user"
          },
          reasoning: {
            type: "string",
            description: "Internal reasoning for the decision (for logging/debugging)"
          },
          tool_to_call: {
            type: "string",
            enum: ["reset_password", "check_refund_policy", "create_ticket", "escalate_to_human", "none"],
            description: "Tool to execute, or 'none' if no tool needed"
          },
          tool_params: {
            type: "object",
            description: "Parameters to pass to the tool if tool_to_call is not 'none'"
          }
        },
        required: ["intent", "confidence", "sentiment", "decision", "response", "reasoning", "tool_to_call"],
        additionalProperties: false
      }
    }
  }
];

// ===== SYSTEM PROMPT =====
const buildSystemPrompt = (knowledgeContext: string, userMemory: string, conversationHistory: string) => `
You are an autonomous AI Customer Support Agent with real decision-making capabilities.

## YOUR IDENTITY
- You are helpful, professional, and empathetic
- You explain complex issues simply
- You take ownership of problems and see them through

## KNOWLEDGE BASE (RAG CONTEXT)
Use this information to answer questions accurately:
${knowledgeContext || "No specific knowledge retrieved for this query."}

## USER MEMORY
What we know about this user:
${userMemory || "New user - no prior history."}

## CONVERSATION HISTORY
${conversationHistory || "This is the start of the conversation."}

## DECISION RULES (CRITICAL - FOLLOW EXACTLY)
1. If confidence >= 0.85 AND you have a clear answer → decision: "resolve"
2. If confidence 0.6-0.85 OR you need more info → decision: "clarify"
3. If confidence < 0.6 OR user is frustrated OR issue is complex → decision: "escalate"

## SENTIMENT HANDLING
- If sentiment is "negative": Be extra empathetic, apologize for frustration, escalate faster
- If sentiment is "positive": Maintain friendly tone, express appreciation
- If sentiment is "neutral": Be efficient and professional

## TOOL USAGE
- reset_password: When user can't access account and requests password help
- check_refund_policy: When user asks about refunds or returns
- create_ticket: When issue needs human follow-up but isn't urgent
- escalate_to_human: When user explicitly asks for human OR you cannot resolve

## RESPONSE GUIDELINES
- Keep responses concise but complete
- Use markdown formatting when helpful
- If you use a tool, explain what action you're taking
- Always end with a clear next step or question

Analyze the user's message and respond using the analyze_and_respond function.
`;

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.replace(/\n/g, ' ')
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

// ===== RAG RETRIEVAL =====
async function retrieveKnowledge(supabase: any, query: string, apiKey: string, useGemini: boolean): Promise<string> {
  try {
    let embedding;
    if (useGemini) {
        // Use Gemini Embeddings
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/embedding-001",
                content: { parts: [{ text: query.replace(/\n/g, ' ') }] }
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini Embedding Error: ${err}`);
        }
        const result = await response.json();
        // Truncate to 384 dims to match match_documents schema
        const values = result.embedding.values || [];
        embedding = Array.isArray(values) ? values.slice(0, 384) : [];
    } else {
        // Use OpenAI Embeddings
        const openaiEmb = await generateEmbedding(query, apiKey);
        // Truncate to 384 dims to match match_documents schema
        embedding = Array.isArray(openaiEmb) ? openaiEmb.slice(0, 384) : [];
    }

    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.3, // Lower threshold for better recall
      match_count: 5
    });

    if (error) {
      console.error("Match error:", error);
      return "";
    }
    
    if (!documents || documents.length === 0) {
      return "";
    }

    return documents.map((d: any) => `### Content (Similarity: ${d.similarity.toFixed(2)})\n${d.content}`).join("\n\n");
  } catch (e) {
    console.error("Retrieval error:", e);
    return "";
  }
}

// ===== USER MEMORY =====
async function getUserMemory(supabase: any, sessionId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, email, preferences, past_issues")
    .limit(1)
    .single();

  if (!profile) return "";

  const parts = [];
  if (profile.display_name) parts.push(`Name: ${profile.display_name}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.past_issues) {
    const issues = profile.past_issues as any[];
    if (issues.length > 0) {
      parts.push(`Past issues: ${issues.slice(-3).map((i: any) => i.type || i).join(", ")}`);
    }
  }
  
  return parts.join("\n");
}

// ===== CONVERSATION HISTORY =====
async function getConversationHistory(supabase: any, conversationId: string): Promise<string> {
  if (!conversationId) return "";

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!messages?.length) return "";

  return messages
    .map((m: any) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, conversationId, apiKey } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Gemini API Key (user's own key or env var)
    const GEMINI_API_KEY = apiKey || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY");
    
    // Fallback to OpenAI if Gemini not found (backward compatibility)
    const OPENAI_API_KEY = apiKey || Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPEN_AI_API_KEY");
    
    // Prefer Gemini to avoid OpenAI quota issues
    const useGemini = !!GEMINI_API_KEY;
    const API_KEY = useGemini ? GEMINI_API_KEY : OPENAI_API_KEY;

    if (!API_KEY) {
      throw new Error("No AI API Key (Gemini or OpenAI) is configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parallel context retrieval
    const [knowledgeContext, userMemory, conversationHistory] = await Promise.all([
      retrieveKnowledge(supabase, message, API_KEY, useGemini),
      getUserMemory(supabase, sessionId),
      getConversationHistory(supabase, conversationId)
    ]);

    const systemPrompt = buildSystemPrompt(knowledgeContext, userMemory, conversationHistory);

    // Call AI API (Gemini or OpenAI)
    const maxRetries = 3;
    let aiResponse: Response | null = null;
    let lastError: string = "";

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (useGemini) {
           // Gemini API call
           aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: systemPrompt + "\n\nUser Message: " + message }]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1000,
              }
            })
          });
        } else {
           // OpenAI API call
           aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ],
              tools: toolDefinitions,
              tool_choice: { type: "function", function: { name: "analyze_and_respond" } }
            }),
          });
        }

        if (aiResponse.ok) {
          break; // Success
        }
        
        // Handle Rate Limits and Errors...
        if (aiResponse.status === 429) {
          const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`[AI] Rate limited. Attempt ${attempt + 1}. Waiting ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        lastError = `AI API error: ${aiResponse.status} ${errorText}`;
        break;

      } catch (fetchError) {
         console.error(`[AI] Fetch error on attempt ${attempt + 1}:`, fetchError);
         lastError = fetchError instanceof Error ? fetchError.message : "Network error";
         if (attempt < maxRetries - 1) {
           await new Promise(resolve => setTimeout(resolve, 1000));
         }
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      throw new Error(lastError || "Failed to get AI response");
    }

    const aiData = await aiResponse.json();
    let decision;

    if (useGemini) {
      // Parse Gemini response
      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      
      // Clean up markdown code blocks if present
      const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
      try {
        decision = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", text);
        // Fallback for parsing failure
        decision = {
          intent: "general_query",
          confidence: 0.5,
          sentiment: "neutral",
          decision: "clarify",
          response: text, // Use raw text as response
          reasoning: "Failed to parse structured JSON",
          tool_to_call: "none"
        };
      }
    } else {
      // Parse OpenAI response (existing logic)
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
         // Fallback if OpenAI refuses to use tool
         decision = {
             intent: "general_query",
             confidence: 0.5,
             sentiment: "neutral",
             decision: "clarify",
             response: aiData.choices?.[0]?.message?.content || "I'm not sure how to help with that.",
             reasoning: "No structured tool response",
             tool_to_call: "none"
         };
      } else {
         decision = JSON.parse(toolCall.function.arguments);
      }
    }
    
    // Execute tool if requested
    let toolResult = null;
    if (decision.tool_to_call && decision.tool_to_call !== "none") {
      const tool = toolRegistry[decision.tool_to_call as keyof typeof toolRegistry];
      if (tool) {
        try {
          toolResult = await tool.execute(decision.tool_params || {});
          console.log(`[AI] Tool executed: ${decision.tool_to_call}`, toolResult);
        } catch (toolError) {
          console.error(`[AI] Tool execution failed:`, toolError);
        }
      }
    }

    // Log decision for debugging/analytics
    console.log("[AI Decision]", {
      intent: decision.intent,
      confidence: decision.confidence,
      sentiment: decision.sentiment,
      decision: decision.decision,
      reasoning: decision.reasoning,
      tool: decision.tool_to_call
    });

    // Construct final response
    const response = {
      content: decision.response,
      intent: decision.intent,
      confidence: decision.confidence,
      sentiment: decision.sentiment,
      action: decision.decision,
      reasoning: decision.reasoning,
      toolExecuted: decision.tool_to_call !== "none" ? decision.tool_to_call : null,
      toolResult,
      ragSourcesUsed: !!knowledgeContext
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
