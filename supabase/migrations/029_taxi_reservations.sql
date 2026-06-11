-- 택시 예약 관리 (Firebase 앱 이전): transport_bookings 확장

alter table public.transport_bookings
  add column if not exists vehicle_type text not null default '일반',
  add column if not exists baggage_count integer not null default 0,
  add column if not exists price text not null default '',
  add column if not exists vehicle_number text not null default '',
  add column if not exists created_by text not null default '',
  add column if not exists updated_by text not null default '';

alter table public.transport_bookings
  drop constraint if exists transport_bookings_vehicle_type_check;

alter table public.transport_bookings
  add constraint transport_bookings_vehicle_type_check
  check (vehicle_type in ('일반', '점보'));

alter table public.transport_bookings
  drop constraint if exists transport_bookings_baggage_count_check;

alter table public.transport_bookings
  add constraint transport_bookings_baggage_count_check
  check (baggage_count >= 0);

-- 기존 author → created_by 백필
update public.transport_bookings
set created_by = author
where created_by = '' and author <> '';

-- status: done → completed (Firebase 앱 용어)
update public.transport_bookings
set status = 'completed'
where status = 'done';

alter table public.transport_bookings
  drop constraint if exists transport_bookings_status_check;

alter table public.transport_bookings
  add constraint transport_bookings_status_check
  check (status in ('pending', 'completed', 'cancelled'));

-- 택시 예약 기본값
update public.transport_bookings
set booking_type = 'taxi'
where booking_type is distinct from 'taxi';

alter table public.hotels
  add column if not exists taxi_whatsapp_recipient text not null default '';

comment on column public.hotels.taxi_whatsapp_recipient is
  '택시 예약 WhatsApp 수신 번호 (국가코드 포함, 예: 821012345678)';
