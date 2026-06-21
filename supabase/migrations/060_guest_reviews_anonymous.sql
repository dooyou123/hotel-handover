-- Google 등 고객명·예약·숙박일을 알 수 없는 익명 리뷰

alter table public.guest_reviews
  add column if not exists is_anonymous boolean not null default false;
