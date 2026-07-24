-- 객실료 컨펌 게스트: 허용 메일 + 일회용 OTP

alter table public.hotels
  add column if not exists rate_confirm_guest_emails jsonb not null default '[]'::jsonb;

alter table public.hotels
  drop constraint if exists hotels_rate_confirm_guest_emails_is_array;

alter table public.hotels
  add constraint hotels_rate_confirm_guest_emails_is_array
  check (jsonb_typeof(rate_confirm_guest_emails) = 'array');

create table if not exists public.rate_confirm_guest_otps (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rate_confirm_guest_otps_lookup_idx
  on public.rate_confirm_guest_otps (hotel_id, email, expires_at desc);

alter table public.rate_confirm_guest_otps enable row level security;
-- service role only: no policies for authenticated/anon
