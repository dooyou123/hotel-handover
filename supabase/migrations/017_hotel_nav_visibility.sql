-- 사이드바 메뉴 표시/숨김 (관리자 설정)

alter table public.hotels
  add column if not exists hidden_nav_hrefs jsonb not null default '[]'::jsonb;

alter table public.hotels
  drop constraint if exists hotels_hidden_nav_hrefs_is_array;

alter table public.hotels
  add constraint hotels_hidden_nav_hrefs_is_array
  check (jsonb_typeof(hidden_nav_hrefs) = 'array');

drop policy if exists "hotels_select" on public.hotels;
create policy "hotels_select" on public.hotels
  for select to authenticated
  using (id = public.user_hotel_id());

drop policy if exists "hotels_update_manager" on public.hotels;
create policy "hotels_update_manager" on public.hotels
  for update to authenticated
  using (id = public.user_hotel_id() and public.user_is_manager())
  with check (id = public.user_hotel_id() and public.user_is_manager());

do $$
begin
  alter publication supabase_realtime add table public.hotels;
exception
  when duplicate_object then null;
end $$;
