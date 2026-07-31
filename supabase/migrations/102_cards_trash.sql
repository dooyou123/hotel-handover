-- 삭제 휴지통 — 카드 삭제를 소프트 삭제로 바꾸고, 30일 지나면 자동 정리
-- 공용 계정 환경에서 "누가 지웠는지" 기록이 남고, 실수 삭제를 복원할 수 있다.

alter table public.cards
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

create index if not exists cards_deleted_at_idx
  on public.cards (hotel_id, deleted_at desc)
  where deleted_at is not null;

-- 기존 하드 삭제 RPC를 소프트 삭제로 교체 (권한 검사 로직은 059와 동일)
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
    update public.cards
    set deleted_at = now(), deleted_by = nullif(v_staff_name, '')
    where id = p_card_id;
    return;
  end if;

  if v_staff_name = '' then
    raise exception '근무 정보(담당자)를 선택해 주세요.';
  end if;

  if not public.card_author_matches_staff_name(v_card.author, v_staff_name) then
    raise exception '권한이 없습니다.';
  end if;

  if v_card.created_by is null or v_card.created_by = auth.uid() then
    update public.cards
    set deleted_at = now(), deleted_by = v_staff_name
    where id = p_card_id;
    return;
  end if;

  raise exception '권한이 없습니다.';
end;
$$;

-- 30일 지난 휴지통 항목을 완전히 삭제 — 휴지통을 열 때마다 클라이언트가 호출한다
create or replace function public.purge_expired_card_trash()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.cards
  where hotel_id = public.user_hotel_id()
    and deleted_at is not null
    and deleted_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_card_trash() from public;
grant execute on function public.purge_expired_card_trash() to authenticated;
