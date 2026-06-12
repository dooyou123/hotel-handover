-- 인수인계 칸: 보류(hold) 추가

alter table public.cards drop constraint if exists cards_column_id_check;

alter table public.cards
  add constraint cards_column_id_check
  check (column_id in ('urgent', 'progress', 'hold', 'done'));
