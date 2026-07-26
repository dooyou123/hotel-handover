-- 휴무 신청: 휴무(off) / 조 가능일(shift: A|B|C 중 1) 구분

alter table public.day_off_requests
  add column if not exists kind text not null default 'off';

alter table public.day_off_requests
  add column if not exists shift_group text;

alter table public.day_off_requests
  drop constraint if exists day_off_requests_kind_check;

alter table public.day_off_requests
  add constraint day_off_requests_kind_check
  check (kind in ('off', 'shift'));

alter table public.day_off_requests
  drop constraint if exists day_off_requests_shift_group_check;

alter table public.day_off_requests
  add constraint day_off_requests_shift_group_check
  check (
    (kind = 'off' and shift_group is null)
    or (kind = 'shift' and shift_group in ('A', 'B', 'C'))
  );

create index if not exists idx_day_off_requests_kind
  on public.day_off_requests (hotel_id, month_key, kind);
