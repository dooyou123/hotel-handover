-- 댓글 수정 시각 (수정됨 표시용)
alter table public.card_comments
  add column if not exists updated_at timestamptz;

comment on column public.card_comments.updated_at is '댓글 본문이 수정된 시각';
