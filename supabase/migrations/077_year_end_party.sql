-- 연말 회식 조율 · 장소 투표

create table if not exists public.party_settings (
  hotel_id uuid primary key references public.hotels (id) on delete cascade,
  subsidy_per_person integer not null default 100000
    check (subsidy_per_person in (50000, 100000)),
  headcount_override integer,
  admin_password text not null default 'party2026',
  confirmed_venue_id uuid,
  confirmed_slot_id uuid,
  invitation_draft text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.party_employees (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  department text not null default '',
  title text not null default '',
  attending boolean not null default true,
  memo text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (hotel_id, name)
);

create index if not exists party_employees_hotel_sort_idx
  on public.party_employees (hotel_id, sort_order, name);

create table if not exists public.party_venues (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  category text not null default '한식',
  signature_menu text not null default '',
  price_per_person integer not null default 0,
  map_url text not null default '',
  address text not null default '',
  has_room boolean not null default false,
  has_parking boolean not null default false,
  rating numeric(2,1) not null default 0
    check (rating >= 0 and rating <= 5),
  features text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists party_venues_hotel_sort_idx
  on public.party_venues (hotel_id, sort_order, name);

alter table public.party_settings
  drop constraint if exists party_settings_confirmed_venue_id_fkey;
alter table public.party_settings
  add constraint party_settings_confirmed_venue_id_fkey
  foreign key (confirmed_venue_id) references public.party_venues (id) on delete set null;

create table if not exists public.party_venue_votes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  venue_id uuid not null references public.party_venues (id) on delete cascade,
  voter_name text not null,
  preference text not null check (preference in ('love', 'ok')),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (hotel_id, venue_id, voter_name)
);

create index if not exists party_venue_votes_venue_idx
  on public.party_venue_votes (venue_id);

create table if not exists public.party_date_slots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  slot_date date not null,
  slot_time text not null default '19:00',
  label text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists party_date_slots_hotel_date_idx
  on public.party_date_slots (hotel_id, slot_date, slot_time);

alter table public.party_settings
  drop constraint if exists party_settings_confirmed_slot_id_fkey;
alter table public.party_settings
  add constraint party_settings_confirmed_slot_id_fkey
  foreign key (confirmed_slot_id) references public.party_date_slots (id) on delete set null;

create table if not exists public.party_date_votes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  slot_id uuid not null references public.party_date_slots (id) on delete cascade,
  voter_name text not null,
  availability text not null check (availability in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now(),
  unique (hotel_id, slot_id, voter_name)
);

create table if not exists public.party_dietary (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  employee_name text not null,
  restricted_foods text not null default '',
  allergies text not null default '',
  drinks_alcohol boolean not null default true,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (hotel_id, employee_name)
);

alter table public.party_settings enable row level security;
alter table public.party_employees enable row level security;
alter table public.party_venues enable row level security;
alter table public.party_venue_votes enable row level security;
alter table public.party_date_slots enable row level security;
alter table public.party_date_votes enable row level security;
alter table public.party_dietary enable row level security;

create policy "party_settings_all" on public.party_settings
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_employees_all" on public.party_employees
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_venues_all" on public.party_venues
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_venue_votes_all" on public.party_venue_votes
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_date_slots_all" on public.party_date_slots
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_date_votes_all" on public.party_date_votes
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "party_dietary_all" on public.party_dietary
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.party_employees;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_venues;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_venue_votes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_date_slots;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_date_votes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_dietary;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.party_settings;
exception when duplicate_object then null;
end $$;

insert into public.party_settings (hotel_id)
values ('00000000-0000-4000-8000-000000000001')
on conflict (hotel_id) do nothing;
