-- 연말 회식: 직원별 투표 비밀번호 (해시만 저장, 클라이언트 RLS 없음 → 서비스 롤만)

create table if not exists public.party_voter_pins (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  voter_name text not null,
  pin_hash text not null,
  updated_at timestamptz not null default now(),
  primary key (hotel_id, voter_name)
);

alter table public.party_voter_pins enable row level security;
