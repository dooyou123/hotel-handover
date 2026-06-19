-- 일반 직원: 본인 작성(author) 카드 삭제 — 공용 계정·레거시(created_by null) 포함

create or replace function public.card_author_matches_staff_name(p_author text, p_staff_name text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(trim(p_staff_name), '') <> ''
    and coalesce(trim(p_author), '') <> ''
    and (
      trim(p_author) = trim(p_staff_name)
      or trim(p_author) like '%' || trim(p_staff_name)
      or trim(p_author) like '% · ' || trim(p_staff_name)
    );
$$;

create or replace function public.delete_card_by_staff(p_card_id uuid, p_staff_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_staff_name text := trim(coalesce(p_staff_name, ''));
begin
  select * into v_card
  from public.cards
  where id = p_card_id
    and hotel_id = public.user_hotel_id();

  if not found then
    raise exception '카드를 찾을 수 없습니다.';
  end if;

  if public.user_is_manager() then
    delete from public.cards where id = p_card_id;
    return;
  end if;

  if v_staff_name = '' then
    raise exception '근무 정보(담당자)를 선택해 주세요.';
  end if;

  if not public.card_author_matches_staff_name(v_card.author, v_staff_name) then
    raise exception '권한이 없습니다.';
  end if;

  if v_card.created_by is null or v_card.created_by = auth.uid() then
    delete from public.cards where id = p_card_id;
    return;
  end if;

  raise exception '권한이 없습니다.';
end;
$$;

revoke all on function public.delete_card_by_staff(uuid, text) from public;
grant execute on function public.delete_card_by_staff(uuid, text) to authenticated;

drop policy if exists "cards_delete" on public.cards;
create policy "cards_delete" on public.cards
  for delete to authenticated
  using (
    hotel_id = public.user_hotel_id()
    and (
      public.user_is_manager()
      or created_by = auth.uid()
    )
  );
