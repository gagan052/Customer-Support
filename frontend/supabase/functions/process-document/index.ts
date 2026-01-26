import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_AI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const { document_id } = await req.json();

    if (!document_id) {
      throw new Error("Missing document_id");
    }

    // 1. Fetch Document Metadata
    const { data: doc, error: fetchError } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (fetchError || !doc) {
      throw new Error(`Document not found: ${fetchError?.message}`);
    }

    // 2. Download File Content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.metadata.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // 3. Extract Text
    const textContent = await fileData.text();
    
    // Save content to DB for easier editing/viewing
    await supabase
      .from("knowledge_documents")
      .update({ content: textContent })
      .eq("id", document_id);
    
    // 4. Chunk Text
    // Recursive character text splitter logic simplified
    const CHUNK_SIZE = 1000;
    const CHUNK_OVERLAP = 200;
    const chunks: string[] = [];
    
    let start = 0;
    while (start < textContent.length) {
      const end = Math.min(start + CHUNK_SIZE, textContent.length);
      chunks.push(textContent.slice(start, end));
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    // 5. Generate Embeddings & Store Chunks
    let processedChunks = 0;
    
    // Delete existing chunks first (re-indexing case)
    await supabase.from("document_chunks").delete().eq("document_id", document_id);

    // Process in batches to avoid rate limits
    for (const chunkText of chunks) {
      try {
        const embedding = await generateEmbedding(chunkText, openaiKey);
        
        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert({
            document_id: document_id,
            content: chunkText,
            embedding: embedding
          });

        if (insertError) {
          console.error("Chunk insert error:", insertError);
        } else {
          processedChunks++;
        }
      } catch (e) {
        console.error("Error processing chunk:", e);
      }
    }

    // 6. Update Document Status
    await supabase
      .from("knowledge_documents")
      .update({
        status: "indexed",
        chunk_count: processedChunks,
        updated_at: new Date().toISOString()
      })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, chunks_processed: processedChunks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Processing error:", error);
    
    // Attempt to update status to error
    try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { document_id } = await req.clone().json().catch(() => ({}));
        if (document_id) {
             await supabase
            .from("knowledge_documents")
            .update({ status: "error" })
            .eq("id", document_id);
        }
    } catch (e) {
        // Ignore secondary error
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
