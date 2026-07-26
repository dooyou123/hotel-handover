-- 근처 맛집·교통 퀵가이드 (손님 응대용 짧은 안내)

create table if not exists public.local_guides (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  kind text not null default 'transit'
    check (kind in ('transit', 'food', 'convenience', 'other')),
  body_ko text not null default '',
  body_en text not null default '',
  body_zh text not null default '',
  body_ja text not null default '',
  is_active boolean not null default true,
  author text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists local_guides_hotel_kind_idx
  on public.local_guides (hotel_id, kind, sort_order, title);

drop trigger if exists local_guides_set_updated_at on public.local_guides;
create trigger local_guides_set_updated_at
  before update on public.local_guides
  for each row execute function public.set_updated_at();

alter table public.local_guides enable row level security;

drop policy if exists "local_guides_all" on public.local_guides;
create policy "local_guides_all" on public.local_guides
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
