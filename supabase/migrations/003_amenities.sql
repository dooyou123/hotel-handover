-- Amenity inventory (hotel-scoped)
-- Run via Supabase SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.amenities (
  id serial primary key,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  box_size int not null,
  unit_size int not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (hotel_id, name)
);

create index if not exists idx_amenities_hotel on public.amenities (hotel_id, sort_order);

create table if not exists public.amenity_inventory (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  amenity_id int not null references public.amenities (id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (hotel_id, amenity_id)
);

create table if not exists public.amenity_transactions (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null check (type in ('입고', '출고')),
  amenity_id int not null references public.amenities (id),
  box_count int not null check (box_count > 0),
  total_items int not null check (total_items > 0),
  author text not null default '미입력',
  memo text not null default ''
);

create index if not exists idx_amenity_tx_hotel_created
  on public.amenity_transactions (hotel_id, created_at desc);
create index if not exists idx_amenity_tx_amenity
  on public.amenity_transactions (amenity_id);

-- ---------------------------------------------------------------------------
-- Trigger: update inventory on transaction insert
-- ---------------------------------------------------------------------------
create or replace function public.apply_amenity_transaction_to_inventory()
returns trigger
language plpgsql
as $$
declare
  current_qty int;
begin
  select quantity into current_qty
  from public.amenity_inventory
  where hotel_id = new.hotel_id and amenity_id = new.amenity_id
  for update;

  if not found then
    insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
    values (new.hotel_id, new.amenity_id, 0);
    current_qty := 0;
  end if;

  if new.type = '출고' and current_qty < new.total_items then
    raise exception '재고가 부족합니다. (현재: %, 요청: %)', current_qty, new.total_items;
  end if;

  if new.type = '입고' then
    update public.amenity_inventory
    set quantity = quantity + new.total_items,
        updated_at = now()
    where hotel_id = new.hotel_id and amenity_id = new.amenity_id;
  else
    update public.amenity_inventory
    set quantity = quantity - new.total_items,
        updated_at = now()
    where hotel_id = new.hotel_id and amenity_id = new.amenity_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_amenity_transaction on public.amenity_transactions;
create trigger trg_apply_amenity_transaction
  after insert on public.amenity_transactions
  for each row
  execute function public.apply_amenity_transaction_to_inventory();

-- ---------------------------------------------------------------------------
-- RPC: add transaction atomically
-- ---------------------------------------------------------------------------
create or replace function public.add_amenity_transaction(
  p_hotel_id uuid,
  p_type text,
  p_amenity_id int,
  p_box_count int,
  p_author text default '미입력',
  p_memo text default ''
)
returns public.amenity_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_size int;
  v_total_items int;
  v_result public.amenity_transactions;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  if p_type not in ('입고', '출고') then
    raise exception '유효하지 않은 거래 유형입니다: %', p_type;
  end if;

  select unit_size into v_unit_size
  from public.amenities
  where id = p_amenity_id and hotel_id = p_hotel_id;

  if not found then
    raise exception '어메니티를 찾을 수 없습니다.';
  end if;

  v_total_items := p_box_count * v_unit_size;

  insert into public.amenity_transactions (
    hotel_id, type, amenity_id, box_count, total_items, author, memo
  )
  values (
    p_hotel_id,
    p_type,
    p_amenity_id,
    p_box_count,
    v_total_items,
    coalesce(nullif(trim(p_author), ''), '미입력'),
    coalesce(p_memo, '')
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.add_amenity_transaction to authenticated;

-- ---------------------------------------------------------------------------
-- Seed default hotel amenities
-- ---------------------------------------------------------------------------
insert into public.amenities (hotel_id, name, box_size, unit_size, sort_order) values
  ('00000000-0000-4000-8000-000000000001', '덴탈키트', 250, 25, 1),
  ('00000000-0000-4000-8000-000000000001', '면도기', 500, 25, 2),
  ('00000000-0000-4000-8000-000000000001', '빗', 500, 25, 3),
  ('00000000-0000-4000-8000-000000000001', '입욕제(라벤더)', 500, 50, 4),
  ('00000000-0000-4000-8000-000000000001', '입욕제(자스민)', 500, 50, 5),
  ('00000000-0000-4000-8000-000000000001', '설탕', 1000, 100, 6),
  ('00000000-0000-4000-8000-000000000001', '샤워캡', 1000, 100, 7),
  ('00000000-0000-4000-8000-000000000001', '헤어밴드', 2000, 100, 8),
  ('00000000-0000-4000-8000-000000000001', '티(잉글리시)', 1200, 100, 9),
  ('00000000-0000-4000-8000-000000000001', '티(얼그레이)', 1200, 100, 10),
  ('00000000-0000-4000-8000-000000000001', '티(카모마일)', 1200, 100, 11),
  ('00000000-0000-4000-8000-000000000001', '커피스틱', 1000, 1000, 12),
  ('00000000-0000-4000-8000-000000000001', '마스크팩', 400, 80, 13),
  ('00000000-0000-4000-8000-000000000001', '종이컵(대)', 1200, 100, 14),
  ('00000000-0000-4000-8000-000000000001', '종이컵(소)', 1200, 100, 15)
on conflict (hotel_id, name) do nothing;

insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
select a.hotel_id, a.id, 0
from public.amenities a
where a.hotel_id = '00000000-0000-4000-8000-000000000001'
on conflict (hotel_id, amenity_id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.amenities enable row level security;
alter table public.amenity_inventory enable row level security;
alter table public.amenity_transactions enable row level security;

create policy "amenities_select" on public.amenities
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "amenity_inventory_select" on public.amenity_inventory
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "amenity_transactions_select" on public.amenity_transactions
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "amenity_transactions_insert" on public.amenity_transactions
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.amenity_inventory;
alter publication supabase_realtime add table public.amenity_transactions;
