-- 하우스키핑: H/K 퇴근 후 객실 DELIVERY 전달란

alter table public.housekeeping_reports
  add column if not exists hk_post_shift_delivery text not null default '';
