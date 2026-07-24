-- 연말 회식 투표 기한

alter table public.party_settings
  add column if not exists vote_deadline_at timestamptz;
