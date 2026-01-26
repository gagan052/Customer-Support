
-- Enable pgvector extension to work with embeddings
create extension if not exists vector;

-- Create conversation status enum
DO $$ BEGIN
    CREATE TYPE public.conversation_status AS ENUM ('active', 'resolved', 'escalated', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sentiment enum
DO $$ BEGIN
    CREATE TYPE public.sentiment_type AS ENUM ('positive', 'neutral', 'negative');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table for user profiles (customer profiles)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  past_issues JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  status conversation_status NOT NULL DEFAULT 'active',
  sentiment sentiment_type DEFAULT 'neutral',
  avg_confidence DECIMAL(5,4) DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  confidence DECIMAL(5,4),
  intent TEXT,
  sentiment sentiment_type,
  action TEXT,
  rag_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for knowledge base documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT,
  content TEXT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'needs-update', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for document chunks (Vector Store)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  content TEXT,
  embedding vector(384) -- Embedding vectors stored at 384 dimensions
);

-- Create table for feedback/learning
CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  was_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to search for similar documents
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
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

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversations
DROP POLICY IF EXISTS "Public read access to conversations" ON public.conversations;
CREATE POLICY "Public read access to conversations" ON public.conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access to conversations" ON public.conversations;
CREATE POLICY "Public insert access to conversations" ON public.conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access to conversations" ON public.conversations;
CREATE POLICY "Public update access to conversations" ON public.conversations FOR UPDATE USING (true);

-- Messages
DROP POLICY IF EXISTS "Public read access to messages" ON public.messages;
CREATE POLICY "Public read access to messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access to messages" ON public.messages;
CREATE POLICY "Public insert access to messages" ON public.messages FOR INSERT WITH CHECK (true);

-- Knowledge Base Documents
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.knowledge_documents;
CREATE POLICY "Allow read access for authenticated users" ON public.knowledge_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.knowledge_documents;
CREATE POLICY "Allow write access for authenticated users" ON public.knowledge_documents FOR ALL TO authenticated USING (true);

-- Document Chunks
DROP POLICY IF EXISTS "Allow read access for chunks" ON public.document_chunks;
CREATE POLICY "Allow read access for chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write access for chunks" ON public.document_chunks;
CREATE POLICY "Allow write access for chunks" ON public.document_chunks FOR ALL TO authenticated USING (true);


-- ==========================================
-- STORAGE BUCKET CREATION
-- ==========================================

-- Create the 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- Allow authenticated users to upload files to 'documents' bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'documents' );

-- Allow authenticated users to view/download files in 'documents' bucket
DROP POLICY IF EXISTS "Allow authenticated downloads" ON storage.objects;
CREATE POLICY "Allow authenticated downloads" ON storage.objects FOR SELECT TO authenticated USING ( bucket_id = 'documents' );

-- Allow authenticated users to update files in 'documents' bucket
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'documents' );

-- Allow authenticated users to delete files in 'documents' bucket
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'documents' );
