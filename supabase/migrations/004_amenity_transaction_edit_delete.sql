-- Amenity transaction edit / delete (inventory-safe RPCs)
-- Run in Supabase SQL Editor after 003_amenities.sql

create or replace function public.apply_amenity_inventory_delta(
  p_hotel_id uuid,
  p_amenity_id int,
  p_type text,
  p_total_items int,
  p_reverse boolean default false
)
returns void
language plpgsql
as $$
declare
  current_qty int;
  delta int;
begin
  if p_type = '입고' then
    delta := p_total_items;
  elsif p_type = '출고' then
    delta := -p_total_items;
  else
    raise exception '유효하지 않은 거래 유형입니다: %', p_type;
  end if;

  if p_reverse then
    delta := -delta;
  end if;

  select quantity into current_qty
  from public.amenity_inventory
  where hotel_id = p_hotel_id and amenity_id = p_amenity_id
  for update;

  if not found then
    insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
    values (p_hotel_id, p_amenity_id, 0);
    current_qty := 0;
  end if;

  if current_qty + delta < 0 then
    raise exception '재고가 부족합니다. (현재: %, 요청: %)', current_qty, abs(delta);
  end if;

  update public.amenity_inventory
  set quantity = quantity + delta,
      updated_at = now()
  where hotel_id = p_hotel_id and amenity_id = p_amenity_id;
end;
$$;

create or replace function public.delete_amenity_transaction(
  p_hotel_id uuid,
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.amenity_transactions;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  select * into v_tx
  from public.amenity_transactions
  where id = p_transaction_id and hotel_id = p_hotel_id
  for update;

  if not found then
    raise exception '거래 내역을 찾을 수 없습니다.';
  end if;

  perform public.apply_amenity_inventory_delta(
    p_hotel_id, v_tx.amenity_id, v_tx.type, v_tx.total_items, true
  );

  delete from public.amenity_transactions
  where id = p_transaction_id and hotel_id = p_hotel_id;
end;
$$;

create or replace function public.update_amenity_transaction(
  p_hotel_id uuid,
  p_transaction_id uuid,
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
  v_old public.amenity_transactions;
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

  if p_box_count < 1 then
    raise exception '박스 수는 1 이상이어야 합니다.';
  end if;

  select * into v_old
  from public.amenity_transactions
  where id = p_transaction_id and hotel_id = p_hotel_id
  for update;

  if not found then
    raise exception '거래 내역을 찾을 수 없습니다.';
  end if;

  select unit_size into v_unit_size
  from public.amenities
  where id = p_amenity_id and hotel_id = p_hotel_id;

  if not found then
    raise exception '어메니티를 찾을 수 없습니다.';
  end if;

  v_total_items := p_box_count * v_unit_size;

  perform public.apply_amenity_inventory_delta(
    p_hotel_id, v_old.amenity_id, v_old.type, v_old.total_items, true
  );

  begin
    perform public.apply_amenity_inventory_delta(
      p_hotel_id, p_amenity_id, p_type, v_total_items, false
    );
  exception
    when others then
      perform public.apply_amenity_inventory_delta(
        p_hotel_id, v_old.amenity_id, v_old.type, v_old.total_items, false
      );
      raise;
  end;

  update public.amenity_transactions
  set
    type = p_type,
    amenity_id = p_amenity_id,
    box_count = p_box_count,
    total_items = v_total_items,
    author = coalesce(nullif(trim(p_author), ''), '미입력'),
    memo = coalesce(p_memo, '')
  where id = p_transaction_id and hotel_id = p_hotel_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.delete_amenity_transaction(uuid, uuid) to authenticated;
grant execute on function public.update_amenity_transaction(uuid, uuid, text, int, int, text, text) to authenticated;
