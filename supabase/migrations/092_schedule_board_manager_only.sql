-- 스케줄 보드: 업로드/삭제는 매니저만, 확인(읽음)은 전원

-- schedule_board_images write policies
drop policy if exists "schedule_board_images_insert" on public.schedule_board_images;
create policy "schedule_board_images_insert" on public.schedule_board_images
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

drop policy if exists "schedule_board_images_update" on public.schedule_board_images;
create policy "schedule_board_images_update" on public.schedule_board_images
  for update to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

drop policy if exists "schedule_board_images_delete" on public.schedule_board_images;
create policy "schedule_board_images_delete" on public.schedule_board_images
  for delete to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager());

-- schedule_board_versions write policies
drop policy if exists "schedule_board_versions_insert" on public.schedule_board_versions;
create policy "schedule_board_versions_insert" on public.schedule_board_versions
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

drop policy if exists "schedule_board_versions_delete" on public.schedule_board_versions;
create policy "schedule_board_versions_delete" on public.schedule_board_versions
  for delete to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager());

-- storage: insert/update/delete manager-only (select stays hotel-scoped)
drop policy if exists "schedule_board_insert" on storage.objects;
create policy "schedule_board_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  and public.user_is_manager()
);

drop policy if exists "schedule_board_update" on storage.objects;
create policy "schedule_board_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  and public.user_is_manager()
);

drop policy if exists "schedule_board_delete" on storage.objects;
create policy "schedule_board_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'schedule-board'
  and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  and public.user_is_manager()
);
