-- 하우스키핑 리포트: H/U·Comp·VIP·O.O·장기숙박·정비 유의 등 전달란

alter table public.housekeeping_reports
  add column if not exists hk_house_use text not null default '',
  add column if not exists hk_comp text not null default '',
  add column if not exists hk_vip_prep text not null default '',
  add column if not exists hk_out_of_order text not null default '',
  add column if not exists hk_long_stay text not null default '',
  add column if not exists hk_maintenance_attention text not null default '',
  add column if not exists hk_maintenance_notes text not null default '';
