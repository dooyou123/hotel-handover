-- 완료 카드 자동 보관 기본값: 1일(약 24시간)
alter table public.hotels
  alter column auto_archive_done_days set default 1;

update public.hotels
set auto_archive_done_days = 1
where auto_archive_done_days = 0;
