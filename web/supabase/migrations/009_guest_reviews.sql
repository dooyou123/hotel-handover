-- 고객 리뷰 보관 (좋은/나쁜 리뷰, 다국어 원문 + 한국어 번역)

create table public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  sentiment text not null check (sentiment in ('positive', 'negative')),
  content_original text not null default '',
  content_ko text not null,
  guest_name text not null default '',
  check_in_date date,
  check_out_date date,
  reservation_number text not null default '',
  author text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_reviews_hotel_sentiment_idx on public.guest_reviews (hotel_id, sentiment)
  where is_active = true;

create index guest_reviews_hotel_check_in_idx on public.guest_reviews (hotel_id, check_in_date desc nulls last)
  where is_active = true;

create trigger guest_reviews_set_updated_at
  before update on public.guest_reviews
  for each row execute function public.set_updated_at();

alter table public.guest_reviews enable row level security;

create policy "guest_reviews_all" on public.guest_reviews for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.guest_reviews;
exception
  when duplicate_object then null;
end $$;
