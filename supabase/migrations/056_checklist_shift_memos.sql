-- 체크리스트 수기 메모 (교대·조·일별)

create table public.checklist_shift_memos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  work_date date not null,
  shift text not null,
  work_group text not null,
  memo text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, work_date, shift, work_group)
);

create index checklist_shift_memos_hotel_date_idx
  on public.checklist_shift_memos (hotel_id, work_date desc, work_group);

create trigger checklist_shift_memos_set_updated_at
  before update on public.checklist_shift_memos
  for each row execute function public.set_updated_at();

alter table public.checklist_shift_memos enable row level security;

create policy "checklist_shift_memos_all" on public.checklist_shift_memos
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
