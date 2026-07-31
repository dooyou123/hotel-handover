-- 사건 스레드: 같은 사건의 카드들이 하나의 thread_id를 공유한다
-- (누수 신고 → 업체 방문 → 보상 처리처럼 며칠에 걸쳐 이어지는 건 묶기)
alter table public.cards add column if not exists thread_id uuid;

create index if not exists cards_thread_idx
  on public.cards (hotel_id, thread_id)
  where thread_id is not null;
