-- 픽업/택시, 시설 SLA, 리뷰 객실조치, 조별 루틴 템플릿

create table public.transport_bookings (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  booking_date date not null,
  pickup_time time not null,
  booking_type text not null default 'taxi'
    check (booking_type in ('taxi', 'pickup', 'airport', 'other')),
  room_number text not null default '',
  guest_name text not null default '',
  destination text not null default '',
  passengers integer not null default 1 check (passengers > 0),
  contact_phone text not null default '',
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'done', 'cancelled')),
  author text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transport_bookings_hotel_date_idx
  on public.transport_bookings (hotel_id, booking_date, pickup_time);

create trigger transport_bookings_set_updated_at
  before update on public.transport_bookings
  for each row execute function public.set_updated_at();

alter table public.guest_reviews
  add column if not exists room_number text not null default '',
  add column if not exists room_action_completed_at timestamptz,
  add column if not exists room_action_completed_by text not null default '';

alter table public.cards
  add column if not exists first_response_at timestamptz;

alter table public.card_templates
  add column if not exists work_group text not null default '';

alter table public.transport_bookings enable row level security;

create policy "transport_bookings_all" on public.transport_bookings
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.transport_bookings;
exception
  when duplicate_object then null;
end $$;

insert into public.card_templates (
  hotel_id, label, priority, column_id, category, title, next_action, details, sort_order, work_group
)
select
  '00000000-0000-4000-8000-000000000001',
  v.label, v.priority, 'progress', v.category, v.title, v.next_action, v.details, v.sort_order, v.work_group
from (values
  ('A조 오전 인수', 'today', '기타', 'A조 오전 근무 인수', '전 교대 인수사항·미완료 긴급 확인', '07:00~16:00 오전 근무', 10, 'A'),
  ('A조 VIP 도착', 'today', '시설', 'VIP 도착 점검', '얼리 체크인·어메니티·HK 선정비 확인', '', 11, 'A'),
  ('A조 HK 전달', 'today', '기타', 'HK 오전 전달 확인', 'EB 변경·특이 객실·DELIVERY 전달란 확인', '', 12, 'A'),
  ('B조 오후 인수', 'today', '기타', 'B조 오후 근무 인수', '오전 미완료·당일 체크인 단체 확인', '13:00~22:00 오후 근무', 20, 'B'),
  ('B조 픽업/택시', 'today', '기타', '픽업·택시 예약 점검', '당일 예약 목록 확인·차량 도착 연락', '', 21, 'B'),
  ('B조 컴플레인', 'urgent', '컴플레인', '컴플레인 접수·1차 응답', '30분 내 1차 응답·객실 조치 요청', '', 22, 'B'),
  ('C조 야간 인수', 'today', '기타', 'C조 야간 근무 인수', '오후 미완료·야간 투숙객 특이사항', '22:00~07:00 야간 근무', 30, 'C'),
  ('C조 HK 퇴근 후', 'today', '기타', 'HK 퇴근 후 DELIVERY', '퇴근 후 객실 배달·전달 사항 확인', '', 31, 'C'),
  ('C조 시설 점검', 'today', '시설', '야간 시설 이슈', '소음·냉난방·누수 등 야간 발생 건 기록', '', 32, 'C')
) as v(label, priority, category, title, next_action, details, sort_order, work_group)
where not exists (
  select 1 from public.card_templates t
  where t.hotel_id = '00000000-0000-4000-8000-000000000001'
    and t.work_group = v.work_group
    and t.label = v.label
);
