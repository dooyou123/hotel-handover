-- Housekeeping report: daily room assignments and notes for HK team printout.

create table public.housekeeping_reports (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  work_date date not null,
  twin_assignee text not null default '',
  triple_assignee text not null default '',
  extra_assignee text not null default '',
  previous_day_notes text not null default '',
  next_day_notes text not null default '',
  author text not null default '',
  staff_name text not null default '',
  shift text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, work_date)
);

create table public.housekeeping_report_rooms (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.housekeeping_reports (id) on delete cascade,
  room_number text not null default '',
  room_type text not null default '' check (room_type in ('', 'twin', 'triple', 'other')),
  guest_status text not null default '' check (guest_status in ('', 'checkout', 'stay', 'arrival', 'vacant')),
  bedding text not null default '',
  previous_notes text not null default '',
  next_day_notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index housekeeping_reports_hotel_date_idx
  on public.housekeeping_reports (hotel_id, work_date desc);

create index housekeeping_report_rooms_report_idx
  on public.housekeeping_report_rooms (report_id, sort_order);

create trigger housekeeping_reports_updated_at
  before update on public.housekeeping_reports
  for each row execute function public.set_updated_at();

alter table public.housekeeping_reports enable row level security;
alter table public.housekeeping_report_rooms enable row level security;

create policy "housekeeping_reports_all" on public.housekeeping_reports
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "housekeeping_report_rooms_all" on public.housekeeping_report_rooms
  for all to authenticated
  using (exists (
    select 1 from public.housekeeping_reports r
    where r.id = report_id and r.hotel_id = public.user_hotel_id()
  ))
  with check (exists (
    select 1 from public.housekeeping_reports r
    where r.id = report_id and r.hotel_id = public.user_hotel_id()
  ));
