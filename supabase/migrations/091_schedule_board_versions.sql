-- 스케줄 게시 이미지: 버전 이력 + 버전별 직원 확인(읽음) 추적

-- ---------------------------------------------------------------------------
-- 현재 포인터 테이블에 표시용 컬럼 추가
-- ---------------------------------------------------------------------------
alter table public.schedule_board_images
  add column if not exists updated_by_label text not null default '';

alter table public.schedule_board_images
  add column if not exists current_version integer not null default 1;

alter table public.schedule_board_images
  add column if not exists note text not null default '';

-- ---------------------------------------------------------------------------
-- 버전 이력 (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_board_versions (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  month_key text not null,
  version integer not null,
  storage_path text not null,
  filename text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_by_label text not null default '',
  constraint schedule_board_versions_month_key_check
    check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  unique (hotel_id, month_key, version)
);

create index if not exists schedule_board_versions_month_idx
  on public.schedule_board_versions (hotel_id, month_key, version desc);

alter table public.schedule_board_versions enable row level security;

drop policy if exists "schedule_board_versions_select" on public.schedule_board_versions;
create policy "schedule_board_versions_select" on public.schedule_board_versions
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_versions_insert" on public.schedule_board_versions;
create policy "schedule_board_versions_insert" on public.schedule_board_versions
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "schedule_board_versions_delete" on public.schedule_board_versions;
create policy "schedule_board_versions_delete" on public.schedule_board_versions
  for delete to authenticated
  using (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- 버전별 직원 확인(읽음) — notice_reads 패턴 (근무 세션 조·이름 기준)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_board_reads (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  version_id uuid not null references public.schedule_board_versions (id) on delete cascade,
  month_key text not null,
  staff_name text not null,
  shift text not null default '',
  read_at timestamptz not null default now(),
  unique (version_id, staff_name)
);

create index if not exists schedule_board_reads_version_idx
  on public.schedule_board_reads (version_id);
create index if not exists schedule_board_reads_hotel_idx
  on public.schedule_board_reads (hotel_id);

alter table public.schedule_board_reads enable row level security;

drop policy if exists "schedule_board_reads_all" on public.schedule_board_reads;
create policy "schedule_board_reads_all" on public.schedule_board_reads
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- 기존 현재 이미지를 버전 1로 백필
-- ---------------------------------------------------------------------------
insert into public.schedule_board_versions (
  hotel_id, month_key, version, storage_path, filename, note, created_at, created_by, created_by_label
)
select
  i.hotel_id, i.month_key, 1, i.storage_path, i.filename, '', i.updated_at, i.updated_by, ''
from public.schedule_board_images i
where not exists (
  select 1 from public.schedule_board_versions v
  where v.hotel_id = i.hotel_id and v.month_key = i.month_key
);
