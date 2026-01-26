import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getOpenAIKey, getGeminiKey, getActiveProvider } from "./api-config";

// Helper to construct backend URLs
function getBackendUrl(endpoint: string) {
  let url = import.meta.env.VITE_PYTHON_BACKEND_URL || "http://localhost:8000/ingest";
  // If url ends with /ingest, strip it to get base
  if (url.endsWith("/ingest")) {
    url = url.slice(0, -7);
  }
  // Remove trailing slash
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  // Ensure endpoint doesn't start with / if url already has it (though we stripped it)
  const safeEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${url}/${safeEndpoint}`;
}

// Process Document (Delegates to Python Backend)
export async function processDocument(documentId: string) {
  try {
    const provider = getActiveProvider();
    // API Key is now handled server-side from .env for ingestion
    // const apiKey = provider === 'gemini' ? getGeminiKey() : getOpenAIKey();
    
    // 1. Fetch Document Metadata
    const { data: doc, error: fetchError } = await supabase
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

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // 3. Send to Python Backend
    const formData = new FormData();
    formData.append("file", fileBlob, doc.name);
    formData.append("provider", provider);
    // formData.append("api_key", apiKey); // No longer needed
    formData.append("document_id", documentId);
    
    // Get Session Token for RLS
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Python Backend URL
    const backendUrl = getBackendUrl("ingest");
    
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
    // Preserve existing metadata (e.g. storage_path) instead of overwriting it.
    const { data: existing } = await supabase
      .from("knowledge_documents")
      .select("metadata")
      .eq("id", documentId)
      .single();

    const baseMetadata = (existing && typeof existing.metadata === "object" && existing.metadata !== null)
      ? existing.metadata
      : {};

    await supabase
      .from("knowledge_documents")
      .update({ status: "error", metadata: { ...(baseMetadata as any), error: error.message } })
      .eq("id", documentId);
    throw error;
  }
}

// Retrieve Knowledge (Client-Side RAG -> Backend Pinecone Query)
export async function retrieveKnowledge(query: string): Promise<string> {
  try {
    const provider = getActiveProvider();
    // API Key is now handled server-side from .env for retrieval
    // const apiKey = provider === 'gemini' ? getGeminiKey() : getOpenAIKey();

    const backendUrl = getBackendUrl("query");

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
        provider: provider
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend Query Error:", errorText);
      return "";
    }

    const result = await response.json();
    const matches = result.matches as string[];

    if (!matches || matches.length === 0) {
      return "";
    }

    return matches
      .map((content) => `### Content\n${content}`)
      .join("\n\n");

  } catch (e) {
    console.error("Retrieval error:", e);
    return "";
  }
}
