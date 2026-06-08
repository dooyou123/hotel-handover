-- Link guest reviews to follow-up handover cards

alter table public.guest_reviews
  add column if not exists follow_up_card_id uuid references public.cards (id) on delete set null;

create index if not exists guest_reviews_follow_up_card_idx
  on public.guest_reviews (follow_up_card_id)
  where follow_up_card_id is not null;
