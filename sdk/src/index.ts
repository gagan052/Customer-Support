export interface RAGConfig {
  apiKey?: string;
  authToken?: string;
  baseUrl?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata: any;
  }>;
}

export class RAGClient {
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = {
      baseUrl: 'http://localhost:8000',
      ...config
    };
  }

  async chat(message: string, history: Message[] = []): Promise<ChatResponse> {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    } else if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    } else {
        throw new Error("Missing Authentication: Provide apiKey or authToken");
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: message }]
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Chat failed (${response.status}): ${err}`);
      }

      return await response.json();
    } catch (error) {
      console.error("RAG Client Error:", error);
      throw error;
    }
  }
}
