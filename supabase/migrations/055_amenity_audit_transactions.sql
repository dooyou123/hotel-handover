-- 어메니티 실사(재고조정) 거래 유형

alter table public.amenity_transactions
  drop constraint if exists amenity_transactions_type_check;

alter table public.amenity_transactions
  add constraint amenity_transactions_type_check
  check (type in ('입고', '출고', '실사'));

alter table public.amenity_transactions
  add column if not exists audit_before int check (audit_before is null or audit_before >= 0),
  add column if not exists audit_after int check (audit_after is null or audit_after >= 0);

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

  if new.type = '실사' then
    if new.audit_after is null then
      raise exception '실사 거래에는 실사 수량이 필요합니다.';
    end if;
    update public.amenity_inventory
    set quantity = new.audit_after,
        updated_at = now()
    where hotel_id = new.hotel_id and amenity_id = new.amenity_id;
    return new;
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

create or replace function public.add_amenity_audit_transaction(
  p_hotel_id uuid,
  p_amenity_id int,
  p_actual_quantity int,
  p_author text default '미입력',
  p_memo text default ''
)
returns public.amenity_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before int;
  v_after int;
  v_diff int;
  v_result public.amenity_transactions;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  if p_actual_quantity < 0 then
    raise exception '실사 수량은 0 이상이어야 합니다.';
  end if;

  if not exists (
    select 1 from public.amenities
    where id = p_amenity_id and hotel_id = p_hotel_id
  ) then
    raise exception '어메니티를 찾을 수 없습니다.';
  end if;

  select quantity into v_before
  from public.amenity_inventory
  where hotel_id = p_hotel_id and amenity_id = p_amenity_id;

  if not found then
    v_before := 0;
  end if;

  v_after := p_actual_quantity;
  if v_before = v_after then
    raise exception '시스템 재고와 실사 수량이 같습니다.';
  end if;

  v_diff := abs(v_after - v_before);

  insert into public.amenity_transactions (
    hotel_id,
    type,
    amenity_id,
    box_count,
    total_items,
    author,
    memo,
    audit_before,
    audit_after
  )
  values (
    p_hotel_id,
    '실사',
    p_amenity_id,
    v_diff,
    v_diff,
    coalesce(nullif(trim(p_author), ''), '미입력'),
    coalesce(nullif(trim(p_memo), ''), format('재고조정 — 실사 %s개 (시스템 %s개)', v_after, v_before)),
    v_before,
    v_after
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.add_amenity_audit_transaction(uuid, int, int, text, text) to authenticated;

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

  if v_tx.type = '실사' then
    if v_tx.audit_before is null then
      raise exception '실사 거래 복구 정보가 없습니다.';
    end if;
    update public.amenity_inventory
    set quantity = v_tx.audit_before,
        updated_at = now()
    where hotel_id = p_hotel_id and amenity_id = v_tx.amenity_id;
  else
    perform public.apply_amenity_inventory_delta(
      p_hotel_id, v_tx.amenity_id, v_tx.type, v_tx.total_items, true
    );
  end if;

  delete from public.amenity_transactions
  where id = p_transaction_id and hotel_id = p_hotel_id;
end;
$$;
