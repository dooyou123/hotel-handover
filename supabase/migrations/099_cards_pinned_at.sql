-- 카드 핀 고정: 급하진 않지만 계속 보여야 하는 카드를 진행중 탭 최상단에 고정
-- null = 고정 안 됨, 값이 있으면 고정 시각 (고정 순서 정렬에 사용)
alter table public.cards add column if not exists pinned_at timestamptz;
