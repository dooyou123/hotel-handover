-- 스케줄 게시 이미지: 월별 (YYYY-MM) 관리

alter table public.schedule_board_images
  add column if not exists month_key text;

update public.schedule_board_images
set month_key = to_char(
  timezone('Asia/Seoul', coalesce(updated_at, now())),
  'YYYY-MM'
)
where month_key is null or btrim(month_key) = '';

alter table public.schedule_board_images
  alter column month_key set not null;

alter table public.schedule_board_images
  drop constraint if exists schedule_board_images_month_key_check;

alter table public.schedule_board_images
  add constraint schedule_board_images_month_key_check
  check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$');

alter table public.schedule_board_images
  drop constraint if exists schedule_board_images_pkey;

alter table public.schedule_board_images
  add primary key (hotel_id, month_key);

create index if not exists schedule_board_images_hotel_month_idx
  on public.schedule_board_images (hotel_id, month_key desc);
