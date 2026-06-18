-- 댓글 수정·삭제 이력 (소프트 삭제)

alter table public.card_comments
  add column if not exists edited_by_shift text,
  add column if not exists edited_by_name text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_shift text,
  add column if not exists deleted_by_name text;

comment on column public.card_comments.edited_by_shift is '마지막 수정한 교대';
comment on column public.card_comments.edited_by_name is '마지막 수정한 직원';
comment on column public.card_comments.deleted_at is '소프트 삭제 시각';
comment on column public.card_comments.deleted_by_shift is '삭제한 교대';
comment on column public.card_comments.deleted_by_name is '삭제한 직원';
