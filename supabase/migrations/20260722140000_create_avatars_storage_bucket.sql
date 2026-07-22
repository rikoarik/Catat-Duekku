-- 1. Create the 'avatars' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Storage RLS Policies for 'avatars' bucket
-- Public read access for avatar images
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Authenticated users can upload avatar images into their own folder (folder name = user_id)
drop policy if exists "Authenticated users can upload avatar image" on storage.objects;
create policy "Authenticated users can upload avatar image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Authenticated users can update/replace avatar image in their own folder
drop policy if exists "Authenticated users can update their avatar image" on storage.objects;
create policy "Authenticated users can update their avatar image"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' and
    (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' and
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Authenticated users can delete avatar image in their own folder
drop policy if exists "Authenticated users can delete their avatar image" on storage.objects;
create policy "Authenticated users can delete their avatar image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' and
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. Add avatar_url column to public.profiles if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text;
  end if;
end $$;
