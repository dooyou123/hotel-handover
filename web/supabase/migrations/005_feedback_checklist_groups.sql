-- 기능개선/버그 신고 + 체크리스트 A/B/C 조 + 공통 항목

-- 체크리스트 항목: common(전 조 공통) 또는 A/B/C 조 전용
alter table public.checklist_items
  add column if not exists work_group text not null default 'common'
  check (work_group in ('common', 'A', 'B', 'C'));

-- 완료 기록: 조(A/B/C)별로 분리
alter table public.checklist_completions
  add column if not exists work_group text not null default 'A'
  check (work_group in ('A', 'B', 'C'));

alter table public.checklist_completions
  drop constraint if exists checklist_completions_item_id_work_date_shift_key;

alter table public.checklist_completions
  drop constraint if exists checklist_completions_unique;

alter table public.checklist_completions
  add constraint checklist_completions_unique
  unique (item_id, work_date, shift, work_group);

-- 사용자 피드백 (관리자 확인)
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  reporter_user_id uuid references auth.users (id) on delete set null,
  reporter_shift text not null default '',
  reporter_group text not null default '',
  reporter_name text not null default '',
  category text not null check (category in ('bug', 'feature', 'other')),
  page_path text not null default '',
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_feedback_hotel_created
  on public.user_feedback (hotel_id, created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_select" on public.user_feedback;
create policy "user_feedback_select" on public.user_feedback
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

drop policy if exists "user_feedback_insert" on public.user_feedback;
create policy "user_feedback_insert" on public.user_feedback
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "user_feedback_update" on public.user_feedback;
create policy "user_feedback_update" on public.user_feedback
  for update to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

do $$
begin
  alter publication supabase_realtime add table public.user_feedback;
exception
  when duplicate_object then null;
end $$;
