
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use Hugging Face Inference API for embeddings
const HF_API_KEY = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
const HF_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${await response.text()}`);
  }

  const result = await response.json();
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { query, threshold = 0.5, limit = 5 } = await req.json();

    if (!query) {
      throw new Error("Missing search query");
    }

    // 1. Generate Embedding for Query
    const embedding = await generateEmbedding(query);

    // 2. Perform Similarity Search using pgvector
    // Note: 'match_documents' is a stored procedure we assume exists or will create
    const { data: chunks, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ results: chunks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
