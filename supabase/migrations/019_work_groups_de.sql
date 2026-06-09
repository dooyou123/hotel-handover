-- checklist work_group: D, E 조 추가
alter table public.checklist_items
  drop constraint if exists checklist_items_work_group_check;

alter table public.checklist_items
  add constraint checklist_items_work_group_check
  check (work_group in ('common', 'A', 'B', 'C', 'D', 'E'));

alter table public.checklist_completions
  drop constraint if exists checklist_completions_work_group_check;

alter table public.checklist_completions
  add constraint checklist_completions_work_group_check
  check (work_group in ('A', 'B', 'C', 'D', 'E'));
