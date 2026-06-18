-- 호텔 일정: 단일일(event_date) + 기간 종료일(end_date)

alter table public.hotel_events
  add column if not exists end_date date;

alter table public.hotel_events
  add constraint hotel_events_end_date_check
  check (end_date is null or end_date >= event_date);

create index if not exists idx_hotel_events_range
  on public.hotel_events (hotel_id, event_date, end_date);
