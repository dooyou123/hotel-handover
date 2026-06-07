-- hotel-handover Supabase schema (initial)
-- Run via: supabase db push (after supabase link)

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Hotels (single tenant for now; multi-hotel ready)
-- ---------------------------------------------------------------------------
create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Default hotel — replace UUID in seed or use this fixed id in env
insert into public.hotels (id, name)
values ('00000000-0000-4000-8000-000000000001', '프런트 인수인계')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'staff' check (role in ('staff', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_hotel on public.profiles (hotel_id);

-- ---------------------------------------------------------------------------
-- Staff directory (desk names for session bar — not auth users)
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (hotel_id, name)
);

-- ---------------------------------------------------------------------------
-- Cards
-- ---------------------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  column_id text not null default 'urgent' check (column_id in ('urgent', 'progress', 'done')),
  priority text not null default 'urgent' check (priority in ('urgent', 'today', 'info')),
  category text not null default '기타',
  room text not null default '',
  title text not null,
  details text not null default '',
  resolution text not null default '',
  next_action text not null default '',
  author text not null default '',
  assignee_shift text not null default '',
  assignee_name text not null default '',
  due_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cards_hotel_column on public.cards (hotel_id, column_id, sort_order);
create index idx_cards_due_at on public.cards (due_at) where due_at is not null;

create table public.card_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  shift text not null,
  staff_name text not null,
  acknowledged_at timestamptz not null default now()
);

create index idx_card_acks_card on public.card_acknowledgments (card_id);

create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  shift text not null,
  staff_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notices
-- ---------------------------------------------------------------------------
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  type text not null check (type in ('announcement', 'change')),
  content text not null,
  author text not null default '',
  is_pinned boolean not null default false,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shift handovers
-- ---------------------------------------------------------------------------
create table public.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  shift text not null,
  staff_name text not null,
  handover_type text not null default 'start' check (handover_type in ('start', 'end')),
  work_date date not null default current_date,
  unacked_urgent integer not null default 0,
  urgent_count integer not null default 0,
  progress_count integer not null default 0,
  today_count integer not null default 0,
  checklist_incomplete integer not null default 0,
  progress_remaining integer not null default 0,
  notes text not null default '',
  handover_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity logs
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  legacy_entity_id integer,
  action text not null,
  shift text not null default '',
  staff_name text not null default '',
  summary text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_hotel_created on public.activity_logs (hotel_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------
create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  work_date date not null,
  shift text not null,
  staff_name text not null,
  created_at timestamptz not null default now(),
  unique (hotel_id, work_date, shift, staff_name)
);

create index idx_schedule_work_date on public.schedule_entries (hotel_id, work_date);

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  name text not null,
  department text not null default '기타',
  phone text not null,
  phone_alt text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.checklist_items (id) on delete cascade,
  work_date date not null,
  shift text not null,
  staff_name text not null,
  completed_at timestamptz not null default now(),
  unique (item_id, work_date, shift)
);

-- ---------------------------------------------------------------------------
-- Card templates
-- ---------------------------------------------------------------------------
create table public.card_templates (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  legacy_id integer,
  label text not null,
  priority text not null default 'today',
  column_id text not null default 'progress',
  category text not null default '기타',
  title text not null default '',
  next_action text not null default '',
  details text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_hotel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hotel_id from public.profiles where id = auth.uid()
$$;

create or replace function public.user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'manager' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Auto profile on signup (Magic Link first login)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, hotel_id, display_name, role)
  values (
    new.id,
    '00000000-0000-4000-8000-000000000001',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger for cards
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.hotels enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.cards enable row level security;
alter table public.card_acknowledgments enable row level security;
alter table public.card_comments enable row level security;
alter table public.card_attachments enable row level security;
alter table public.notices enable row level security;
alter table public.shift_handovers enable row level security;
alter table public.activity_logs enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.contacts enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_completions enable row level security;
alter table public.card_templates enable row level security;

-- Profiles: own row
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid());

-- Generic hotel-scoped read/write for staff
create policy "hotel_select" on public.staff for select to authenticated
  using (hotel_id = public.user_hotel_id());
create policy "hotel_manage_staff" on public.staff for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

-- Cards: all authenticated hotel members
create policy "cards_select" on public.cards for select to authenticated
  using (hotel_id = public.user_hotel_id());
create policy "cards_insert" on public.cards for insert to authenticated
  with check (hotel_id = public.user_hotel_id());
create policy "cards_update" on public.cards for update to authenticated
  using (hotel_id = public.user_hotel_id());
create policy "cards_delete" on public.cards for delete to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager());

-- Child tables via card ownership
create policy "card_acks_all" on public.card_acknowledgments for all to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()))
  with check (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()));

create policy "card_comments_all" on public.card_comments for all to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()))
  with check (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()));

create policy "card_attachments_all" on public.card_attachments for all to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()))
  with check (exists (select 1 from public.cards c where c.id = card_id and c.hotel_id = public.user_hotel_id()));

-- Notices, contacts, checklist, templates, schedule, shift, activity — same pattern
create policy "notices_all" on public.notices for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "contacts_all" on public.contacts for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "checklist_items_select" on public.checklist_items for select to authenticated
  using (hotel_id = public.user_hotel_id());
create policy "checklist_items_manage" on public.checklist_items for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

create policy "checklist_completions_all" on public.checklist_completions for all to authenticated
  using (exists (
    select 1 from public.checklist_items i
    where i.id = item_id and i.hotel_id = public.user_hotel_id()
  ))
  with check (exists (
    select 1 from public.checklist_items i
    where i.id = item_id and i.hotel_id = public.user_hotel_id()
  ));

create policy "card_templates_select" on public.card_templates for select to authenticated
  using (hotel_id = public.user_hotel_id() and is_active = true);
create policy "card_templates_manage" on public.card_templates for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

create policy "schedule_all" on public.schedule_entries for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "shift_all" on public.shift_handovers for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "activity_select" on public.activity_logs for select to authenticated
  using (hotel_id = public.user_hotel_id());
create policy "activity_insert" on public.activity_logs for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.card_acknowledgments;
alter publication supabase_realtime add table public.card_comments;
alter publication supabase_realtime add table public.notices;
alter publication supabase_realtime add table public.checklist_completions;

-- ---------------------------------------------------------------------------
-- Storage bucket (create in Dashboard or via API)
-- bucket: card-attachments, public: false
-- policy: authenticated users in hotel can read/write their hotel paths
-- ---------------------------------------------------------------------------
