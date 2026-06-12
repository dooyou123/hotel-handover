-- 객실료 컨펌 대조 이력 · 건별 처리 기록

create table if not exists public.rate_confirm_sessions (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  author text not null default '',
  work_group text not null default '',
  tl_file_name text not null default '',
  pms_file_name text not null default '',
  summary jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_confirm_sessions_hotel_created_idx
  on public.rate_confirm_sessions (hotel_id, created_at desc);

create trigger rate_confirm_sessions_set_updated_at
  before update on public.rate_confirm_sessions
  for each row execute function public.set_updated_at();

alter table public.rate_confirm_sessions enable row level security;

drop policy if exists "rate_confirm_sessions_all" on public.rate_confirm_sessions;
create policy "rate_confirm_sessions_all" on public.rate_confirm_sessions
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create table if not exists public.rate_confirm_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.rate_confirm_sessions (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  ota text not null,
  guest_name text not null default '',
  error_codes text[] not null default '{}',
  record_snapshot jsonb not null default '{}'::jsonb,
  rate_delta numeric,
  pms_adjust numeric,
  resolution_status text not null default 'pending'
    check (resolution_status in ('pending', 'resolved', 'skipped')),
  resolution_action text not null default '',
  resolution_note text not null default '',
  resolved_by text not null default '',
  work_group text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, ota)
);

create index if not exists rate_confirm_items_session_idx
  on public.rate_confirm_items (session_id, resolution_status);

alter table public.rate_confirm_items enable row level security;

drop policy if exists "rate_confirm_items_all" on public.rate_confirm_items;
create policy "rate_confirm_items_all" on public.rate_confirm_items
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
