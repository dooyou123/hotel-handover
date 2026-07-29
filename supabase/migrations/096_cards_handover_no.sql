-- 인수인계 기억용 영구 번호
-- 기존 카드는 생성 순서대로 번호를 받고, 삭제된 번호는 시퀀스 특성상 재사용되지 않는다.

create sequence if not exists public.cards_handover_no_seq
  as bigint
  start with 1
  increment by 1
  no cycle;

alter table public.cards
  add column if not exists handover_no bigint;

-- 재실행에도 안전하도록 기존 번호 다음부터, 아직 번호가 없는 카드만 생성 순서로 채운다.
with base as (
  select coalesce(max(handover_no), 0) as max_no
  from public.cards
),
numbered as (
  select
    id,
    (select max_no from base) + row_number() over (order by created_at asc, id asc) as handover_no
  from public.cards
  where handover_no is null
)
update public.cards as cards
set handover_no = numbered.handover_no
from numbered
where cards.id = numbered.id;

select setval(
  'public.cards_handover_no_seq',
  greatest(
    coalesce((select max(handover_no) from public.cards), 0),
    (select last_value from public.cards_handover_no_seq),
    1
  ),
  (select is_called from public.cards_handover_no_seq)
    or exists (select 1 from public.cards)
);

alter table public.cards
  alter column handover_no set default nextval('public.cards_handover_no_seq'),
  alter column handover_no set not null;

alter sequence public.cards_handover_no_seq
  owned by public.cards.handover_no;

grant usage, select on sequence public.cards_handover_no_seq
  to authenticated, service_role;

create unique index if not exists idx_cards_handover_no
  on public.cards (handover_no);

comment on column public.cards.handover_no is
  '직원이 #번호로 참조하는 영구 인수인계 번호. 삭제 후 재사용하지 않음.';
