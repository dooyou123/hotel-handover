-- 객실료 컨펌 게스트 PIN (해시만 저장)

alter table public.hotels
  add column if not exists rate_confirm_guest_pin_hash text;

alter table public.hotels
  add column if not exists rate_confirm_guest_pin_updated_at timestamptz;
