-- Amenity transactions: direct quantity (개수) instead of box_count × unit_size

drop function if exists public.add_amenity_transaction(uuid, text, int, int, text, text);
drop function if exists public.update_amenity_transaction(uuid, uuid, text, int, int, text, text);

create or replace function public.add_amenity_transaction(
  p_hotel_id uuid,
  p_type text,
  p_amenity_id int,
  p_quantity int,
  p_author text default '미입력',
  p_memo text default ''
)
returns public.amenity_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.amenity_transactions;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  if p_type not in ('입고', '출고') then
    raise exception '유효하지 않은 거래 유형입니다: %', p_type;
  end if;

  if p_quantity < 1 then
    raise exception '수량은 1 이상이어야 합니다.';
  end if;

  if not exists (
    select 1 from public.amenities
    where id = p_amenity_id and hotel_id = p_hotel_id
  ) then
    raise exception '어메니티를 찾을 수 없습니다.';
  end if;

  insert into public.amenity_transactions (
    hotel_id, type, amenity_id, box_count, total_items, author, memo
  )
  values (
    p_hotel_id,
    p_type,
    p_amenity_id,
    p_quantity,
    p_quantity,
    coalesce(nullif(trim(p_author), ''), '미입력'),
    coalesce(p_memo, '')
  )
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.update_amenity_transaction(
  p_hotel_id uuid,
  p_transaction_id uuid,
  p_type text,
  p_amenity_id int,
  p_quantity int,
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
  v_result public.amenity_transactions;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  if p_type not in ('입고', '출고') then
    raise exception '유효하지 않은 거래 유형입니다: %', p_type;
  end if;

  if p_quantity < 1 then
    raise exception '수량은 1 이상이어야 합니다.';
  end if;

  select * into v_old
  from public.amenity_transactions
  where id = p_transaction_id and hotel_id = p_hotel_id
  for update;

  if not found then
    raise exception '거래 내역을 찾을 수 없습니다.';
  end if;

  if not exists (
    select 1 from public.amenities
    where id = p_amenity_id and hotel_id = p_hotel_id
  ) then
    raise exception '어메니티를 찾을 수 없습니다.';
  end if;

  perform public.apply_amenity_inventory_delta(
    p_hotel_id, v_old.amenity_id, v_old.type, v_old.total_items, true
  );

  begin
    perform public.apply_amenity_inventory_delta(
      p_hotel_id, p_amenity_id, p_type, p_quantity, false
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
    box_count = p_quantity,
    total_items = p_quantity,
    author = coalesce(nullif(trim(p_author), ''), '미입력'),
    memo = coalesce(p_memo, '')
  where id = p_transaction_id and hotel_id = p_hotel_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.add_amenity_transaction(uuid, text, int, int, text, text) to authenticated;
grant execute on function public.update_amenity_transaction(uuid, uuid, text, int, int, text, text) to authenticated;
