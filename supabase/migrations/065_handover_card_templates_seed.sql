-- 자주 쓰는 인수인계 일반 템플릿 (work_group 공통)

insert into public.card_templates (
  hotel_id, label, priority, column_id, category, title, next_action, details, sort_order, work_group
)
select
  '00000000-0000-4000-8000-000000000001',
  v.label, v.priority, v.column_id, v.category, v.title, v.next_action, v.details, v.sort_order, ''
from (values
  (
    '소음 민원',
    'urgent',
    'progress',
    '컴플레인',
    '층간 소음',
    '재발 시 층당·HK 연락',
    E'민원 내용:\n안내한 내용:',
    100
  ),
  (
    '객실 냄새',
    'urgent',
    'progress',
    '컴플레인',
    '객실 냄새',
    '조치 후 투숙객 회신',
    E'냄새 종류·지속:\nHK/공조 확인:',
    101
  ),
  (
    '서비스 불만',
    'today',
    'progress',
    '컴플레인',
    '서비스 컴플레인',
    '보상·후속 조치 확인',
    E'불만 내용:\n1차 응대(30분 내):',
    102
  ),
  (
    '분실물 접수',
    'today',
    'progress',
    '유실물',
    '분실물 접수',
    '보관·연락 결과 업데이트',
    E'분실 물품:\n마지막 사용 추정 위치:\n연락처:',
    110
  ),
  (
    '습득물 보관',
    'today',
    'progress',
    '유실물',
    '습득물 보관',
    '분실물 문의 시 매칭',
    E'습득 물품:\n발견 위치:\n보관 위치:',
    111
  ),
  (
    '시설 고장',
    'urgent',
    'progress',
    '시설',
    '시설 고장',
    '수리 완료·객실 사용 가능 여부',
    E'증상:\n엔지니어링 전달:',
    120
  ),
  (
    '누수',
    'urgent',
    'progress',
    '시설',
    '누수',
    '엔지니어링·HK 마감 확인',
    E'발생 위치:\n임시 조치:',
    121
  ),
  (
    '냉난방 불량',
    'urgent',
    'progress',
    '시설',
    '냉난방 불량',
    '수리 결과·투숙객 안내',
    E'증상(냉방/난방):\n엔지니어링 호출:',
    122
  ),
  (
    '공용구역 이슈',
    'today',
    'progress',
    '공용',
    '로비/키오스크 이슈',
    '복구·안내 완료 확인',
    E'발생 내용:\n조치:',
    130
  ),
  (
    '얼리 체크인',
    'today',
    'progress',
    '체크인/아웃',
    '얼리 체크인',
    '도착 전 객실 Ready 확인',
    E'희망 시간:\n배정 객실:\nHK 클린 상태:',
    140
  ),
  (
    '레이트 체크아웃',
    'today',
    'progress',
    '체크인/아웃',
    '레이트 체크아웃',
    'HK 스케줄·추가 요금 정산',
    E'희망 시간:\n요금 안내:\n다음 투숙 영향:',
    141
  ),
  (
    '미수금',
    'today',
    'progress',
    '결제',
    '미수금',
    '체크아웃 전 결제 확인',
    E'금액:\n사유·안내 내용:',
    150
  ),
  (
    'HK 요청',
    'today',
    'progress',
    '기타',
    'HK 요청',
    '완료·미완료 확인',
    E'요청 내용:\nHK 전달 시각:',
    160
  ),
  (
    '재고 부족',
    'today',
    'progress',
    '기타',
    '재고 부족',
    '입고·대체품 배치',
    E'부족 품목:\n발주/대체 조치:',
    161
  ),
  (
    'VIP 점검',
    'today',
    'progress',
    '시설',
    'VIP 도착 전 점검',
    'HK 선정비·프런트 최종 확인',
    E'배정 객실:\n특이 요청:\n어메니티:',
    123
  )
) as v(label, priority, column_id, category, title, next_action, details, sort_order)
where not exists (
  select 1
  from public.card_templates t
  where t.hotel_id = '00000000-0000-4000-8000-000000000001'
    and t.label = v.label
    and coalesce(t.work_group, '') = ''
);
