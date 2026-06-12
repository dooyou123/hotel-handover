-- 할일 반복 확장: 매일, N주/N개월 간격

alter table public.todos
  drop constraint if exists todos_recurrence_kind_check;

alter table public.todos
  add constraint todos_recurrence_kind_check
    check (recurrence_kind in ('none', 'daily', 'weekly', 'monthly'));

alter table public.todos
  add column if not exists recurrence_interval integer not null default 1;

alter table public.todos
  drop constraint if exists todos_recurrence_interval_check;

alter table public.todos
  add constraint todos_recurrence_interval_check
    check (recurrence_interval >= 1 and recurrence_interval <= 52);
