-- 인수인계 카드 마감 알림 스누즈 (2시간 등)

alter table public.cards
  add column if not exists snoozed_until timestamptz;

create index if not exists idx_cards_snoozed_until
  on public.cards (snoozed_until)
  where snoozed_until is not null;
