-- 연말 회식: 투표 결과 공개 시각 (null = 비밀 투표 / 비공개)

alter table public.party_settings
  add column if not exists results_published_at timestamptz;
