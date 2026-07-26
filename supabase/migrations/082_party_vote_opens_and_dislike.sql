-- 연말 회식: 장소 '가기 싫어요' + 투표 시작 시각

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_preference_check;

alter table public.party_venue_votes
  add constraint party_venue_votes_preference_check
  check (preference in ('love', 'ok', 'no'));

alter table public.party_settings
  add column if not exists vote_opens_at timestamptz;
