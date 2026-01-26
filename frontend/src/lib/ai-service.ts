// ===== AI SERVICE =====
// Central service for AI interactions - connects to real LLM via edge function

import { getOpenAIKey, getGeminiKey, getActiveProvider } from "./api-config";

export interface AIResponse {
  content: string;
  intent: string;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  action: "resolve" | "clarify" | "escalate";
  reasoning?: string;
  toolExecuted?: string | null;
  toolResult?: Record<string, unknown> | null;
  ragSourcesUsed?: boolean;
  error?: string;
  fallback?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/**
 * Sends a message to the AI agent and receives structured response
 * 
 * The AI will:
 * 1. Classify intent (login_issue, payment_issue, etc.)
 * 2. Detect sentiment (positive/neutral/negative)
 * 3. Retrieve relevant knowledge from RAG
 * 4. Make autonomous decision (resolve/clarify/escalate)
 * 5. Execute tools if needed (reset_password, create_ticket, etc.)
 */
export async function sendMessageToAI(
  message: string,
  sessionId: string,
  conversationId?: string
): Promise<AIResponse> {
  try {
    const provider = getActiveProvider();
    const apiKey = provider === "gemini" ? getGeminiKey() : getOpenAIKey();

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message,
        sessionId,
        conversationId,
        apiKey,
      }),
    });

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 429) {
        return {
          content: "I'm experiencing high demand right now. Please try again in a moment.",
          intent: "error",
          confidence: 0,
          sentiment: "neutral",
          action: "clarify",
          error: "rate_limited",
        };
      }
      if (response.status === 402) {
        return {
          content: "I'm temporarily unavailable. Please try again later or contact support directly.",
          intent: "error",
          confidence: 0,
          sentiment: "neutral",
          action: "escalate",
          error: "quota_exceeded",
        };
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();

    // Handle fallback case (edge function error)
    if (data.fallback || data.error) {
      console.warn("[AI Service] Fallback mode:", data.error);
      return getFallbackResponse(message);
    }

    return data as AIResponse;

  } catch (error) {
    console.error("[AI Service] Error:", error);
    return getFallbackResponse(message);
  }
}

/**
 * Fallback response when AI is unavailable
 * Uses simple keyword matching as last resort
 */
function getFallbackResponse(message: string): AIResponse {
  const lowerMessage = message.toLowerCase();
  
  // Simple keyword-based fallback
  const fallbackResponses: Record<string, { content: string; intent: string }> = {
    password: {
      content: "I understand you need help with your password. To reset it, click 'Forgot Password' on the login page. You'll receive an email within a few minutes. If you don't see it, check your spam folder.",
      intent: "login_issue",
    },
    refund: {
      content: "I can help with refund requests. Our policy allows refunds within 30 days of purchase. Could you please provide your order number so I can check eligibility?",
      intent: "refund_request",
    },
    payment: {
      content: "I see you're having a payment issue. Could you tell me more about what happened? For example, did the payment fail, or were you charged incorrectly?",
      intent: "payment_issue",
    },
    bug: {
      content: "I'm sorry you're experiencing a technical issue. Could you describe what you were doing when this happened, and any error messages you saw?",
      intent: "technical_bug",
    },
    error: {
      content: "I understand you're encountering an error. To help you better, could you please share the exact error message or describe what's happening?",
      intent: "technical_bug",
    },
  };

  for (const [keyword, response] of Object.entries(fallbackResponses)) {
    if (lowerMessage.includes(keyword)) {
      return {
        content: response.content,
        intent: response.intent,
        confidence: 0.6,
        sentiment: "neutral",
        action: "clarify",
        fallback: true,
      };
    }
  }

  // Generic fallback
  return {
    content: "I'd like to help you. Could you please provide more details about your question or issue so I can assist you better?",
    intent: "general_query",
    confidence: 0.5,
    sentiment: "neutral",
    action: "clarify",
    fallback: true,
  };
}

/**
 * Streaming version for real-time responses
 * Uses SSE to stream tokens as they arrive
 */
export async function streamMessageToAI(
  message: string,
  sessionId: string,
  conversationId: string | undefined,
  onDelta: (text: string) => void,
  onComplete: (response: AIResponse) => void,
  onError: (error: string) => void
): Promise<void> {
  // For now, use non-streaming endpoint
  // Streaming can be added later for better UX
  try {
    const response = await sendMessageToAI(message, sessionId, conversationId);
    
    // Simulate streaming by chunking the response
    const words = response.content.split(" ");
    let index = 0;
    
    const streamInterval = setInterval(() => {
      if (index < words.length) {
        onDelta(words[index] + " ");
        index++;
      } else {
        clearInterval(streamInterval);
        onComplete(response);
      }
    }, 30); // ~30ms per word for natural feel
    
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}
