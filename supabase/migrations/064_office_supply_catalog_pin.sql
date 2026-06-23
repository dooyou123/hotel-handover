-- 호텔 공통 즐겨찾기 (카탈로그 고정)

alter table public.office_supply_catalog
  add column if not exists is_pinned boolean not null default false;

create index if not exists office_supply_catalog_hotel_pinned_idx
  on public.office_supply_catalog (hotel_id, is_pinned desc, order_count desc);

do $$
begin
  alter publication supabase_realtime add table public.office_supply_catalog;
exception
  when duplicate_object then null;
end $$;
