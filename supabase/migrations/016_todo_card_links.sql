-- 할일 ↔ 인수인계 카드 연동
alter table public.todos
  add column if not exists linked_card_id uuid references public.cards (id) on delete set null;

alter table public.cards
  add column if not exists linked_todo_id uuid references public.todos (id) on delete set null;

create index if not exists idx_todos_linked_card on public.todos (linked_card_id) where linked_card_id is not null;
create index if not exists idx_cards_linked_todo on public.cards (linked_todo_id) where linked_todo_id is not null;
