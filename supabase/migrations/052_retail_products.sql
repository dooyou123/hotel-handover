-- 판매상품 월별 재고 정산 (호텔별)

create table if not exists public.retail_products (
  id serial primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hotel_id, name)
);

create index if not exists idx_retail_products_hotel
  on public.retail_products (hotel_id, sort_order);

create table if not exists public.retail_periods (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  year_month date not null,
  status text not null default 'draft' check (status in ('draft', 'closed')),
  closed_at timestamptz,
  closed_by text not null default '',
  author text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, year_month)
);

create index if not exists idx_retail_periods_hotel_month
  on public.retail_periods (hotel_id, year_month desc);

create trigger retail_periods_set_updated_at
  before update on public.retail_periods
  for each row execute function public.set_updated_at();

create table if not exists public.retail_period_lines (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.retail_periods (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  product_id int not null references public.retail_products (id) on delete cascade,
  opening_qty int not null default 0 check (opening_qty >= 0),
  restock_qty int not null default 0 check (restock_qty >= 0),
  sales_qty int not null default 0 check (sales_qty >= 0),
  free_qty int not null default 0 check (free_qty >= 0),
  actual_qty int not null default 0 check (actual_qty >= 0),
  line_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, product_id)
);

create index if not exists idx_retail_period_lines_period
  on public.retail_period_lines (period_id, product_id);

create trigger retail_period_lines_set_updated_at
  before update on public.retail_period_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.retail_products enable row level security;
alter table public.retail_periods enable row level security;
alter table public.retail_period_lines enable row level security;

drop policy if exists "retail_products_all" on public.retail_products;
create policy "retail_products_all" on public.retail_products
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "retail_periods_all" on public.retail_periods;
create policy "retail_periods_all" on public.retail_periods
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "retail_period_lines_all" on public.retail_period_lines;
create policy "retail_period_lines_all" on public.retail_period_lines
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- RPC: 월 정산 조회·생성 (이월 = 전월 마감 실사)
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_retail_period(
  p_hotel_id uuid,
  p_year_month date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date;
  v_period_id uuid;
  v_prev_month date;
  v_prev_period_id uuid;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  v_month := date_trunc('month', p_year_month)::date;

  select id into v_period_id
  from public.retail_periods
  where hotel_id = p_hotel_id and year_month = v_month;

  if found then
    return v_period_id;
  end if;

  v_prev_month := (v_month - interval '1 month')::date;

  select id into v_prev_period_id
  from public.retail_periods
  where hotel_id = p_hotel_id
    and year_month = v_prev_month
    and status = 'closed';

  insert into public.retail_periods (hotel_id, year_month, status)
  values (p_hotel_id, v_month, 'draft')
  returning id into v_period_id;

  insert into public.retail_period_lines (
    period_id,
    hotel_id,
    product_id,
    opening_qty
  )
  select
    v_period_id,
    p_hotel_id,
    p.id,
    coalesce(prev.actual_qty, 0)
  from public.retail_products p
  left join lateral (
    select l.actual_qty
    from public.retail_period_lines l
    where l.period_id = v_prev_period_id
      and l.product_id = p.id
  ) prev on true
  where p.hotel_id = p_hotel_id
    and p.active = true
  order by p.sort_order, p.id;

  return v_period_id;
end;
$$;

grant execute on function public.get_or_create_retail_period(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: 월 정산 마감
-- ---------------------------------------------------------------------------
create or replace function public.close_retail_period(
  p_period_id uuid,
  p_closed_by text default ''
)
returns public.retail_periods
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.retail_periods;
begin
  select * into v_period
  from public.retail_periods
  where id = p_period_id
  for update;

  if not found then
    raise exception '정산 기간을 찾을 수 없습니다.';
  end if;

  if v_period.hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  if v_period.status = 'closed' then
    raise exception '이미 마감된 기간입니다.';
  end if;

  update public.retail_periods
  set status = 'closed',
      closed_at = now(),
      closed_by = coalesce(nullif(trim(p_closed_by), ''), closed_by)
  where id = p_period_id
  returning * into v_period;

  return v_period;
end;
$$;

grant execute on function public.close_retail_period(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: 판매상품 8종 (모든 호텔)
-- ---------------------------------------------------------------------------
insert into public.retail_products (hotel_id, name, sort_order)
select h.id, v.name, v.sort_order
from public.hotels h
cross join (
  values
    ('샴푸', 1),
    ('컨디셔너', 2),
    ('바디워시', 3),
    ('바디로션', 4),
    ('핸드워시', 5),
    ('디퓨져', 6),
    ('수건세트', 7),
    ('스티커사진', 8)
) as v(name, sort_order)
on conflict (hotel_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime (optional)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.retail_periods;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.retail_period_lines;
exception
  when duplicate_object then null;
end $$;
