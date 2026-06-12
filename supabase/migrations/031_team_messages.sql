-- 프런트 팀 채팅 (호텔 단위)

create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  staff_name text not null,
  work_group text not null default '',
  content text not null,
  is_alert boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_team_messages_hotel_created on public.team_messages (hotel_id, created_at desc);

alter table public.team_messages enable row level security;

create policy "team_messages_all" on public.team_messages for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

alter publication supabase_realtime add table public.team_messages;
