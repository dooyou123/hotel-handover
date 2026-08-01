-- 오늘 첫 근무 인사(웰컴 화면) 확인 상태 — 이름+날짜 기준으로 DB에 저장
-- localStorage만 쓰면 PC 4대에서 기기마다 다시 뜨고, 같은 사람이 조만 바꿔도 또 뜬다.
-- 날짜가 바뀌면 date_key가 달라져 자연히 초기화된다.

create table if not exists public.daily_welcome_acks (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  date_key date not null,
  staff_name text not null,
  created_at timestamptz not null default now(),
  primary key (hotel_id, date_key, staff_name)
);

alter table public.daily_welcome_acks enable row level security;

drop policy if exists "daily_welcome_acks_all" on public.daily_welcome_acks;
create policy "daily_welcome_acks_all" on public.daily_welcome_acks
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
