-- Storage bucket for card attachments (run in Supabase SQL Editor after 001)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-attachments',
  'card-attachments',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "card_attachments_select" on storage.objects;
drop policy if exists "card_attachments_insert" on storage.objects;
drop policy if exists "card_attachments_delete" on storage.objects;

create policy "card_attachments_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

create policy "card_attachments_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

create policy "card_attachments_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);
