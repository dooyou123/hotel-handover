-- 카드별 활동 이력(타임라인) 조회용 인덱스
create index if not exists activity_logs_entity_idx
  on public.activity_logs (hotel_id, entity_type, entity_id, created_at desc);
