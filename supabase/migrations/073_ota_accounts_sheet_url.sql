-- OTA 계정 구글 시트 공유 링크 (설정에서 관리)

alter table public.hotels
  add column if not exists ota_accounts_sheet_url text not null default '';
