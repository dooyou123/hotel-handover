-- 완료 보관 자동화, 어멐니티 최소 재고

alter table public.hotels
  add column if not exists auto_archive_done_days integer not null default 0
    check (auto_archive_done_days >= 0 and auto_archive_done_days <= 365);

alter table public.amenity_inventory
  add column if not exists min_quantity integer not null default 0
    check (min_quantity >= 0);

create or replace function public.auto_archive_done_cards(p_hotel_id uuid, p_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if p_days is null or p_days <= 0 then
    return 0;
  end if;

  update public.cards
  set archived_at = now(),
      updated_at = now()
  where hotel_id = p_hotel_id
    and column_id = 'done'
    and archived_at is null
    and coalesce(updated_at, created_at) < now() - make_interval(days => p_days);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.auto_archive_done_cards(uuid, integer) to authenticated;
