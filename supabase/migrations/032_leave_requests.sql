-- 휴무 신청: 정책(hotels) · 차단일 · 신청 내역

alter table public.hotels
  add column if not exists leave_max_days_per_month integer not null default 4
    check (leave_max_days_per_month >= 1 and leave_max_days_per_month <= 31);

alter table public.hotels
  add column if not exists leave_max_staff_per_day integer not null default 2
    check (leave_max_staff_per_day >= 1 and leave_max_staff_per_day <= 20);

alter table public.hotels
  add column if not exists leave_apply_month_offset integer not null default 1
    check (leave_apply_month_offset >= 0 and leave_apply_month_offset <= 6);

alter table public.hotels
  add column if not exists leave_application_open_day integer not null default 1
    check (leave_application_open_day >= 1 and leave_application_open_day <= 28);

alter table public.hotels
  add column if not exists leave_application_close_day integer not null default 20
    check (leave_application_close_day >= 1 and leave_application_close_day <= 31);

create table if not exists public.leave_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  block_month smallint not null check (block_month between 1 and 12),
  block_day smallint not null check (block_day between 1 and 31),
  label text not null,
  created_at timestamptz not null default now(),
  unique (hotel_id, block_month, block_day)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  staff_name text not null,
  work_group text not null default '',
  leave_date date not null,
  status text not null default 'approved'
    check (status in ('approved', 'pending_review', 'rejected', 'cancelled')),
  is_exception boolean not null default false,
  reason text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hotel_id, staff_name, leave_date)
);

create index if not exists idx_leave_requests_hotel_month on public.leave_requests (hotel_id, leave_date);
create index if not exists idx_leave_requests_status on public.leave_requests (hotel_id, status);

alter table public.leave_blocked_dates enable row level security;
alter table public.leave_requests enable row level security;

create policy "leave_blocked_dates_select" on public.leave_blocked_dates
  for select to authenticated using (hotel_id = public.user_hotel_id());

create policy "leave_blocked_dates_manager" on public.leave_blocked_dates
  for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

create policy "leave_requests_select" on public.leave_requests
  for select to authenticated using (hotel_id = public.user_hotel_id());

create policy "leave_requests_insert" on public.leave_requests
  for insert to authenticated with check (hotel_id = public.user_hotel_id());

create policy "leave_requests_update" on public.leave_requests
  for update to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

alter publication supabase_realtime add table public.leave_requests;

-- 기본 차단일 (연말·연시·크리스마스)
insert into public.leave_blocked_dates (hotel_id, block_month, block_day, label)
values
  ('00000000-0000-4000-8000-000000000001', 12, 24, '크리스마스 이브'),
  ('00000000-0000-4000-8000-000000000001', 12, 25, '크리스마스'),
  ('00000000-0000-4000-8000-000000000001', 12, 31, '연말'),
  ('00000000-0000-4000-8000-000000000001', 1, 1, '신정')
on conflict (hotel_id, block_month, block_day) do nothing;
