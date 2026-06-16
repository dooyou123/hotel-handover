-- 인수인계 카드 작성자(로그인 계정) 추적 — 일반 직원 본인 작성분 삭제 허용

alter table public.cards
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists idx_cards_created_by on public.cards (created_by);

create or replace function public.set_card_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists cards_set_created_by on public.cards;
create trigger cards_set_created_by
  before insert on public.cards
  for each row execute function public.set_card_created_by();

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
