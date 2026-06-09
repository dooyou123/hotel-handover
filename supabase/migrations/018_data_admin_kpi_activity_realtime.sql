-- reset/seed 보완 (todos, hotel_events) + activity_logs Realtime

-- activity_logs Realtime (변경 기록 모달 자동 갱신)
do $$
begin
  alter publication supabase_realtime add table public.activity_logs;
exception
  when duplicate_object then null;
end $$;

-- reset_hotel_data: 할일·호텔 일정 포함
create or replace function public.reset_hotel_data(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;
  if not public.user_is_manager() then
    raise exception '관리자만 실행할 수 있습니다.';
  end if;

  delete from public.housekeeping_report_rooms
  where report_id in (select id from public.housekeeping_reports where hotel_id = p_hotel_id);

  delete from public.housekeeping_reports where hotel_id = p_hotel_id;
  delete from public.amenity_transactions where hotel_id = p_hotel_id;
  delete from public.amenity_inventory where hotel_id = p_hotel_id;
  delete from public.amenities where hotel_id = p_hotel_id;
  delete from public.guest_reviews where hotel_id = p_hotel_id;
  delete from public.user_feedback where hotel_id = p_hotel_id;
  delete from public.todos where hotel_id = p_hotel_id;
  delete from public.hotel_events where hotel_id = p_hotel_id;
  delete from public.cards where hotel_id = p_hotel_id;
  delete from public.notices where hotel_id = p_hotel_id;
  delete from public.activity_logs where hotel_id = p_hotel_id;
  delete from public.shift_handovers where hotel_id = p_hotel_id;
  delete from public.schedule_entries where hotel_id = p_hotel_id;
  delete from public.contacts where hotel_id = p_hotel_id;

  delete from public.checklist_completions
  where item_id in (select id from public.checklist_items where hotel_id = p_hotel_id);

  delete from public.checklist_items where hotel_id = p_hotel_id;
  delete from public.card_templates where hotel_id = p_hotel_id;
  delete from public.staff where hotel_id = p_hotel_id;
end;
$$;

-- seed_hotel_sample_data: 할일·호텔 일정 샘플 추가
create or replace function public.seed_hotel_sample_data(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;
  if not public.user_is_manager() then
    raise exception '관리자만 실행할 수 있습니다.';
  end if;

  insert into public.staff (hotel_id, name, sort_order) values
    (p_hotel_id, '김프런', 0),
    (p_hotel_id, '이데스크', 1),
    (p_hotel_id, '박체크', 2),
    (p_hotel_id, '최야간', 3)
  on conflict (hotel_id, name) do nothing;

  insert into public.checklist_items (hotel_id, label, sort_order, work_group) values
    (p_hotel_id, '고정 공지 확인', 0, 'common'),
    (p_hotel_id, 'VIP·단체 체크인 확인', 1, 'common'),
    (p_hotel_id, '조식/F&B 준비 확인', 2, 'common'),
    (p_hotel_id, '마스터키·무선기 수량 확인', 3, 'common'),
    (p_hotel_id, '시재(캐시) 확인', 4, 'common'),
    (p_hotel_id, 'A조 전용 — VIP 룸 점검', 5, 'A'),
    (p_hotel_id, 'B조 전용 — 미니바 재고', 6, 'B');

  insert into public.card_templates (hotel_id, label, priority, column_id, category, title, next_action, sort_order) values
    (p_hotel_id, 'VIP 체크인', 'urgent', 'progress', 'VIP', 'VIP 체크인 — ', '조용한 객실 배정 확인, 어메니티 추가', 0),
    (p_hotel_id, '냉난방 이슈', 'urgent', 'progress', '룸이슈', '냉난방 불량 — ', '엔지니어링 호출 후 결과 기록', 1),
    (p_hotel_id, '미수금', 'today', 'progress', '결제', '미수금 — ', '체크아웃 전 결제 확인', 2),
    (p_hotel_id, '룸클린 대기', 'today', 'progress', '룸이슈', '룸클린 대기 — ', 'HK에 클린 요청 후 완료 확인', 3);

  insert into public.cards (
    hotel_id, column_id, priority, category, room, title, details, next_action,
    author, assignee_shift, assignee_name, sort_order
  ) values
    (
      p_hotel_id, 'progress', 'urgent', 'VIP', '1502',
      'VIP 체크인 — 조용한 객실 요청',
      '18:00 체크인, 고층·조용한 객실 희망',
      '어메니티 추가 확인',
      '주간 · 김프런', '주간', '김프런', 0
    ),
    (
      p_hotel_id, 'progress', 'today', '룸이슈', '803',
      '냉난방 불량 — 엔지니어링 호출',
      '냉방 약함, 803호',
      '수리 결과 기록',
      '오후 · 이데스크', '오후', '이데스크', 1
    ),
    (
      p_hotel_id, 'progress', 'today', '결제', '412',
      '미수금 — 체크아웃 전 결제',
      '카드 한도 초과 가능성',
      '프론트 결제 확인',
      '주간 · 김프런', '주간', '김프런', 2
    );

  insert into public.notices (hotel_id, type, content, author, is_pinned) values
    (p_hotel_id, 'announcement', E'VIP 1502호 — 18:00 체크인\n조용한 객실 배정 및 어메니티 추가', '주간', true),
    (p_hotel_id, 'change', E'조식 운영 시간 07:00~10:00 (6월 한 달)\n라운지 입구 안내판도 함께 변경', '관리자', false);

  insert into public.contacts (hotel_id, name, department, phone, note, sort_order, is_pinned) values
    (p_hotel_id, '엔지니어링', '내부', '내선 7100', '24시간 대기', 0, true),
    (p_hotel_id, '하우스키핑', '내부', '내선 7200', '룸클린 요청', 1, true),
    (p_hotel_id, '세탁실', '내부', '내선 7300', '', 2, false);

  insert into public.schedule_entries (hotel_id, work_date, shift, staff_name)
  select p_hotel_id, current_date, shift, staff_name
  from (values
    ('주간', '김프런'),
    ('오후', '이데스크'),
    ('야간', '최야간')
  ) as v(shift, staff_name);

  insert into public.todos (
    hotel_id, title, description, due_date, priority, status,
    assignee_name, assignee_shift, author, sort_order
  ) values
    (
      p_hotel_id, '1502 VIP 어메니티 세트 확인', '과일·와인 세트 준비',
      current_date, 'urgent', 'open', '김프런', '주간', '주간 · 김프런', 0
    ),
    (
      p_hotel_id, '조식 안내판 교체', '라운지 입구 07:00~10:00',
      current_date + 1, 'normal', 'open', '이데스크', '오후', '관리자', 1
    ),
    (
      p_hotel_id, '803호 수리 결과 확인', '엔지니어링 완료 여부',
      current_date - 1, 'normal', 'done', '이데스크', '오후', '오후 · 이데스크', 2
    );

  update public.todos
  set completed_at = now() - interval '2 hours'
  where hotel_id = p_hotel_id and title = '803호 수리 결과 확인';

  insert into public.hotel_events (
    hotel_id, title, description, event_date, start_time, end_time, category, author
  ) values
    (
      p_hotel_id, 'VIP 1502 체크인', '18:00 체크인 · 조용한 객실',
      current_date, '18:00', '18:30', 'VIP', '주간 · 김프런'
    ),
    (
      p_hotel_id, '월간 소방 점검', '전층 순회 · 14:00~16:00',
      current_date + 3, '14:00', '16:00', '점검', '관리자'
    );

  insert into public.amenities (hotel_id, name, box_size, unit_size, sort_order) values
    (p_hotel_id, '덴탈키트', 250, 25, 1),
    (p_hotel_id, '면도기', 500, 25, 2),
    (p_hotel_id, '빗', 500, 25, 3),
    (p_hotel_id, '입욕제(라벤더)', 500, 50, 4),
    (p_hotel_id, '입욕제(자스민)', 500, 50, 5),
    (p_hotel_id, '설탕', 1000, 100, 6),
    (p_hotel_id, '샤워캡', 1000, 100, 7),
    (p_hotel_id, '헤어밴드', 2000, 100, 8),
    (p_hotel_id, '티(잉글리시)', 1200, 100, 9),
    (p_hotel_id, '티(얼그레이)', 1200, 100, 10),
    (p_hotel_id, '티(카모마일)', 1200, 100, 11),
    (p_hotel_id, '커피스틱', 1000, 1000, 12),
    (p_hotel_id, '마스크팩', 400, 80, 13),
    (p_hotel_id, '종이컵(대)', 1200, 100, 14),
    (p_hotel_id, '종이컵(소)', 1200, 100, 15)
  on conflict (hotel_id, name) do nothing;

  insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
  select p_hotel_id, a.id, 500
  from public.amenities a
  where a.hotel_id = p_hotel_id
  on conflict (hotel_id, amenity_id) do update set quantity = 500, updated_at = now();

  insert into public.guest_reviews (
    hotel_id, sentiment, content_original, content_ko, guest_name,
    check_in_date, check_out_date, reservation_number, author
  ) values
    (
      p_hotel_id, 'positive',
      'Great stay, very clean room.',
      '객실이 매우 깨끗하고 만족스러운 숙박이었습니다.',
      'John Smith', current_date - 2, current_date - 1, 'BK-10021', '주간 · 김프런'
    ),
    (
      p_hotel_id, 'negative',
      'Noise from hallway at night.',
      '밤에 복도 소음이 심했습니다.',
      'Tanaka Yuki', current_date - 5, current_date - 3, 'BK-10008', '오후 · 이데스크'
    );
end;
$$;
