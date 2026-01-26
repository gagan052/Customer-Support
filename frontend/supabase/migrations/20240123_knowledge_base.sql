
-- Enable pgvector extension to work with embeddings
create extension if not exists vector;

-- Table to store knowledge base documents
create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_type text,
  chunk_count int default 0,
  status text default 'pending', -- pending, indexed, error
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table to store document chunks and embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references knowledge_documents(id) on delete cascade,
  content text,
  embedding vector(384) -- MiniLM-L6 produces 384 dimensions
);

-- Function to search for similar documents
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RLS Policies
alter table knowledge_documents enable row level security;
alter table document_chunks enable row level security;

-- Allow all authenticated users to read documents (Knowledge Base is shared for support agents)
create policy "Allow read access for authenticated users"
  on knowledge_documents for select
  to authenticated
  using (true);

-- Allow all authenticated users to insert/update/delete documents
create policy "Allow write access for authenticated users"
  on knowledge_documents for all
  to authenticated
  using (true);

-- Same for chunks
create policy "Allow read access for chunks"
  on document_chunks for select
  to authenticated
  using (true);

create policy "Allow write access for chunks"
  on document_chunks for all
  to authenticated
  using (true);
