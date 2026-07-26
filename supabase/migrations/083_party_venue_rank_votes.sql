-- 연말 회식: 장소 투표를 1·2·3순위제로 전환

alter table public.party_venue_votes
  add column if not exists rank smallint;

-- 기존 love/ok/no → 순위(대략 매핑). 가기 싫어요는 제외
update public.party_venue_votes
set rank = case preference
  when 'love' then 1
  when 'ok' then 2
  else null
end
where rank is null;

delete from public.party_venue_votes where rank is null;

-- 같은 사람이 동일 순위를 여러 장소에 둔 경우 한 건만 남김
delete from public.party_venue_votes v
using public.party_venue_votes older
where v.rank is not null
  and older.rank is not null
  and v.hotel_id = older.hotel_id
  and v.voter_name = older.voter_name
  and v.rank = older.rank
  and v.created_at > older.created_at;

alter table public.party_venue_votes
  alter column rank set not null;

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_preference_check;

alter table public.party_venue_votes
  drop column if exists preference;

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_hotel_id_venue_id_voter_name_key;

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_rank_check;

alter table public.party_venue_votes
  add constraint party_venue_votes_rank_check
  check (rank in (1, 2, 3));

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_voter_venue_key;

alter table public.party_venue_votes
  add constraint party_venue_votes_voter_venue_key
  unique (hotel_id, voter_name, venue_id);

alter table public.party_venue_votes
  drop constraint if exists party_venue_votes_voter_rank_key;

alter table public.party_venue_votes
  add constraint party_venue_votes_voter_rank_key
  unique (hotel_id, voter_name, rank);
