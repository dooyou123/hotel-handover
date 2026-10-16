-- 예상 입고일 + 부분 수량 입고에 맞춘 상태 갱신

alter table public.procurement_orders
  add column if not exists expected_receive_at date;

create index if not exists procurement_orders_expected_receive_idx
  on public.procurement_orders (hotel_id, expected_receive_at)
  where expected_receive_at is not null and status in ('ordered', 'partial');

create or replace function public.refresh_procurement_order_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total int;
  v_full int;
  v_any int;
begin
  select status into v_status from public.procurement_orders where id = p_order_id;
  if v_status is null or v_status = 'cancelled' then
    return;
  end if;

  select
    count(*),
    count(*) filter (
      where received_at is not null
        and coalesce(received_qty, quantity) >= quantity
    ),
    count(*) filter (
      where received_at is not null
        or coalesce(received_qty, 0) > 0
    )
  into v_total, v_full, v_any
  from public.procurement_order_lines
  where order_id = p_order_id;

  if v_total = 0 or v_any = 0 then
    update public.procurement_orders set status = 'ordered' where id = p_order_id;
  elsif v_full >= v_total then
    update public.procurement_orders set status = 'received' where id = p_order_id;
  else
    update public.procurement_orders set status = 'partial' where id = p_order_id;
  end if;
end;
$$;

drop trigger if exists procurement_order_lines_refresh_status on public.procurement_order_lines;
create trigger procurement_order_lines_refresh_status
  after insert or update of received_at, received_qty or delete
  on public.procurement_order_lines
  for each row execute function public.procurement_order_lines_refresh_status();
