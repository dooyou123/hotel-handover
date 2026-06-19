-- 물건 픽업: 예약번호·체크인일, 인도 대기(ready) 단계 제거

alter table public.parcels
  add column if not exists reservation_number text not null default '',
  add column if not exists check_in_date date;

update public.parcels
set status = 'stored'
where status = 'ready';

create index if not exists parcels_hotel_reservation_idx
  on public.parcels (hotel_id, reservation_number)
  where reservation_number <> '';
