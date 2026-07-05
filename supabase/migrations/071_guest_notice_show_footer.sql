-- 안내문별 하단 문구 표시 여부 (로고는 호텔 공통 설정)

alter table public.guest_notices
  add column if not exists show_footer boolean not null default true;
