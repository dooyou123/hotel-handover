-- 객실료 컨펌 게스트 메일(Resend) 설정 — service role만 접근

create table if not exists public.rate_confirm_mail_settings (
  hotel_id uuid primary key references public.hotels (id) on delete cascade,
  resend_api_key text,
  resend_from_email text,
  updated_at timestamptz not null default now()
);

alter table public.rate_confirm_mail_settings enable row level security;
-- service role only: no policies for authenticated/anon
