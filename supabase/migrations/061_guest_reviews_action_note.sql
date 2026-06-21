-- 리뷰 객실 조치 완료 시 조치 내용 기록

alter table public.guest_reviews
  add column if not exists room_action_note text not null default '';
