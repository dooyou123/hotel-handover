-- SOP · 지식베이스 기능 제거

drop table if exists public.sop_articles cascade;

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
