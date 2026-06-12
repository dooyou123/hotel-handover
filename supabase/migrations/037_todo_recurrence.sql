-- 할일 반복 (매주 / 매월)

alter table public.todos
  add column if not exists recurrence_kind text not null default 'none'
    check (recurrence_kind in ('none', 'weekly', 'monthly')),
  add column if not exists recurrence_series_id uuid references public.todos (id) on delete set null,
  add column if not exists recurrence_ends_on date;

create index if not exists todos_recurrence_series_idx
  on public.todos (recurrence_series_id)
  where recurrence_series_id is not null;
