-- 연말 회식: '절대 가기 싫어요' 거부 표 (rank = -1, 1인 1곳)

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_rank_check;

alter table public.party_venue_votes
  add constraint party_venue_votes_rank_check
  check (rank in (1, 2, 3, -1));
