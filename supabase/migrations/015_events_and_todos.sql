-- 호텔 일정(이벤트) + 할일 관리

create table public.hotel_events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  description text not null default '',
  event_date date not null,
  start_time time,
  end_time time,
  category text not null default '기타',
  author text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hotel_events_date on public.hotel_events (hotel_id, event_date);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'low')),
  status text not null default 'open' check (status in ('open', 'done')),
  assignee_name text not null default '',
  assignee_shift text not null default '',
  author text not null default '',
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_todos_open on public.todos (hotel_id, status, due_date);

create trigger hotel_events_updated_at before update on public.hotel_events
  for each row execute function public.set_updated_at();

create trigger todos_updated_at before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.hotel_events enable row level security;
alter table public.todos enable row level security;

create policy "hotel_events_all" on public.hotel_events for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "todos_all" on public.todos for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

alter publication supabase_realtime add table public.hotel_events;
alter publication supabase_realtime add table public.todos;
