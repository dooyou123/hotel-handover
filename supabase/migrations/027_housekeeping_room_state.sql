-- 현재 객실 침대 구성(트윈/트리플) 영구 저장 + 일별 재실 상태

create table if not exists public.housekeeping_room_bed_state (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  room_number text not null,
  bed_type text not null default '' check (bed_type in ('', 'twin', 'triple')),
  updated_at timestamptz not null default now(),
  primary key (hotel_id, room_number)
);

create index if not exists housekeeping_room_bed_state_hotel_idx
  on public.housekeeping_room_bed_state (hotel_id);

alter table public.housekeeping_room_bed_state enable row level security;

create policy "housekeeping_room_bed_state_all" on public.housekeeping_room_bed_state
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create trigger housekeeping_room_bed_state_updated_at
  before update on public.housekeeping_room_bed_state
  for each row execute function public.set_updated_at();

alter table public.housekeeping_report_rooms
  add column if not exists guest_status text not null default ''
    check (guest_status in ('', 'checkout', 'stay', 'arrival', 'vacant'));

-- reset_hotel_data: room bed state 포함
create or replace function public.reset_hotel_data(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;
  if not public.user_is_manager() then
    raise exception '관리자만 실행할 수 있습니다.';
  end if;

  delete from public.housekeeping_report_rooms
  where report_id in (select id from public.housekeeping_reports where hotel_id = p_hotel_id);

  delete from public.housekeeping_reports where hotel_id = p_hotel_id;
  delete from public.housekeeping_room_bed_state where hotel_id = p_hotel_id;
  delete from public.amenity_transactions where hotel_id = p_hotel_id;
  delete from public.amenity_inventory where hotel_id = p_hotel_id;
  delete from public.amenities where hotel_id = p_hotel_id;
  delete from public.guest_reviews where hotel_id = p_hotel_id;
  delete from public.user_feedback where hotel_id = p_hotel_id;
  delete from public.todos where hotel_id = p_hotel_id;
  delete from public.hotel_events where hotel_id = p_hotel_id;
  delete from public.sop_articles where hotel_id = p_hotel_id;
  delete from public.transport_bookings where hotel_id = p_hotel_id;
  delete from public.cards where hotel_id = p_hotel_id;
  delete from public.notices where hotel_id = p_hotel_id;
  delete from public.activity_logs where hotel_id = p_hotel_id;
  delete from public.shift_handovers where hotel_id = p_hotel_id;
  delete from public.schedule_entries where hotel_id = p_hotel_id;
  delete from public.contacts where hotel_id = p_hotel_id;

  delete from public.checklist_completions
  where item_id in (select id from public.checklist_items where hotel_id = p_hotel_id);

  delete from public.checklist_items where hotel_id = p_hotel_id;
  delete from public.card_templates where hotel_id = p_hotel_id;
  delete from public.staff where hotel_id = p_hotel_id;
end;
$$;
