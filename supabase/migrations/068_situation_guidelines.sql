-- 상황별 대처 요령 (직원 편집 가능 운영 매뉴얼)

create table public.situation_guidelines (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default '일반'
    check (category in ('시설·장비', '비품·용품', '공사·점검', '연락·보고', '긴급', '일반')),
  contact_name text not null default '',
  contact_phone text not null default '',
  report_to text not null default '',
  keywords text[] not null default '{}',
  is_pinned boolean not null default false,
  sort_order int not null default 0,
  author text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index situation_guidelines_hotel_active_idx
  on public.situation_guidelines (hotel_id, is_active, is_pinned desc, sort_order, title);

create index situation_guidelines_keywords_gin
  on public.situation_guidelines using gin (keywords);

create trigger situation_guidelines_set_updated_at
  before update on public.situation_guidelines
  for each row execute function public.set_updated_at();

alter table public.situation_guidelines enable row level security;

create policy "situation_guidelines_all" on public.situation_guidelines
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.situation_guidelines;
exception
  when duplicate_object then null;
end $$;

-- reset_hotel_data: 상황 대처 요령 포함
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
  delete from public.housekeeping_room_bed_state where hotel_id = p_hotel_id;
  delete from public.amenity_transactions where hotel_id = p_hotel_id;
  delete from public.amenity_inventory where hotel_id = p_hotel_id;
  delete from public.amenities where hotel_id = p_hotel_id;
  delete from public.guest_reviews where hotel_id = p_hotel_id;
  delete from public.user_feedback where hotel_id = p_hotel_id;
  delete from public.todos where hotel_id = p_hotel_id;
  delete from public.hotel_events where hotel_id = p_hotel_id;
  delete from public.situation_guidelines where hotel_id = p_hotel_id;
  delete from public.transport_bookings where hotel_id = p_hotel_id;
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

-- 기본 시드 (호텔당 1회)
insert into public.situation_guidelines (
  hotel_id, title, body, category, contact_name, contact_phone, report_to, keywords, is_pinned, sort_order, author
)
select
  '00000000-0000-4000-8000-000000000001',
  v.title,
  v.body,
  v.category,
  v.contact_name,
  v.contact_phone,
  v.report_to,
  v.keywords,
  v.is_pinned,
  v.sort_order,
  '시스템'
from (
  values
    (
      '얼음·정수기 고장',
      E'1. 해당 기기 전원·급수 밸브 위치 확인 (기계실·1층 직원실)\n2. 엔지니어링·AS 업체에 즉시 연락\n3. 프런트·조식에 얼음 부족 안내 (필요 시 편의점 구매)\n4. 시설 카테고리 인수인계 카드 작성\n5. 수리 완료 후 정상 작동 확인·기록',
      '시설·장비',
      '엔지니어링 / 시설 AS',
      '연락처 탭 참고',
      '호텔 매니저 · 당직 관리자',
      array['얼음', '정수기', '고장', '시설', 'AS'],
      true,
      0
    ),
    (
      '박스(포장재) 부족',
      E'1. 창고 재고 확인 (B1 또는 직원실 보관함)\n2. 부족 시 구매 담당자·본사 구매팀에 연락\n3. 긴급 시 인근 문구·포장재 매장 비상 구매 (영수증 보관)\n4. 인수인계에 수량·발주 예정일 기록',
      '비품·용품',
      '구매 담당 / 본사 구매',
      '연락처 탭 참고',
      '호텔 매니저',
      array['박스', '포장', '택배', '비품', '부족'],
      true,
      1
    ),
    (
      '엘리베이터 공사·점검',
      E'1. 공사 일정·시간대 확인 (매니저·시설 업체 통보 내용)\n2. 해당 층·객실 투숙객 사전 안내 (엘리베이터 이용 불가·소음)\n3. 계단·비상 엘리베이터 안내 문구 준비 (고객 안내 탭 활용)\n4. HK·프런트에 동시 공유 — 짐 이동·체크인 동선 조정\n5. 공사 중 이상 소음·안전 이슈 시 즉시 중단 요청·매니저 보고',
      '공사·점검',
      '시설 업체 / 엘리베이터 AS',
      '연락처 탭 참고',
      '호텔 매니저 · 본사 시설팀',
      array['엘리베이터', '공사', '점검', '안내', '소음'],
      true,
      2
    ),
    (
      '119 · 112 긴급 연락',
      E'1. 상황 파악 후 즉시 119(화재·응급) 또는 112(범죄·치안) 연락\n2. 호텔 매니저·보안실에 동시 통보\n3. 해당 객실·층 대피 안내 (화재 시)\n4. 인수인계 긴급 카드 작성 — 객실·시간·조치·담당자\n5. CCTV·출입 기록 보존 (112 요청 시)',
      '긴급',
      '119 / 112',
      '119 · 112',
      '호텔 매니저 · 보안실',
      array['119', '112', '경찰', '응급', '화재', '긴급'],
      true,
      3
    ),
    (
      '컴플레인 · 소음 민원 대응',
      E'1. 30분 이내 1차 응답 (전화·객실 방문)\n2. 사과 + 즉시 가능한 조치 (층 변경·추가 어메니티 등)\n3. 소음: 양측 객실 확인, 경고·층 이동 협의\n4. 인수인계 카드에 first_response_at 기록\n5. 24시간 내 해결 또는 매니저 에스컬레이션',
      '연락·보고',
      '당직 매니저',
      '내선 / 연락처 탭',
      '호텔 매니저',
      array['컴플레인', '소음', '불만', '민원'],
      false,
      4
    )
) as v(title, body, category, contact_name, contact_phone, report_to, keywords, is_pinned, sort_order)
where not exists (
  select 1 from public.situation_guidelines
  where hotel_id = '00000000-0000-4000-8000-000000000001'
);
