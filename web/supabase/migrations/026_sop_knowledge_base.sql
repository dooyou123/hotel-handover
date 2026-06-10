-- SOP · 지식베이스 (검색형 매뉴얼)

create table public.sop_articles (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default '일반'
    check (category in ('긴급대응', '체크인/아웃', '결제/환불', '컴플레인', '시설', '유실물', '일반')),
  keywords text[] not null default '{}',
  is_pinned boolean not null default false,
  sort_order int not null default 0,
  author_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sop_articles_hotel_active_idx
  on public.sop_articles (hotel_id, is_active, is_pinned desc, sort_order, title);

create index sop_articles_keywords_gin
  on public.sop_articles using gin (keywords);

create trigger sop_articles_set_updated_at
  before update on public.sop_articles
  for each row execute function public.set_updated_at();

alter table public.sop_articles enable row level security;

create policy "sop_articles_select" on public.sop_articles
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "sop_articles_insert" on public.sop_articles
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

create policy "sop_articles_update" on public.sop_articles
  for update to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

create policy "sop_articles_delete" on public.sop_articles
  for delete to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager());

do $$
begin
  alter publication supabase_realtime add table public.sop_articles;
exception
  when duplicate_object then null;
end $$;

-- reset_hotel_data: SOP 포함
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
  delete from public.sop_articles where hotel_id = p_hotel_id;
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

-- 기본 호텔 SOP 시드 (최초 1회)
insert into public.sop_articles (hotel_id, title, body, category, keywords, is_pinned, sort_order, author_name)
select
  '00000000-0000-4000-8000-000000000001',
  v.title,
  v.body,
  v.category,
  v.keywords,
  v.is_pinned,
  v.sort_order,
  '시스템'
from (
  values
    (
      '119 · 112 긴급 연락',
      E'1. 상황 파악 후 즉시 119(화재·응급) 또는 112(범죄·치안) 연락\n2. 호텔 매니저·보안실에 동시 통보\n3. 해당 객실·층 대피 안내 (화재 시)\n4. 인수인계 긴급 카드 작성 — 객실·시간·조치·담당자\n5. CCTV·출입 기록 보존 (112 요청 시)',
      '긴급대응',
      array['119', '112', '경찰', '응급', '화재', '긴급'],
      true,
      0
    ),
    (
      '환불 · 취소 수수료 안내',
      E'1. 예약 채널(OTA/직판) 확인 — 정책은 채널마다 다름\n2. PMS 예약 상태·결제 내역 확인\n3. 수수료 면제 여부는 매니저 승인 후 처리\n4. 환불 처리 후 인수인계 카드에 금액·승인자·영수증 번호 기록\n5. TL-Lincoln·PMS 금액 불일치 시 객실료 컨펌 탭에서 대조',
      '결제/환불',
      array['환불', '취소', '수수료', '미수금', '결제'],
      true,
      1
    ),
    (
      '컴플레인 · 소음 민원 대응',
      E'1. 30분 이내 1차 응답 (전화·객실 방문)\n2. 사과 + 즉시 가능한 조치 (층 변경·추가 어메니티 등)\n3. 소음: 양측 객실 확인, 경고·층 이동 협의\n4. card first_response_at 기록 — SLA 배지 확인\n5. 24시간 내 해결 또는 에스컬레이션',
      '컴플레인',
      array['컴플레인', '소음', '불만', '민원', '항의'],
      true,
      2
    ),
    (
      '시설 고장 · 누수 대응',
      E'1. 객실 사용 중지 여부 판단 (O.O 필요 시 HK·시설 카드)\n2. 엔지니어링·시설 업체 연락처(연락처 탭) 확인\n3. 대체 객실·보상 협의 (매니저)\n4. 시설 카테고리 인수인계 + 시설 현황에서 추적\n5. 수리 완료 후 HK에 클린·점검 요청',
      '시설',
      array['시설', '고장', '누수', '수리', 'O.O'],
      false,
      3
    ),
    (
      '유실물 접수 · 보관',
      E'1. 발견 일시·장소·물품·발견자 기록\n2. 보관함 번호 부여, 라벨 부착\n3. 유실물 카테고리 인수인계 카드 작성\n4. 30일 보관 후 폐기 절차 (매니저 확인)\n5. 수령 시 신분 확인·서명',
      '유실물',
      array['유실물', '분실', '습득', '보관'],
      false,
      4
    ),
    (
      'VIP · 일찍 체크인',
      E'1. 일정 탭 VIP 이벤트·HK 일찍 체크인 플래그 확인\n2. 객실 준비 상태 HK에 재확인\n3. 웰컴 어메니티·픽업( transport ) 일정 확인\n4. 인수인계 참고 카드로 특이사항 남기기',
      '체크인/아웃',
      array['VIP', '체크인', '일찍', 'early', '도착'],
      false,
      5
    )
) as v(title, body, category, keywords, is_pinned, sort_order)
where not exists (
  select 1 from public.sop_articles
  where hotel_id = '00000000-0000-4000-8000-000000000001'
);
