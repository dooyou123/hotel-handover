-- 개인 할 일 (직원 본인만 관리)

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  staff_name text not null,
  title text not null,
  description text not null default '',
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_tasks_staff on public.personal_tasks (hotel_id, staff_name, status);

create trigger personal_tasks_updated_at before update on public.personal_tasks
  for each row execute function public.set_updated_at();

alter table public.personal_tasks enable row level security;

create policy "personal_tasks_all" on public.personal_tasks
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

alter publication supabase_realtime add table public.personal_tasks;
