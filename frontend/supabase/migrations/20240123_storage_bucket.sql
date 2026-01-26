
-- Create the 'documents' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- RLS Policies for Storage
-- Note: We need to enable RLS on storage.objects if it isn't already, but usually it is.
-- Policies for 'documents' bucket

-- Allow authenticated users to upload files to 'documents' bucket
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'documents' );

-- Allow authenticated users to view/download files in 'documents' bucket
create policy "Allow authenticated downloads"
on storage.objects for select
to authenticated
using ( bucket_id = 'documents' );

-- Allow authenticated users to update files in 'documents' bucket
create policy "Allow authenticated updates"
on storage.objects for update
to authenticated
using ( bucket_id = 'documents' );

-- Allow authenticated users to delete files in 'documents' bucket
create policy "Allow authenticated deletes"
on storage.objects for delete
to authenticated
using ( bucket_id = 'documents' );
