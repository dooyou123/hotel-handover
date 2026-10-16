-- 물품 발주 장부: 카탈로그 + 발주 묶음 + 라인 (재고 연동 없음, 추적만)

create table if not exists public.procurement_items (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  category text not null
    check (category in (
      'medicine', 'office', 'amenity', 'retail', 'event', 'marketing', 'other'
    )),
  name text not null,
  unit text not null default '개',
  note text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index procurement_items_hotel_active_idx
  on public.procurement_items (hotel_id, active, category, sort_order, name);

create unique index procurement_items_hotel_category_name_active_uidx
  on public.procurement_items (hotel_id, category, lower(name))
  where active;

create trigger procurement_items_set_updated_at
  before update on public.procurement_items
  for each row execute function public.set_updated_at();

create table if not exists public.procurement_orders (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null default '',
  vendor text not null default '',
  note text not null default '',
  status text not null default 'ordered'
    check (status in ('ordered', 'partial', 'received', 'cancelled')),
  ordered_at date not null default (timezone('Asia/Seoul', now()))::date,
  ordered_by text not null default '',
  cancelled_at timestamptz,
  cancelled_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index procurement_orders_hotel_status_idx
  on public.procurement_orders (hotel_id, status, ordered_at desc);

create trigger procurement_orders_set_updated_at
  before update on public.procurement_orders
  for each row execute function public.set_updated_at();

create table if not exists public.procurement_order_lines (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  order_id uuid not null references public.procurement_orders (id) on delete cascade,
  item_id uuid references public.procurement_items (id) on delete set null,
  category text not null
    check (category in (
      'medicine', 'office', 'amenity', 'retail', 'event', 'marketing', 'other'
    )),
  item_name text not null,
  unit text not null default '개',
  quantity integer not null check (quantity > 0),
  received_qty integer,
  note text not null default '',
  received_at date,
  received_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (received_qty is null or received_qty >= 0)
);

create index procurement_order_lines_order_idx
  on public.procurement_order_lines (order_id, created_at);

create index procurement_order_lines_hotel_idx
  on public.procurement_order_lines (hotel_id, received_at);

create trigger procurement_order_lines_set_updated_at
  before update on public.procurement_order_lines
  for each row execute function public.set_updated_at();

-- 라인 입고 상태에에 따라 묶음 상태 자동 갱신
create or replace function public.refresh_procurement_order_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total int;
  v_received int;
begin
  select status into v_status from public.procurement_orders where id = p_order_id;
  if v_status is null or v_status = 'cancelled' then
    return;
  end if;

  select count(*), count(*) filter (where received_at is not null)
    into v_total, v_received
  from public.procurement_order_lines
  where order_id = p_order_id;

  if v_total = 0 then
    update public.procurement_orders set status = 'ordered' where id = p_order_id;
  elsif v_received = 0 then
    update public.procurement_orders set status = 'ordered' where id = p_order_id;
  elsif v_received >= v_total then
    update public.procurement_orders set status = 'received' where id = p_order_id;
  else
    update public.procurement_orders set status = 'partial' where id = p_order_id;
  end if;
end;
$$;

create or replace function public.procurement_order_lines_refresh_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_procurement_order_status(
    coalesce(new.order_id, old.order_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists procurement_order_lines_refresh_status on public.procurement_order_lines;
create trigger procurement_order_lines_refresh_status
  after insert or update of received_at or delete
  on public.procurement_order_lines
  for each row execute function public.procurement_order_lines_refresh_status();

alter table public.procurement_items enable row level security;
alter table public.procurement_orders enable row level security;
alter table public.procurement_order_lines enable row level security;

-- 카탈로그: 전원 조회, 관리자만 쓰기
drop policy if exists "procurement_items_select" on public.procurement_items;
create policy "procurement_items_select" on public.procurement_items
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

drop policy if exists "procurement_items_manage" on public.procurement_items;
create policy "procurement_items_manage" on public.procurement_items
  for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

-- 발주 묶음·라인: 호텔 전원 CRUD (추적)
drop policy if exists "procurement_orders_all" on public.procurement_orders;
create policy "procurement_orders_all" on public.procurement_orders
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "procurement_order_lines_all" on public.procurement_order_lines;
create policy "procurement_order_lines_all" on public.procurement_order_lines
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.procurement_orders;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.procurement_order_lines;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.procurement_items;
exception
  when duplicate_object then null;
end $$;
