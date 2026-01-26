import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { getActiveProvider, getGeminiKey, getOpenAIKey } from '../../../shared/utils/api-config';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeService {
  constructor(private supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.supabase;
  }

  async processDocument(documentId: string) {
    try {
      const provider = getActiveProvider();
      const apiKey = provider === 'gemini' ? getGeminiKey() : getOpenAIKey();

      if (!apiKey) throw new Error(`Missing API Key for ${provider}`);

      // 1. Fetch Document Metadata
      const { data: doc, error: fetchError } = await this.supabase
        .from("knowledge_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (fetchError || !doc) {
        throw new Error(`Document not found: ${fetchError?.message}`);
      }

      // 2. Download File Content
      // @ts-ignore
      const storagePath = doc.metadata?.storage_path;
      if (!storagePath) {
        console.warn(`Skipping document ${documentId}: Missing storage path in metadata`);
        return; 
      }

      const { data: fileBlob, error: downloadError } = await this.supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // 3. Send to Python Backend
      const formData = new FormData();
      formData.append("file", fileBlob, doc.name);
      formData.append("provider", provider);
      formData.append("api_key", apiKey);
      formData.append("document_id", documentId);
      
      const session = await this.supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const headers: Record<string, string> = {};
      if (token) {
          headers["Authorization"] = `Bearer ${token}`;
      }

      const backendUrl = "https://helpful-aid-agent.onrender.com/ingest";
      
      const response = await fetch(backendUrl, {
          method: "POST",
          body: formData,
          headers: headers
      });
      
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Python Backend Error: ${errorText}`);
      }
      
      const result = await response.json();
      return { success: true, ...result };

    } catch (error: any) {
      console.error("Processing error:", error);
      throw error;
    }
  }
}
