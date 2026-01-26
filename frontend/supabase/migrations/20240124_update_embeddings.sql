
-- Change vector dimension to 1536 for OpenAI text-embedding-3-small
-- Note: This requires dropping the column or altering it if it has data. 
-- Since we are "training" from scratch, we can clear the data.

TRUNCATE TABLE public.document_chunks;

ALTER TABLE public.document_chunks 
ALTER COLUMN embedding TYPE vector(1536);

-- Update match_documents function signature
DROP FUNCTION IF EXISTS match_documents;

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
