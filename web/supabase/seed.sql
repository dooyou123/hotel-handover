-- Run after 001_initial_schema.sql (SQL Editor or supabase db reset)

insert into public.staff (hotel_id, name, sort_order) values
  ('00000000-0000-4000-8000-000000000001', '김프런', 0),
  ('00000000-0000-4000-8000-000000000001', '이데스크', 1),
  ('00000000-0000-4000-8000-000000000001', '박체크', 2),
  ('00000000-0000-4000-8000-000000000001', '최야간', 3)
on conflict do nothing;

insert into public.checklist_items (hotel_id, label, sort_order) values
  ('00000000-0000-4000-8000-000000000001', '고정 공지 확인', 0),
  ('00000000-0000-4000-8000-000000000001', 'VIP·단체 체크인 확인', 1),
  ('00000000-0000-4000-8000-000000000001', '조식/ F&B 준비 확인', 2),
  ('00000000-0000-4000-8000-000000000001', '마스터키·무선기 수량 확인', 3),
  ('00000000-0000-4000-8000-000000000001', '시재(캐시) 확인', 4);

insert into public.card_templates (hotel_id, label, priority, column_id, category, title, next_action, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'VIP 체크인', 'urgent', 'progress', 'VIP', 'VIP 체크인 — ', '조용한 객실 배정 확인, 어메니티 추가', 0),
  ('00000000-0000-4000-8000-000000000001', '냉난방 이슈', 'urgent', 'progress', '룸이슈', '냉난방 불량 — ', '엔지니어링 호출 후 결과 기록', 1),
  ('00000000-0000-4000-8000-000000000001', '미수금', 'today', 'progress', '결제', '미수금 — ', '체크아웃 전 결제 확인', 2),
  ('00000000-0000-4000-8000-000000000001', '룸클린 대기', 'today', 'progress', '룸이슈', '룸클린 대기 — ', 'HK에 클린 요청 후 완료 확인', 3);

insert into public.cards (hotel_id, column_id, priority, category, room, title, next_action, author, assignee_shift, assignee_name, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'progress', 'urgent', 'VIP', '1502', 'VIP 체크인 — 조용한 객실 요청', '어메니티 추가 확인', '주간 · 김프런', '주간', '김프런', 0),
  ('00000000-0000-4000-8000-000000000001', 'progress', 'today', '룸이슈', '803', '냉난방 불량 — 엔지니어링 호출', '수리 결과 기록', '오후 · 이데스크', '오후', '이데스크', 0),
  ('00000000-0000-4000-8000-000000000001', 'progress', 'today', '결제', '412', '미수금 — 체크아웃 전 결제', '프론트 결제 확인', '주간 · 김프런', '주간', '김프런', 1)
on conflict do nothing;

insert into public.notices (hotel_id, type, content, author, is_pinned) values
  ('00000000-0000-4000-8000-000000000001', 'announcement', 'VIP 1502호 — 18:00 체크인, 조용한 객실 배정', '주간', true),
  ('00000000-0000-4000-8000-000000000001', 'change', '조식 운영 시간 07:00~10:00 (6월 한 달)', '매니저', false);
