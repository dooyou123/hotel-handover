-- 스케줄 보드: 새 버전 올리기는 호텔 소속 전원, 삭제는 매니저만

-- schedule_board_images: insert/update for all hotel members
drop policy if exists "schedule_board_images_insert" on public.schedule_board_images;
create policy "schedule_board_images_insert" on public.schedule_board_images
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_images_update" on public.schedule_board_images;
create policy "schedule_board_images_update" on public.schedule_board_images
  for update to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- schedule_board_versions: insert for all hotel members (delete stays manager-only)
drop policy if exists "schedule_board_versions_insert" on public.schedule_board_versions;
create policy "schedule_board_versions_insert" on public.schedule_board_versions
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

-- storage: insert/update for all hotel members (delete stays manager-only)
drop policy if exists "schedule_board_insert" on storage.objects;
create policy "schedule_board_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);

drop policy if exists "schedule_board_update" on storage.objects;
create policy "schedule_board_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
);
