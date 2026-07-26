-- 스케줄 게시 이미지 (근무표와 별개): 호텔당 1장 + 스토리지

create table if not exists public.schedule_board_images (
  hotel_id uuid primary key references public.hotels (id) on delete cascade,
  storage_path text not null,
  filename text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.schedule_board_images enable row level security;

drop policy if exists "schedule_board_images_select" on public.schedule_board_images;
create policy "schedule_board_images_select" on public.schedule_board_images
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_images_insert" on public.schedule_board_images;
create policy "schedule_board_images_insert" on public.schedule_board_images
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_images_update" on public.schedule_board_images;
create policy "schedule_board_images_update" on public.schedule_board_images
  for update to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_images_delete" on public.schedule_board_images;
create policy "schedule_board_images_delete" on public.schedule_board_images
  for delete to authenticated
  using (hotel_id = public.user_hotel_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'schedule-board',
  'schedule-board',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "schedule_board_select" on storage.objects;
drop policy if exists "schedule_board_insert" on storage.objects;
drop policy if exists "schedule_board_update" on storage.objects;
drop policy if exists "schedule_board_delete" on storage.objects;

create policy "schedule_board_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

create policy "schedule_board_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

create policy "schedule_board_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

create policy "schedule_board_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);
