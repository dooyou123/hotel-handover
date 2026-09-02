-- 스케줄: 연장 근무 · 연차 사용 내역 (월별)

create table if not exists public.schedule_overtime_records (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  staff_name text not null,
  work_date date not null,
  hours integer not null check (hours >= 1 and hours <= 24),
  reason text not null default '',
  approval_submitted boolean not null default false,
  approval_status text not null default 'none'
    check (approval_status in ('none', 'pending', 'approved', 'rejected')),
  recorded_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (approval_submitted = false and approval_status = 'none')
    or approval_submitted = true
  )
);

create index if not exists schedule_overtime_records_month_idx
  on public.schedule_overtime_records (hotel_id, month_key, work_date desc);

create table if not exists public.schedule_leave_records (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  staff_name text not null,
  work_date date not null,
  leave_type text not null check (leave_type in ('full', 'am', 'pm')),
  clock_in text not null default '',
  clock_out text not null default '',
  approval_submitted boolean not null default false,
  approval_status text not null default 'none'
    check (approval_status in ('none', 'pending', 'approved', 'rejected')),
  recorded_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (approval_submitted = false and approval_status = 'none')
    or approval_submitted = true
  )
);

create index if not exists schedule_leave_records_month_idx
  on public.schedule_leave_records (hotel_id, month_key, work_date desc);

create trigger schedule_overtime_records_set_updated_at
  before update on public.schedule_overtime_records
  for each row execute function public.set_updated_at();

create trigger schedule_leave_records_set_updated_at
  before update on public.schedule_leave_records
  for each row execute function public.set_updated_at();

alter table public.schedule_overtime_records enable row level security;
alter table public.schedule_leave_records enable row level security;

drop policy if exists "schedule_overtime_records_all" on public.schedule_overtime_records;
create policy "schedule_overtime_records_all" on public.schedule_overtime_records
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_leave_records_all" on public.schedule_leave_records;
create policy "schedule_leave_records_all" on public.schedule_leave_records
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
