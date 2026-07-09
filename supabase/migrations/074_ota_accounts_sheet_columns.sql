-- OTA 계정 시트 컬럼 헤더 설정

alter table public.hotels
  add column if not exists ota_accounts_col_site text not null default 'OTA',
  add column if not exists ota_accounts_col_login text not null default 'ID',
  add column if not exists ota_accounts_col_password text not null default 'PW';
