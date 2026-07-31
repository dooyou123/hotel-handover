-- 이름별 개인 메모장: 아직 카드로 만들 정도는 아니지만 잊으면 안 되는 것들
-- 공용 계정 환경이라 staff_name 기준으로 1인 1메모장 (PC·모바일 어디서든 동일)

create table if not exists public.staff_memo_pads (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  staff_name text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (hotel_id, staff_name)
);

drop trigger if exists staff_memo_pads_set_updated_at on public.staff_memo_pads;
create trigger staff_memo_pads_set_updated_at
  before update on public.staff_memo_pads
  for each row execute function public.set_updated_at();

alter table public.staff_memo_pads enable row level security;

drop policy if exists "staff_memo_pads_all" on public.staff_memo_pads;
create policy "staff_memo_pads_all" on public.staff_memo_pads
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
