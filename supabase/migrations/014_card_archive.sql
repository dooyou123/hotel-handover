-- 완료 칸 비우기 → 삭제 대신 보관(archived_at 설정)
alter table public.cards
  add column if not exists archived_at timestamptz;

comment on column public.cards.archived_at is '완료 보관 시각. null이면 보드에 표시.';

create index if not exists idx_cards_archived
  on public.cards (hotel_id, archived_at desc)
  where archived_at is not null;
