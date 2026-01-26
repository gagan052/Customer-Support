import { useState, useCallback, useRef } from "react";
import { sendMessageToAI, AIResponse } from "@/lib/client-ai-service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  // AI metadata
  confidence?: number;
  intent?: string;
  sentiment?: "positive" | "neutral" | "negative";
  action?: "resolve" | "clarify" | "escalate";
  isEscalated?: boolean;
  isResolved?: boolean;
  toolExecuted?: string | null;
  reasoning?: string;
}

interface UseAIChatOptions {
  onEscalate?: () => void;
  onResolve?: () => void;
  persistMessages?: boolean;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Initialize with welcome message
  const initializeChat = useCallback(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "agent",
      content: "Hello! I'm your AI Support Agent powered by real AI reasoning. I can help you with account issues, billing questions, technical problems, and more. How can I assist you today?",
      timestamp: new Date(),
      confidence: 0.99,
      intent: "greeting",
      sentiment: "positive",
    };
    setMessages([welcomeMessage]);
  }, []);

  // Create or get conversation in database
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      let userProfileId = null;

      if (user) {
        // Get profile id
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (profile) userProfileId = profile.id;
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          session_id: sessionIdRef.current,
          status: "active",
          user_profile_id: userProfileId, // Link to user
        })
        .select("id")
        .single();

      if (error) throw error;
      setConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  }, [conversationId]);

  // Persist message to database
  const persistMessage = useCallback(async (
    convId: string,
    role: string,
    content: string,
    aiData?: Partial<AIResponse>
  ) => {
    if (!options.persistMessages) return;

    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        role,
        content,
        intent: aiData?.intent,
        confidence: aiData?.confidence,
        sentiment: aiData?.sentiment,
        action: aiData?.action,
        rag_sources: aiData?.ragSourcesUsed ? ["knowledge_base"] : null,
      });
    } catch (error) {
      console.error("Failed to persist message:", error);
    }
  }, [options.persistMessages]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Ensure we have a conversation
      const convId = await ensureConversation();
      
      // Persist user message
      if (convId) {
        await persistMessage(convId, "user", content);
      }

      // Call AI service
      const aiResponse = await sendMessageToAI(
        content,
        sessionIdRef.current,
        convId || undefined
      );

      // Create agent message with AI metadata
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: aiResponse.content,
        timestamp: new Date(),
        confidence: aiResponse.confidence,
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment,
        action: aiResponse.action,
        isEscalated: aiResponse.action === "escalate",
        isResolved: aiResponse.action === "resolve",
        toolExecuted: aiResponse.toolExecuted,
        reasoning: aiResponse.reasoning,
      };

      setMessages(prev => [...prev, agentMessage]);

      // Persist agent message
      if (convId) {
        await persistMessage(convId, "agent", aiResponse.content, aiResponse);

        // Update conversation with latest sentiment/confidence
        await supabase
          .from("conversations")
          .update({
            sentiment: aiResponse.sentiment,
            avg_confidence: aiResponse.confidence,
            status: aiResponse.action === "escalate" ? "escalated" : 
                   aiResponse.action === "resolve" ? "resolved" : "active",
            is_resolved: aiResponse.action === "resolve",
          })
          .eq("id", convId);
      }

      // Handle special actions
      if (aiResponse.action === "escalate") {
        toast.warning("Escalating to human agent", {
          description: aiResponse.reasoning || "A human specialist will join shortly.",
        });
        options.onEscalate?.();
      } else if (aiResponse.action === "resolve") {
        toast.success("Issue resolved", {
          description: `Confidence: ${Math.round(aiResponse.confidence * 100)}%`,
        });
        options.onResolve?.();
      }

      // Show tool execution toast
      if (aiResponse.toolExecuted) {
        toast.info(`Action taken: ${aiResponse.toolExecuted.replace(/_/g, " ")}`, {
          description: "AI performed an automated action to help resolve your issue.",
        });
      }

    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to process message. Please try again.");
    } finally {
      setIsTyping(false);
    }
  }, [ensureConversation, persistMessage, options]);

  // Clear chat and start fresh
  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    initializeChat();
  }, [initializeChat]);

  return {
    messages,
    isTyping,
    sendMessage,
    clearChat,
    initializeChat,
    conversationId,
    sessionId: sessionIdRef.current,
  };
}
