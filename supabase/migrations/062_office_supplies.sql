-- 사무용품 신청 (오피스타운 유통)

create table public.office_supply_catalog (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  product_code text not null,
  product_name text not null,
  image_url text not null default '',
  unit text not null default '개',
  category_id text not null default '',
  goods_id text not null default '',
  order_count integer not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hotel_id, product_code)
);

create index office_supply_catalog_hotel_count_idx
  on public.office_supply_catalog (hotel_id, order_count desc);

create table public.office_supply_batches (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  batch_key text not null,
  order_date date not null,
  status text not null default 'open'
    check (status in ('open', 'submitted')),
  submitted_at timestamptz,
  submitted_by text not null default '',
  created_at timestamptz not null default now(),
  unique (hotel_id, batch_key)
);

create index office_supply_batches_hotel_date_idx
  on public.office_supply_batches (hotel_id, order_date desc);

create table public.office_supply_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  batch_id uuid not null references public.office_supply_batches (id) on delete cascade,
  product_code text not null,
  product_name text not null,
  image_url text not null default '',
  unit text not null default '개',
  quantity integer not null check (quantity > 0),
  note text not null default '',
  requested_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index office_supply_requests_batch_idx
  on public.office_supply_requests (batch_id, created_at desc);

create trigger office_supply_requests_set_updated_at
  before update on public.office_supply_requests
  for each row execute function public.set_updated_at();

alter table public.office_supply_catalog enable row level security;
alter table public.office_supply_batches enable row level security;
alter table public.office_supply_requests enable row level security;

create policy "office_supply_catalog_all" on public.office_supply_catalog
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "office_supply_batches_all" on public.office_supply_batches
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "office_supply_requests_all" on public.office_supply_requests
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.office_supply_requests;
exception
  when duplicate_object then null;
end $$;
