export type EmergencyContact = {
  role: string;
  name: string;
  phone: string;
  note?: string;
};

export type EmergencyScenario = {
  id: string;
  title: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  summary: string;
  checklist: string[];
  contacts: EmergencyContact[];
  donts: string[];
  handoverTemplate: string;
};

export const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: 'fire',
    title: '화재',
    icon: '🔥',
    severity: 'critical',
    summary: '연기·불꽃·소화기 경보 감지 시 즉시 대피 유도와 119 신고가 최우선입니다.',
    checklist: [
      '119 신고 (위치·층·인원 수 명확히)',
      '호텔 화재 경보 방송·비상벨 확인',
      '해당 층·인접 층 투숙객 대피 유도 (엘리베이터 사용 금지, 계단 이용)',
      '엔지니어링·보안팀 즉시 연락',
      '로비·지하 대피 장소 안내',
      '인수인계 카드(긴급) 등록 — 객실·인원·조치 현황',
      '소방대 도착 시 현장 인계',
    ],
    contacts: [
      { role: '119', name: '소방', phone: '119' },
      { role: '엔지니어링', name: '시설 담당', phone: '내선 8801', note: '펌프·전기·가스 차단' },
      { role: '보안', name: '보안실', phone: '내선 8802' },
      { role: 'GM', name: '총지배인', phone: '내선 8000' },
    ],
    donts: [
      '엘리베이터로 대피시키지 않기',
      '문을 잠그고 대기시키지 않기',
      '개인 판단으로 소화기만으로 진화 시도하지 않기 (연기 확산 시)',
      '119 신고 전 대피 안내를 미루지 않기',
    ],
    handoverTemplate:
      '[긴급·화재] {층} {위치} — {시각} 감지. 119 신고 완료({시각}). 대피 유도 {인원}명. 미대피/특이: {내용}. 엔지니어링·보안 연락 완료. 소방대 도착 시 인계 담당: {이름}.',
  },
  {
    id: 'medical',
    title: '응급환자',
    icon: '🏥',
    severity: 'critical',
    summary: '의식·호흡·출혈 등 생명 위험 징후 시 119와 프런트 매니저에게 즉시 보고합니다.',
    checklist: [
      '119 신고 (환자 상태·객실·연령·의식 여부)',
      '객실号·층·엘리베이터 안내 준비',
      '환자 옆에서 호흡·의식 확인, 무리한 이동 금지',
      'AED·응급키트 위치 확인 (로비·각 층)',
      '동행인·목격자 연락처 기록',
      '개인정보 최소 공개 원칙 준수',
      '인수인계 카드 등록 — 후속 조치·병원 이송 여부',
    ],
    contacts: [
      { role: '119', name: '응급', phone: '119' },
      { role: '프런트 매니저', name: 'FM', phone: '내선 8100' },
      { role: '보안', name: '보안실', phone: '내선 8802', note: '엘리베이터 hold·응급차 안내' },
    ],
    donts: [
      '약물·주사 등 의료행위 시도하지 않기',
      '119 신고 없이 택시만 불러 보내지 않기',
      '환자 사진·SNS 게시 금지',
      '호텔 책임 회피 발언 금지 — 공감·협조 태도 유지',
    ],
    handoverTemplate:
      '[긴급·응급] {객실} — {시각} {증상}. 119 신고({시각}), 구급차 {예상/도착}. FM·보안 연락 완료. 동행인: {이름/연락처}. 후속: {병원·보험·룸차지 등}.',
  },
  {
    id: 'leak',
    title: '누수',
    icon: '💧',
    severity: 'high',
    summary: '천장·욕실·에어컨 드립 등 누수는 전기·층간 피해 확대를 막기 위해 즉시 차단·이동 조치합니다.',
    checklist: [
      '해당 객실 전기 차단(안전 확인 후) 및 투숙객 대체 객실 제안',
      '엔지니어링 출동 요청 — 원인·밸브 위치 확인',
      '하층·인접 객실 피해 여부 점검',
      '바닥·가구 보호(타월·비닐)',
      '하우스키핑·세탁 연계 (침구·카펫)',
      '보험·GM 보고 여부 판단',
      '인수인계 카드 — 객실·원인·대체 배정·예상 복구',
    ],
    contacts: [
      { role: '엔지니어링', name: '시설', phone: '내선 8801' },
      { role: '하우스키핑', name: 'HK', phone: '내선 8700' },
      { role: 'GM', name: '총지배인', phone: '내선 8000', note: '대규모·다층 누수 시' },
    ],
    donts: [
      '누수 원인 확인 전 객실 그대로 재판매하지 않기',
      '전기 콘센트 주변 물기 방치하지 않기',
      '투숙객에게 원인 확정 전 책임·보상 약속하지 않기',
    ],
    handoverTemplate:
      '[누수] {객실} — {시각} {위치} 누수. 대체: {객실/상태}. 엔지니어링 {출동/원인}. 하층 피해: {있음/없음}. HK·세탁: {조치}. GM 보고: {Y/N}.',
  },
  {
    id: 'blackout',
    title: '정전',
    icon: '⚡',
    severity: 'high',
    summary: '전체·층별 정전 시 비상등·발전기 상태 확인과 투숙객 안내, 엘리베이터 갇힘 대응을 병행합니다.',
    checklist: [
      '정전 범위 확인 (전체/층/구역)',
      '엔지니어링·한전(필요 시) 연락',
      '엘리베이터 갇힘 여부 확인 — 보안·엔지니어링 출동',
      '로비·복도 비상 조명·손전등 배치',
      '객실 내 안내(콘센트·Wi-Fi·냉난방 영향)',
      'VIP·장기 투숙·의료기기 사용 객실 우선 확인',
      '인수인계 카드 — 복구 예상·미복구 구역',
    ],
    contacts: [
      { role: '엔지니어링', name: '시설', phone: '내선 8801' },
      { role: '한전', name: '한국전력', phone: '123', note: '구역 정전·한전 공지 확인' },
      { role: '보안', name: '보안실', phone: '내선 8802' },
    ],
    donts: [
      '발전기·차단기 함부로 조작하지 않기 (엔지니어링 지시 따르기)',
      '엘리베이터 갇힘 시 강제 개방 시도 금지',
      '복구 시각 확답하지 않기 — 확인되는 범위만 안내',
    ],
    handoverTemplate:
      '[정전] {범위} — {시각} 발생. 엔지니어링 {상태}. 엘리베이터: {정상/갇힘·층}. 투숙객 안내 완료. 복구: {예상/완료}. 미복구 구역: {목록}.',
  },
  {
    id: 'security',
    title: '보안',
    icon: '🛡️',
    severity: 'high',
    summary: '침입·소란·분실·스토킹·무단 촬영 등은 보안팀과 GM 보고, 증거·목격자 기록이 중요합니다.',
    checklist: [
      '즉시 보안실 연락 — 위치·인원·행동 설명',
      '당사자 분리·안전 확보 (직접 제압 금지)',
      'CCTV·키카드 로그 보존 요청',
      '피해 투숙객 공감·개인정보 보호',
      '경찰 신고 필요 여부 GM과 판단',
      '목격자·시간대 기록',
      '인수인계 카드 — 사건 요약·후속·연락처',
    ],
    contacts: [
      { role: '보안', name: '보안실', phone: '내선 8802' },
      { role: '112', name: '경찰', phone: '112', note: 'GM 지시 시' },
      { role: 'GM', name: '총지배인', phone: '내선 8000' },
    ],
    donts: [
      '직원 단독으로 신체 접촉·제압하지 않기',
      'CCTV 영상 투숙객에게 임의 제공하지 않기',
      'SNS·언론 대응은 GM 지시 없이 하지 않기',
    ],
    handoverTemplate:
      '[보안] {위치} — {시각} {사건 유형}. 보안 출동·{상태}. 당사자: {인원/객실}. CCTV·로그 보존 요청. GM 보고: {Y/N}. 후속: {경찰·객실 이동·환불 검토 등}.',
  },
  {
    id: 'elevator',
    title: '엘리베이터',
    icon: '🛗',
    severity: 'high',
    summary: '갇힘·고장·이상 소음 시 승객 안심 연락과 정비업체·보안 출동을 즉시 요청합니다.',
    checklist: [
      '갇힌 승객 수·층·호기 번호 확인',
      '승객과 인터폰·휴대폰으로 연락 — 구조 진행 중 안내',
      '엔지니어링·엘리베이터 유지보수사 연락',
      '119는 의료·장시간 갇힘·호흡곤란 시 GM 판단',
      '다른 호기·계단 안내',
      '구조 완료 후 원인·재발 방지 기록',
      '인수인계 카드 등록',
    ],
    contacts: [
      { role: '엔지니어링', name: '시설', phone: '내선 8801' },
      { role: '엘리베이터', name: '유지보수', phone: '내선 8810', note: '계약업체 긴급번호 확인' },
      { role: '보안', name: '보안실', phone: '내선 8802' },
    ],
    donts: [
      '갇힘 시 객실 문·승강로 문 강제 개방하지 않기',
      '승객에게 구조 시간 확답하지 않기',
      '정비 중 임의 재가동하지 않기',
    ],
    handoverTemplate:
      '[엘리베이터] {호기} — {층} {시각} {갇힘/고장}. 승객 {인원}명 안내 중. 유지보수 {출동/ETA}. 구조: {완료/진행}. 대체 안내: {계단/타 호기}.',
  },
  {
    id: 'gas',
    title: '가스',
    icon: '⛽',
    severity: 'critical',
    summary: '가스 냄새·경보 시 화기·전기 스파크를 차단하고 즉시 대피·119·가스회사 연락합니다.',
    checklist: [
      '가스 밸브·환기 — 엔지니어링 지시에 따라 (직원 임의 조작 주의)',
      '119 및 가스안전공사·도시가스 긴급번호',
      '해당 구역 점화원·전기 차단',
      '인접 객실·주방 대피·안내',
      '냄새 확산 층·방향 기록',
      '복구 전 해당 구역 사용 금지',
      '인수인계 카드(긴급) 등록',
    ],
    contacts: [
      { role: '119', name: '소방', phone: '119' },
      { role: '가스', name: '도시가스 긴급', phone: '114', note: '호텔 계약 지역번호 확인' },
      { role: '엔지니어링', name: '시설', phone: '내선 8801' },
      { role: 'GM', name: '총지배인', phone: '내선 8000' },
    ],
    donts: [
      '스위치·콘센트 ON/OFF 반복 조작하지 않기 (스파크 위험)',
      '냄새 확인을 위해 불 붙이거나 휴대폰 플래시만 의존하지 않기',
      '냄새 사라졌다고 즉시 재입실·재영업하지 않기',
    ],
    handoverTemplate:
      '[긴급·가스] {위치} — {시각} 가스 냄새/경보. 119·가스 {신고}. 대피: {범위/인원}. 밸브·환기: {상태}. 사용 금지 구역: {목록}. GM·엔지니어링 인계.',
  },
];

export function getEmergencyScenario(id: string): EmergencyScenario | undefined {
  return EMERGENCY_SCENARIOS.find((s) => s.id === id);
}

export function formatEmergencySeverity(severity: EmergencyScenario['severity']): string {
  switch (severity) {
    case 'critical':
      return '치명';
    case 'high':
      return '높음';
    case 'medium':
      return '보통';
    default:
      return severity;
  }
}

export function buildEmergencyHandoverText(
  scenario: EmergencyScenario,
  fields: Record<string, string>,
): string {
  let text = scenario.handoverTemplate;
  for (const [key, value] of Object.entries(fields)) {
    text = text.replaceAll(`{${key}}`, value.trim() || '-');
  }
  return text.replace(/\{[^}]+\}/g, '-');
}
