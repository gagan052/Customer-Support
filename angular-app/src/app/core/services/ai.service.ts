import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private aiChatUrl = `${environment.supabaseUrl}/functions/v1/ai-chat`;

  constructor(private http: HttpClient) {}

  async sendMessageToAI(message: string, sessionId: string, conversationId?: string): Promise<AIResponse> {
    const apiKey = localStorage.getItem("openai_api_key");
    
    const body = {
        message,
        sessionId,
        conversationId,
        apiKey: apiKey || undefined
    };

    const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.supabaseKey}`
    });

    try {
        return await firstValueFrom(this.http.post<AIResponse>(this.aiChatUrl, body, { headers }));
    } catch (error: any) {
         if (error instanceof HttpErrorResponse) {
            if (error.status === 429) {
                return {
                    content: "I'm experiencing high demand right now. Please try again in a moment.",
                    intent: "error",
                    confidence: 0,
                    sentiment: "neutral",
                    action: "clarify",
                    error: "rate_limited"
                };
            }
            if (error.status === 402) {
                 return {
                    content: "I'm temporarily unavailable. Please try again later or contact support directly.",
                    intent: "error",
                    confidence: 0,
                    sentiment: "neutral",
                    action: "clarify",
                    error: "payment_required"
                 };
            }
         }
         
         // Default error fallback
         console.error("AI Chat Error:", error);
         return {
            content: "I'm sorry, I encountered an error. Please try again.",
            intent: "error",
            confidence: 0,
            sentiment: "neutral",
            action: "clarify",
            error: error.message || "Unknown error",
            fallback: true
         };
    }
  }
}
