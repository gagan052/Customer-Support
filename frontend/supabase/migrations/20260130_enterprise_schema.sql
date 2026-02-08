-- 1. Create Companies (Tenants) Table
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create User Roles Enum
do $$ begin
    create type user_role as enum ('owner', 'admin', 'employee');
exception
    when duplicate_object then null;
end $$;

-- 3. Link Users to Companies and Roles
-- We'll add columns to existing user_profiles if it exists.
alter table user_profiles 
  add column if not exists company_id uuid references companies(id),
  add column if not exists role user_role default 'employee';

-- 4. API Keys Table
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  key_hash text not null, -- Store hashed key
  key_prefix text not null, -- Store first few chars for display
  scope text[] default '{chat:use}', -- permissions
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- 5. Add company_id to Knowledge Documents
alter table knowledge_documents 
  add column if not exists company_id uuid references companies(id);

-- 6. Add company_id to Document Chunks (for Supabase Vector Store)
alter table document_chunks 
  add column if not exists company_id uuid references companies(id);

-- 7. Add company_id to Conversations
alter table conversations 
  add column if not exists company_id uuid references companies(id);

-- 8. Update match_documents function to support company_id filtering
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_company_id uuid default null
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
  and (filter_company_id is null or document_chunks.company_id = filter_company_id)
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 9. RLS Policies (Crucial for Multi-tenancy)

-- Companies: Users can only see their own company
alter table companies enable row level security;

create policy "Users can view their own company"
  on companies for select
  to authenticated
  using (
    id in (select company_id from user_profiles where user_id = auth.uid())
  );

-- Knowledge Documents: Scoped by company
-- Drop existing policies first to avoid conflicts or lax security
drop policy if exists "Allow read access for authenticated users" on knowledge_documents;
drop policy if exists "Allow write access for authenticated users" on knowledge_documents;
drop policy if exists "Anyone can view knowledge documents" on knowledge_documents;
drop policy if exists "Authenticated users can manage knowledge documents" on knowledge_documents;

create policy "Users can view company documents"
  on knowledge_documents for select
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
  );

create policy "Admins/Owners can manage company documents"
  on knowledge_documents for all
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
    and (select role from user_profiles where user_id = auth.uid()) in ('admin', 'owner')
  );

-- Document Chunks: Scoped by company
drop policy if exists "Allow read access for chunks" on document_chunks;
drop policy if exists "Allow write access for chunks" on document_chunks;

create policy "Users can view company chunks"
  on document_chunks for select
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
  );

create policy "Admins/Owners can manage company chunks"
  on document_chunks for all
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
    and (select role from user_profiles where user_id = auth.uid()) in ('admin', 'owner')
  );

-- API Keys: Scoped by company
alter table api_keys enable row level security;

create policy "Admins/Owners can view api keys"
  on api_keys for select
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
    and (select role from user_profiles where user_id = auth.uid()) in ('admin', 'owner')
  );

create policy "Admins/Owners can manage api keys"
  on api_keys for all
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
    and (select role from user_profiles where user_id = auth.uid()) in ('admin', 'owner')
  );

-- Conversations: Update policies
drop policy if exists "Users can view their own conversations" on conversations;

create policy "Company members can view company conversations"
  on conversations for select
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
  );

-- 11. Audit Logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  user_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb,
  created_at timestamptz default now() not null
);

alter table audit_logs enable row level security;

create policy "Users can view their company audit logs"
  on audit_logs for select
  to authenticated
  using (
    company_id in (select company_id from user_profiles where user_id = auth.uid())
  );
