-- 휴무 신청 기능 제거

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leave_requests'
  ) then
    alter publication supabase_realtime drop table public.leave_requests;
  end if;
end $$;

drop table if exists public.leave_requests cascade;
drop table if exists public.leave_blocked_dates cascade;

alter table public.hotels
  drop column if exists leave_max_days_per_month,
  drop column if exists leave_max_staff_per_day,
  drop column if exists leave_apply_month_offset,
  drop column if exists leave_application_open_day,
  drop column if exists leave_application_close_day;
