-- 물건 픽업 장부: 방향·체크아웃일, 택배사/운송장 제거

alter table public.parcels
  add column if not exists direction text not null default 'out_to_room'
    check (direction in ('out_to_room', 'room_to_out')),
  add column if not exists checkout_date date;

alter table public.parcels drop column if exists carrier;
alter table public.parcels drop column if exists tracking_number;

create index if not exists parcels_hotel_direction_idx
  on public.parcels (hotel_id, direction, status, received_at desc);
