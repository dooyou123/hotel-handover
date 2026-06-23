-- 오피스타운 크롤링 연동 상태 (레이아웃 변경 감지)

create table public.office_supply_crawl_health (
  hotel_id uuid primary key references public.hotels (id) on delete cascade,
  status text not null default 'unknown'
    check (status in ('healthy', 'degraded', 'broken', 'unknown')),
  parser_version integer not null default 1,
  layout_fingerprint text not null default '',
  previous_fingerprint text not null default '',
  fingerprint_changed boolean not null default false,
  probe_product_code text not null default '313890',
  probe_ok boolean not null default false,
  category_product_count integer not null default 0,
  issues text[] not null default '{}',
  checked_at timestamptz not null default now()
);

alter table public.office_supply_crawl_health enable row level security;

create policy "office_supply_crawl_health_select" on public.office_supply_crawl_health
  for select to authenticated
  using (hotel_id = public.user_hotel_id());
