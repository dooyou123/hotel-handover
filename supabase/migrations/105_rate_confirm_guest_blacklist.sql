-- 객실료 컨펌 고객 블랙리스트

create table if not exists public.rate_confirm_guest_blacklist (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  guest_name text not null,
  name_tokens text[] not null default '{}',
  reason text not null default '',
  history_note text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_by text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_confirm_guest_blacklist_hotel_active_idx
  on public.rate_confirm_guest_blacklist (hotel_id, active, created_at desc);

create trigger rate_confirm_guest_blacklist_set_updated_at
  before update on public.rate_confirm_guest_blacklist
  for each row execute function public.set_updated_at();

alter table public.rate_confirm_guest_blacklist enable row level security;

drop policy if exists "rate_confirm_guest_blacklist_all" on public.rate_confirm_guest_blacklist;
create policy "rate_confirm_guest_blacklist_all" on public.rate_confirm_guest_blacklist
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
