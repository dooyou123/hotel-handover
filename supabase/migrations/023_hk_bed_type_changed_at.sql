-- 하우스키핑: 객실 침대 종류 최종 변경 요청 시각

alter table public.housekeeping_report_rooms
  add column if not exists bed_type_changed_at timestamptz;
