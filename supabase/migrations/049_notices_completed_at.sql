-- 업무 게시판 항목 완료 처리
alter table public.notices
  add column if not exists completed_at timestamptz;

create index if not exists idx_notices_completed
  on public.notices (hotel_id, completed_at);
