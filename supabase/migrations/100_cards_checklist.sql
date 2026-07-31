-- 카드 안 체크리스트: 다음 조치가 여러 단계일 때 진행 상태를 항목별로 관리
-- [{ id, text, done, done_by, done_at }] 형태의 배열
alter table public.cards add column if not exists checklist jsonb not null default '[]'::jsonb;
