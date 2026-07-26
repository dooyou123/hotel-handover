-- 휴무 신청: 공유 입장 비밀번호 · 월별 신청창 · 차단일 · 개인 PIN · 신청 내역

create table if not exists public.day_off_settings (
  hotel_id uuid primary key references public.hotels (id) on delete cascade,
  access_pin_hash text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.day_off_windows (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  max_days_per_person integer not null default 4
    check (max_days_per_person >= 1 and max_days_per_person <= 31),
  max_people_per_day integer not null default 2
    check (max_people_per_day >= 1 and max_people_per_day <= 50),
  published boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (hotel_id, month_key),
  check (closes_at > opens_at)
);

create table if not exists public.day_off_blocked_dates (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  date date not null,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  label text not null default '',
  primary key (hotel_id, date)
);

create index if not exists idx_day_off_blocked_dates_month
  on public.day_off_blocked_dates (hotel_id, month_key);

create table if not exists public.day_off_voter_pins (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  employee_name text not null,
  pin_hash text not null,
  updated_at timestamptz not null default now(),
  primary key (hotel_id, employee_name)
);

create table if not exists public.day_off_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  employee_name text not null,
  date date not null,
  reason text not null default '',
  is_exception boolean not null default false,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'pending', 'approved', 'rejected')),
  admin_memo text not null default '',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, employee_name, date)
);

create index if not exists idx_day_off_requests_month
  on public.day_off_requests (hotel_id, month_key);

create index if not exists idx_day_off_requests_date
  on public.day_off_requests (hotel_id, date);

create index if not exists idx_day_off_requests_status
  on public.day_off_requests (hotel_id, status);

alter table public.day_off_settings enable row level security;
alter table public.day_off_windows enable row level security;
alter table public.day_off_blocked_dates enable row level security;
alter table public.day_off_voter_pins enable row level security;
alter table public.day_off_requests enable row level security;

-- settings / voter_pins: 정책 없음 → service role 전용

create policy "day_off_windows_select" on public.day_off_windows
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "day_off_blocked_dates_select" on public.day_off_blocked_dates
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "day_off_requests_select" on public.day_off_requests
  for select to authenticated
  using (hotel_id = public.user_hotel_id());
