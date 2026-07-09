-- OTA 계정 시트 기타·URL 컬럼 헤더 설정

alter table public.hotels
  add column if not exists ota_accounts_col_extra text not null default '기타',
  add column if not exists ota_accounts_col_url text not null default 'URL';
