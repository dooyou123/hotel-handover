-- Shift Check List (SHIFT+CHECK+LIST.xlsx) → checklist_items
-- A조 07:00~16:00 · B조 13:00~22:00 · C조 22:00~07:00

create or replace function public.seed_shift_checklist_items(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.checklist_completions
  where item_id in (
    select id from public.checklist_items
    where hotel_id = p_hotel_id
      and work_group in ('A', 'B', 'C')
  );

  delete from public.checklist_items
  where hotel_id = p_hotel_id
    and work_group in ('A', 'B', 'C');

  insert into public.checklist_items (hotel_id, label, sort_order, work_group) values
    (p_hotel_id, E'OTA 사이트 리뷰 수시 확인 및 답장 ( ※ 24시간내 답장 필수 )
[참고] 출근 지문인식 확인 !!', 0, 'A'),
    (p_hotel_id, E'인수인계 확인 / Garoon, Hanbiro E-mail 수시 확인
[참고] Arr:
Dep:
Occ:
ADR:
서명:', 1, 'A'),
    (p_hotel_id, E'EMERGENCY REPORTS 아래 Tab을 Excel로 "사용파일>EMERGENCY REPORTS"폴더에 저장
1. Check in (fresainn)   2. In House List   3. Expected Departure List   4. Room Status List
※각 File Name 마지막에 근무조 (A) 기입', 2, 'A'),
    (p_hotel_id, E'DAILY ON THE BOOK 2 (Exclude O.O Untick !!) & SALES ON THE BOOK 당월 포함 4개월 분 
프런트,R&R -> 프레사인 명동 -> Four Months Data -> 저장 여부 확인', 3, 'A'),
    (p_hotel_id, E'Inter Memo List Tab - (Department: Front Desk☑ / EXTENSION☑ / FACILITY☑) 확인 및 F/Up 준비
[참고] 13층 카드 3ea 유무 확인
옥상 카드 1ea 유무 확인', 4, 'A'),
    (p_hotel_id, E'Daily On The Book 2 Tab 확인 (Arrival, Departure, Occ, ADR, etc.)  (※Exclude OOO: ☐) → Find', 5, 'A'),
    (p_hotel_id, E'FD사무실에 있는 CCTV 프로그램,객실관리 프로그램 등 작동 여부 확인 /  택시 예약 현황 확인
[참고] 마스터 키 3ea 유무확인', 6, 'A'),
    (p_hotel_id, E'Check Out (Today E/D) Tab - C/O 객실 결제여부(Balance) 재확인 (미결제 객실, L.C/O 등)', 7, 'A'),
    (p_hotel_id, E'No Show List 확인 (경로: "구글>북마크탭>2026년 NO SHOW LIST-프레사인 명동")', 8, 'A'),
    (p_hotel_id, E'Reservation List Tab - "Confirm by"란 확인, 안되어있는 것들 확인 후 Confirm처리', 9, 'A'),
    (p_hotel_id, E'Check In Tab - No Rate Print ☑ 여부 확인', 10, 'A'),
    (p_hotel_id, E'Check In Tab - 조식 Amount 확인 / Ex) DBL, TWN, TWS, DBU 성인2,아이1 RB3으로 들어간거 없는지', 11, 'A'),
    (p_hotel_id, E'컨펌한 모든 예약에 대해 TL 링칸과 PMS 금액을 대조하여 일치 여부 확인.', 12, 'A'),
    (p_hotel_id, E'[※ 예약실 휴무 시]
Room Available Tab - 확인 및 RM Type 조정 / Remark 기재   ex) FREE UP (DBL -> DBS)', 13, 'A'),
    (p_hotel_id, E'GAROON, Hanbiro Mail 확인', 14, 'A'),
    (p_hotel_id, E'[2차] OTA 사이트 리뷰 수시 확인 및 답장 ( ※ 24시간내 답장 필수 )', 15, 'A'),
    (p_hotel_id, E'★커피머신 청소 및 커피콩 채우기★', 16, 'A'),
    (p_hotel_id, E'Reservation List Tab - 확인하여 (Remark, No Rate Print ☑ 여부, Ammount등) 마지막 확인', 17, 'A'),
    (p_hotel_id, E'OTA 사이트 리뷰 수시 확인 및 답장 ( ※ 24시간내 답장 필수 )
[참고] 출근 지문인식 확인 !!', 0, 'B'),
    (p_hotel_id, E'Garoon, Hanbiro E-mail 수시 확인
[참고] Arr:
Dep:
Occ:
ADR:
서명:', 1, 'B'),
    (p_hotel_id, E'No Show List 확인 (경로: "구글>북마크탭>2026년 NO SHOW LIST-프레사인 명동")', 2, 'B'),
    (p_hotel_id, E'EMERGENCY REPORTS 아래 Tab을 Excel로 "사용파일>EMERGENCY REPORTS"폴더에 저장
1. Check in (fresainn)  2. In House List   3. Expected Departure List   4. Room Status List
※각 File Name 마지막에 근무조 (B) 기입', 3, 'B'),
    (p_hotel_id, E'Inter Memo List Tab - (Department: Front Desk☑ / EXTENSION☑ / FACILITY☑) 확인 및 F/Up 준비', 4, 'B'),
    (p_hotel_id, E'Daily On The Book 2 Tab - 확인 (Arrival, Departure, Occ, ADR, etc.) (※Exclude OOO: ☐) → Find
[참고] 마스터 키 3ea 유무확인', 5, 'B'),
    (p_hotel_id, E'FD사무실에 있는 CCTV 프로그램,객실관리 프로그램 등 작동 여부 확인 /  택시 예약 현황 확인', 6, 'B'),
    (p_hotel_id, E'Reservation List Tab - 당일 "Confirm by"항목 확인, 안되어있는 예약은 확인 후 Confirm 처리', 7, 'B'),
    (p_hotel_id, E'컨펌한 모든 예약에 대해 TL 링칸과 PMS 금액을 대조하여 일치 여부 확인.', 8, 'B'),
    (p_hotel_id, E'[H/K 퇴근전 객실 재고 관리] <TL-Lincoln> 객실 판매재고 관리
(※특히 TWF, TWD, TWC 3타입은 HK report 참고 하여 2인/3인 조정해야 함)', 9, 'B'),
    (p_hotel_id, E'[H/K 퇴근전] HK 퇴근전 <ROOM ATTENDANT REPORT> 전달 받은면 "ROOM INDICATOR"와 대조하여 "NSR, DND"객실 맞는지 여부 확인', 10, 'B'),
    (p_hotel_id, E'[※ 예약실 휴무 시]
Room Available Tab - 확인 및 RM Type 조정 / Remark 기재 ex) FREE UP (DBL -> DBS)', 11, 'B'),
    (p_hotel_id, E'Actual Arrive List 
-> POA / TA 예약 결제여부 더블체크 !! 
    ★예약 상 금액과 결제금액 비교하여 제대로 결제받았는지 확인★
    ★ TA 가이드 결제 받은 건은 DP처리 되었는지 확인 ★', 12, 'B'),
    (p_hotel_id, E'<Incharge Task> 입금건(DP) 확인 및 처리', 13, 'B'),
    (p_hotel_id, E'<Incharge Task> 예약실 퇴근 이전 여행사 등 예약 마감 재확인', 14, 'B'),
    (p_hotel_id, E'<Incharge Task> 예약실 퇴근 이후 당일 예약 & Fax 수시로 확인', 15, 'B'),
    (p_hotel_id, E'<Incharge Task> 예약실 휴일 및 퇴근 이후 예약실 한비로 메일 씨트립 예약 변경 건 확인 및 처리하기', 16, 'B'),
    (p_hotel_id, E'OTA 사이트 리뷰 수시 확인 및 답장 ( 24시간내 답장 필수 ) / 인수인계 확인 / Email (HANBIRO, GAROON) 수시 확인', 0, 'C'),
    (p_hotel_id, E'EMERGENCY REPORTS 아래 Tab을 Excel로 "사용파일>EMERGENCY REPORTS"폴더에 저장
1. Check in (fresainn) 2. In House List 3. Expected Departure List 4. Room Status List ※각 파일 이름 마지막에 근무조 (C) 기입', 1, 'C'),
    (p_hotel_id, E'Tripla 예약件 확인 및 상품권, 마스크 준비 (CRM번호 InterMemo 작성)', 2, 'C'),
    (p_hotel_id, E'택시 예약 현황 확인 /  Out To Room 정리 - pick up 안된 것들 확인 / FD사무실에 있는 CCTV 프로그램 / 객실관리 프로그램 등 작동 여부', 3, 'C'),
    (p_hotel_id, E'Inter Memo List Tab 처리 완료된 건 CONFIRM 처리 / 다음 날짜로 넘기기', 4, 'C'),
    (p_hotel_id, E'Global Guest List -> Stay Date 출근일자 설정 -> Nationally - Other 설정 -> 국가 수정작업 (애매할 경우, 예약 사이트 연락처 국가번호 검색해보기)', 5, 'C'),
    (p_hotel_id, E'Room Revenue Tab
[Option: Svc+Tax / Bill Option: Manual Posting] 수동 Posting 오입력 확인 ( Room Charge, RB, E-C/IN, L-C/O 등.. )', 6, 'C'),
    (p_hotel_id, E'In House List Tab - Tax 항목 "Y" 설정 여부 확인', 7, 'C'),
    (p_hotel_id, E'REPORT → Room Rate Change List Tab 당일 객실료 변경 오입력 여부 확인하기 ( 변경 된 객실 요금 정확 한지 확인하기 )', 8, 'C'),
    (p_hotel_id, E'High Balance Tab - Balance를 -1,000,000,000(-10억) 설정 후 "Find"→ Account로 정열 후, 여행사 별(POA, VCC, CL, TA 등) 결제 여부 확인 (하기 참조)
1. POA 예약 → Balance가 마이너스(-)인지 2. POA외 (VCC, CL, TA 등) 예약 → Balance가 플러스(+)인지 (잘 못 결제 안되어 있는지)', 9, 'C'),
    (p_hotel_id, E'다음날 C/I 예정 객실 ASSIGN
1. 일행 객실 ( 같은 이름, 같은 연락처, REMARK 등)                2. SPECIAL CODE "TRIPLE", "HIGH FLOOR" 등
3. 2인RM 중 TWF, TWD, TWC (KIOSK 3인RM 배정 방지)         4. 모든 예약 배정 !!', 10, 'C'),
    (p_hotel_id, E'로비 TV 전원 / BGM OFF / AMENITY 물품 보충', 11, 'C'),
    (p_hotel_id, E'Room Change List Tab 및 O.O 설정여부 확인', 12, 'C'),
    (p_hotel_id, E'NO SHOW LIST, INTER MEMO LIST 및 NO SHOW 시트 업데이트  ( 익스피디아 : 인터메모에 금액 남기기!!! )', 13, 'C'),
    (p_hotel_id, E'Cashier Detail Report Tab (Pay Method: Credit Card) 확인 및 인쇄, Status of Deposit Tab 인쇄 후 각 영수증과 함께 봉인', 14, 'C'),
    (p_hotel_id, E'당일 체크인한 모든 예약에 대해 TL 링칸과 PMS 금액을 대조하여 일치 여부 확인.', 15, 'C'),
    (p_hotel_id, E'NIGHT AUDIT(전 계정 PMS Logout후 진행!!!)  03:00 AM', 16, 'C'),
    (p_hotel_id, E'키오스크 전원 종료 - 퇴근 전 전원 ON / 스테이션 노트북 전원 종료 - 퇴근 전 전원 ON', 17, 'C'),
    (p_hotel_id, E'DAILY ON THE BOOK 2 (Exclude O.O Untick !!) & SALES ON THE BOOK 당월 포함 4개월 분 
프런트,R&R -> 프레사인 명동 -> Four Months Data -> 폴더 생성 및 저장
사무실 WHITE BOARD에 HOUSE STATUS ( ARRIVAL, DEPARTURE , OCC , ADR ) 업데이트', 18, 'C'),
    (p_hotel_id, E'HK용 문서 인쇄 (In House List / Expected Departure List / Actual Departure List / Room Change List)  + 시트 교체 리스트 (INHOUSE LIST ARR 2일 전으로 해두고 3박 이상 )
-> 반드시 EOD 직후의 체크인, 체크아웃 진행하지 않은 상태의 데이터를 인쇄해주세요.', 19, 'C'),
    (p_hotel_id, E'EMERGENCY REPORTS 인쇄
1. CHECK IN MENU → TODAY E/A 선택 인쇄 2. EXPECTED DEPARTURE LIST 인쇄 3. IN HOUSE LIST 인쇄 4. ROOM STATUS LIST 인쇄', 20, 'C'),
    (p_hotel_id, E'HOUSE KEEPING REPORT 작성   - 4장 출력 부탁드립니다. (1장 프런트, 3장 하우스키핑 전달용)
1) VIP 혹은 주의 객실     2) 선정비 요청 객실      3) 작성일기준 연박 객실     4) 2P / 3P 세팅 여부 확인( EXTRA BED )
5) H/K 퇴근 후의 발생 한 ROOM CHANGE         6) 기타 특이사항 ( 정비 후 물품 미비 객실 )', 21, 'C'),
    (p_hotel_id, E'시트 교체 리스트 작성 후 출력(1장) / HOUSE KEEPING REPORT와 함께 전달', 22, 'C'),
    (p_hotel_id, E'Check Out Tab - TODAY E/D 객실 결제 진행 / 지정 여행사에 고객용 invoice FAX 발송 / 결제 안 된 것은 인수인계하기', 23, 'C'),
    (p_hotel_id, E'결제 완료 후, 연박 件 (같은 Room Type, C/O, C/I) ※HK Report 작성 必 / CRM적립 처리하기', 24, 'C'),
    (p_hotel_id, E'[인차지]  결제 완료 후, TA 맞게 결제 되었는지 확인 (Detail payment->Account->TA 개수, 카드번호 일치여부 확인)', 25, 'C'),
    (p_hotel_id, E'Reservation List Tab - "Confirm by"란 확인, 안되어있는 것들 확인 후 Confirm처리', 26, 'C'),
    (p_hotel_id, E'FD사무실에 있는 객실관리 프로그램 작동 여부 확인 / 로비 TV, BGM 전원 ON /  엘리베이터 바닥 청소', 27, 'C'),
    (p_hotel_id, E'Inter Memo List Tab - 확인하여 UPDATE 후 A조에 인수인계할 내용 정리', 28, 'C'),
    (p_hotel_id, E'[월말] 레지카드 & 결제 영수증 박스 담기, LOST 꺼내놓기 & HK 전달 파일 프린트', 29, 'C');
end;
$$;

grant execute on function public.seed_shift_checklist_items(uuid) to authenticated;

-- 기본 호텔: 플레이스홀더 조별 항목을 실제 Shift Check List로 교체
select public.seed_shift_checklist_items('00000000-0000-4000-8000-000000000001'::uuid);

-- 공통 플레이스홀더 제거 (조별 시트에 포함됨)
delete from public.checklist_completions
where item_id in (
  select id from public.checklist_items
  where hotel_id = '00000000-0000-4000-8000-000000000001'
    and work_group = 'common'
);

delete from public.checklist_items
where hotel_id = '00000000-0000-4000-8000-000000000001'
  and work_group = 'common';
