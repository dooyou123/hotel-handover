-- 호텔 일정 완료 시각 (팀 업무 일정 완료 처리)
alter table public.hotel_events
  add column if not exists completed_at timestamptz;

create index if not exists idx_hotel_events_completed
  on public.hotel_events (hotel_id, event_date, completed_at);
