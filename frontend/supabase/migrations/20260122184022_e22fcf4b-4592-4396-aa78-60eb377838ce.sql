-- Create conversation status enum
CREATE TYPE public.conversation_status AS ENUM ('active', 'resolved', 'escalated', 'pending');

-- Create sentiment enum
CREATE TYPE public.sentiment_type AS ENUM ('positive', 'neutral', 'negative');

-- Create table for user profiles (customer profiles)
CREATE TABLE public.user_profiles (
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
CREATE TABLE public.conversations (
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
CREATE TABLE public.messages (
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
CREATE TABLE public.knowledge_documents (
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

-- Create table for feedback/learning
CREATE TABLE public.agent_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  was_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for conversations (users see their own, agents see all)
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = conversations.user_profile_id 
    AND user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update conversations"
ON public.conversations FOR UPDATE
USING (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.user_profiles up ON c.user_profile_id = up.id
    WHERE c.id = messages.conversation_id 
    AND up.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert messages"
ON public.messages FOR INSERT
WITH CHECK (true);

-- RLS Policies for knowledge_documents (public read, authenticated write)
CREATE POLICY "Anyone can view knowledge documents"
ON public.knowledge_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage knowledge documents"
ON public.knowledge_documents FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for agent_feedback
CREATE POLICY "Users can view their own feedback"
ON public.agent_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.user_profiles up ON c.user_profile_id = up.id
    WHERE c.id = agent_feedback.conversation_id 
    AND up.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert feedback"
ON public.agent_feedback FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_documents_updated_at
BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;