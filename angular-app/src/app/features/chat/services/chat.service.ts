import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AiService, AIResponse } from '../../../core/services/ai.service';
import { toast } from 'ngx-sonner';

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

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private _messages = new BehaviorSubject<Message[]>([]);
  private _isTyping = new BehaviorSubject<boolean>(false);
  private _conversationId = new BehaviorSubject<string | null>(null);
  
  messages$ = this._messages.asObservable();
  isTyping$ = this._isTyping.asObservable();
  conversationId$ = this._conversationId.asObservable();

  private sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  persistMessages = true;

  // Event subjects
  private _escalationSubject = new Subject<void>();
  private _resolveSubject = new Subject<void>();
  
  onEscalate$ = this._escalationSubject.asObservable();
  onResolve$ = this._resolveSubject.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private aiService: AiService
  ) {}

  initializeChat() {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "agent",
      content: "Hello! I'm your AI Support Agent powered by real AI reasoning. I can help you with account issues, billing questions, technical problems, and more. How can I assist you today?",
      timestamp: new Date(),
      confidence: 0.99,
      intent: "greeting",
      sentiment: "positive",
    };
    this._messages.next([welcomeMessage]);
  }

  async ensureConversation(): Promise<string | null> {
    const currentId = this._conversationId.value;
    if (currentId) return currentId;

    try {
      const { data: { user } } = await this.supabaseService.supabase.auth.getUser();
      let userProfileId = null;

      if (user) {
        const { data: profile } = await this.supabaseService.supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (profile) userProfileId = profile.id;
      }

      const { data, error } = await this.supabaseService.supabase
        .from("conversations")
        .insert({
          session_id: this.sessionId,
          status: "active",
          user_profile_id: userProfileId,
        })
        .select("id")
        .single();

      if (error) throw error;
      this._conversationId.next(data.id);
      return data.id;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  }

  async persistMessage(
    convId: string,
    role: string,
    content: string,
    aiData?: Partial<AIResponse>
  ) {
    if (!this.persistMessages) return;

    try {
      await this.supabaseService.supabase.from("messages").insert({
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
  }

  async sendMessage(content: string) {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    const currentMessages = this._messages.value;
    this._messages.next([...currentMessages, userMessage]);
    this._isTyping.next(true);

    try {
      const convId = await this.ensureConversation();
      
      if (convId) {
        await this.persistMessage(convId, "user", content);
      }

      const aiResponse = await this.aiService.sendMessageToAI(
        content,
        this.sessionId,
        convId || undefined
      );

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

      this._messages.next([...this._messages.value, agentMessage]);

      if (convId) {
        await this.persistMessage(convId, "agent", aiResponse.content, aiResponse);

        await this.supabaseService.supabase
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

      if (aiResponse.action === "escalate") {
        toast.warning("Escalating to human agent", {
          description: aiResponse.reasoning || "A human specialist will join shortly.",
        });
        this._escalationSubject.next();
      } else if (aiResponse.action === "resolve") {
        toast.success("Issue resolved", {
          description: `Confidence: ${Math.round(aiResponse.confidence * 100)}%`,
        });
        this._resolveSubject.next();
      }

      if (aiResponse.toolExecuted) {
        toast.info(`Action taken: ${aiResponse.toolExecuted.replace(/_/g, " ")}`, {
          description: "AI performed an automated action to help resolve your issue.",
        });
      }

    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to process message. Please try again.");
    } finally {
      this._isTyping.next(false);
    }
  }

  clearChat() {
    this._messages.next([]);
    this._conversationId.next(null);
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.initializeChat();
  }

  // Getters for convenience
  get messages() { return this._messages.value; }
  get isTyping() { return this._isTyping.value; }
}
