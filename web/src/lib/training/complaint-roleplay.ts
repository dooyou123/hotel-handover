import type { ComplaintRemedyId } from '@/lib/handover/complaint-remedies';
import {
  COMPLAINT_SLA_FIRST_RESPONSE_MIN,
  COMPLAINT_SLA_RESOLUTION_HOURS,
} from '@/lib/constants';

export type RoleplayChoice = {
  id: string;
  text: string;
  feedback: string;
  score: number;
  nextNodeId: string | null;
  slaNote?: string;
  remedyHint?: ComplaintRemedyId;
};

export type RoleplayNode = {
  id: string;
  guestLine: string;
  situation: string;
  choices: RoleplayChoice[];
};

export type HandoverCardSuggestion = {
  category: '컴플레인';
  priority: 'urgent' | 'today' | 'normal';
  title: string;
  details: string;
  next_action: string;
  complaint_remedies: ComplaintRemedyId[];
  complaint_remedy_other: string;
};

export type RoleplayScenario = {
  id: string;
  title: string;
  icon: string;
  room: string;
  summary: string;
  slaReminder: string;
  startNodeId: string;
  nodes: RoleplayNode[];
  handoverTemplate: Omit<HandoverCardSuggestion, 'details'> & {
    detailsTemplate: string;
  };
};

export type RoleplayResult = {
  totalScore: number;
  maxScore: number;
  percent: number;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  gradeLabel: string;
  choiceIds: string[];
  remedyHints: ComplaintRemedyId[];
  summaryLines: string[];
};

export const COMPLAINT_SLA_TRAINING_NOTE = `컴플레인 SLA: 첫 응대 ${COMPLAINT_SLA_FIRST_RESPONSE_MIN}분 이내 · 해결 목표 ${COMPLAINT_SLA_RESOLUTION_HOURS}시간`;

export const COMPLAINT_ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'noise',
    title: '층간 소음',
    icon: '🔊',
    room: '1207',
    summary: '새벽 2시, 이웃 객실 소음으로 분노한 투숙객이 프런트에 항의합니다.',
    slaReminder: COMPLAINT_SLA_TRAINING_NOTE,
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        guestLine: '옆방에서 새벽 내내 떠들어서 잠을 못 잤어요. 지금 당장 조치해 주세요!',
        situation: '투숙객이 매우 피곤하고 화가 난 상태입니다. 첫 응대 SLA가 시작됩니다.',
        choices: [
          {
            id: 'empathy_first',
            text: '불편을 드려 정말 죄송합니다. 지금 바로 옆 객실에 연락하고 보안 순찰도 요청하겠습니다.',
            feedback: '공감 + 즉시 조치 의사 표명. SLA 내 첫 응대에 적합합니다.',
            score: 25,
            nextNodeId: 'contact_neighbor',
            slaNote: '첫 응대 30분 이내 충족',
          },
          {
            id: 'deflect',
            text: '호텔에서는 개인 간 소음까지 통제하기 어렵습니다. 내일 아침에 말씀해 주시면요.',
            feedback: '책임 회피로 들릴 수 있습니다. 긴급·오늘 우선순위 컴플레인에 부적합.',
            score: 5,
            nextNodeId: 'escalate',
          },
          {
            id: 'room_change_immediate',
            text: '바로 다른 층으로 객실 변경해 드리겠습니다. 잠시만 기다려 주세요.',
            feedback: '객실 변경은 좋은 옵션이지만, 원인 확인·이웃 안내 없이 진행하면 재발·분쟁 위험이 있습니다.',
            score: 15,
            nextNodeId: 'room_offer',
            remedyHint: 'free_upgrade',
          },
        ],
      },
      {
        id: 'contact_neighbor',
        guestLine: '얼마나 걸리나요? 내일 일찍 출발해야 해요.',
        situation: '이웃 객실 1209에 연락해 조용히 해달라고 요청할 수 있습니다.',
        choices: [
          {
            id: 'dual_action',
            text: '5분 내 연락 결과를 다시 말씀드리겠습니다. 필요하면 조용한 층으로 이동도 준비하겠습니다.',
            feedback: '시간 약속 + 대안 제시. 컴플레인 카드 next_action에 적합한 응대입니다.',
            score: 25,
            nextNodeId: 'resolve',
            remedyHint: 'amenity',
          },
          {
            id: 'wait_only',
            text: '연락해 보겠습니다. 결과는 내일 알려드릴게요.',
            feedback: '당일 해결 SLA(24시간)와 투숙객 기대에 맞지 않습니다.',
            score: 8,
            nextNodeId: 'escalate',
          },
        ],
      },
      {
        id: 'room_offer',
        guestLine: '객실 옮기는 건 좋은데, 왜 처음부터 그렇게 안 했어요?',
        situation: '투숙객이 불만을 품고 있습니다. 사과와 보상 범위를 정해야 합니다.',
        choices: [
          {
            id: 'apologize_amenity',
            text: '충분히 이해합니다. 죄송합니다. 객실 이동과 함께 불편 보상으로 어메니티를 드리겠습니다.',
            feedback: 'complaint-remedies의 amenity 보상과 정합. 인수인계 카드에 기록하세요.',
            score: 22,
            nextNodeId: 'resolve',
            remedyHint: 'amenity',
          },
          {
            id: 'no_compensation',
            text: '객실만 변경해 드리면 됩니다. 추가 보상은 어렵습니다.',
            feedback: '심야 소음·수면 피해에 보상 없음은 에스컬레이션·리뷰 악화로 이어질 수 있습니다.',
            score: 10,
            nextNodeId: 'escalate',
          },
        ],
      },
      {
        id: 'escalate',
        guestLine: '지금 매니저 불러주세요. 이 상태로는 못 참겠어요.',
        situation: '상황이 악화되었습니다. FM/GSM 에스컬레이션이 필요할 수 있습니다.',
        choices: [
          {
            id: 'fm_now',
            text: '바로 프런트 매니저에게 연결하고, 컴플레인 카드(긴급)를 등록하겠습니다.',
            feedback: '에스컬레이션 + 기록. 늦었지만 인수인계·SLA 추적에 필수입니다.',
            score: 18,
            nextNodeId: 'resolve',
          },
          {
            id: 'refuse_fm',
            text: '매니저는 지금 자리에 없습니다. 내일 처리해 주세요.',
            feedback: '에스컬레이션 거부는 심각한 서비스 실패로 이어질 수 있습니다.',
            score: 3,
            nextNodeId: 'resolve',
          },
        ],
      },
      {
        id: 'resolve',
        guestLine: '…알겠습니다. 빨리 처리해 주세요.',
        situation: '응대를 마무리하고 인수인계 카드를 작성할 단계입니다.',
        choices: [
          {
            id: 'handover_complete',
            text: '조치 내용·약속 시간·보상을 컴플레인 카드에 기록하고 다음 교대에 인계합니다.',
            feedback: '완벽한 마무리. first_response_at·complaint_remedies 필드를 채우세요.',
            score: 25,
            nextNodeId: null,
          },
          {
            id: 'verbal_only',
            text: '구두로만 약속하고 카드는 나중에 적겠습니다.',
            feedback: '교대 인계 누락·SLA 미추적 위험. 반드시 카드로 남기세요.',
            score: 8,
            nextNodeId: null,
          },
        ],
      },
    ],
    handoverTemplate: {
      category: '컴플레인',
      priority: 'today',
      title: '1207 층간 소음 컴플레인',
      detailsTemplate:
        '새벽 소음 항의. 이웃 1209 {조치}. {보상}. 투숙객 {상태}. FM/GSM: {Y/N}.',
      next_action: '야간 순찰·재발 시 객실 이동 검토',
      complaint_remedies: ['amenity'],
      complaint_remedy_other: '',
    },
  },
  {
    id: 'dirty_room',
    title: '체크인 시 청결 불만',
    icon: '🛏️',
    room: '803',
    summary: '체크인 직후 객실 바닥 머리카락·욕실 얼룩을 발견한 투숙객입니다.',
    slaReminder: COMPLAINT_SLA_TRAINING_NOTE,
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        guestLine: '방금 들어왔는데 바닥에 머리카락이 있고 욕실도 더러워요. 이런 데서 자라고요?',
        situation: '투숙객이 사진을 찍고 있습니다. HK 즉시 재청소가 필요합니다.',
        choices: [
          {
            id: 'apologize_hk',
            text: '정말 죄송합니다. 지금 HK에 즉시 재청소를 요청하고, 15분 내 다시 안내드리겠습니다.',
            feedback: '사과 + 구체적 시간. 청결 컴플레인 표준 응대입니다.',
            score: 28,
            nextNodeId: 'during_wait',
          },
          {
            id: 'blame_hk',
            text: '오늘 HK가 바빠서 그럴 수 있어요. 조금만 기다려 주세요.',
            feedback: '내부 사정 변명은 투숙객에게 불필요합니다.',
            score: 6,
            nextNodeId: 'compensation',
          },
          {
            id: 'discount_promise',
            text: '객실료 50% 할인해 드릴게요. 청소는 나중에 하겠습니다.',
            feedback: '보상을 먼저 약속하면 승인·정책 위반·과보상 위험. 조치 후 FM과 상의하세요.',
            score: 10,
            nextNodeId: 'compensation',
            remedyHint: 'rate_discount',
          },
        ],
      },
      {
        id: 'during_wait',
        guestLine: '15분이 지났는데 아무도 안 와요.',
        situation: 'HK 지연. SLA 해결 단계가 진행 중입니다.',
        choices: [
          {
            id: 'follow_up_room',
            text: '지연 죄송합니다. HK 재독촉하고, 대기 중 라운지 이용·음료 제공을 안내드리겠습니다.',
            feedback: '지연 공지 + 소소한 보상(과자/음료). remedies snacks와 유사.',
            score: 24,
            nextNodeId: 'compensation',
            remedyHint: 'snacks',
          },
          {
            id: 'ignore',
            text: '곧 갈 거예요. 조금만 더 기다려 주세요.',
            feedback: '추가 공감·대안 없음. 컴플레인 악화.',
            score: 5,
            nextNodeId: 'compensation',
          },
        ],
      },
      {
        id: 'compensation',
        guestLine: '이 정도면 조식이라도 공짜로 줘야 하는 거 아닌가요?',
        situation: '보상 협상 단계. FM 승인 범위 내에서 remedies를 선택합니다.',
        choices: [
          {
            id: 'breakfast_voucher',
            text: '불편에 대해 조식권을 드리겠습니다. FM 확인 후 카드에 기록하겠습니다.',
            feedback: 'breakfast remedy — complaint-remedies.ts와 일치.',
            score: 26,
            nextNodeId: 'finish',
            remedyHint: 'breakfast',
          },
          {
            id: 'free_night',
            text: '오늘 밤 무료로 해 드리겠습니다.',
            feedback: '과도한 보상. rate_refund/할인은 FM·GM 승인 필요.',
            score: 8,
            nextNodeId: 'finish',
            remedyHint: 'rate_refund',
          },
          {
            id: 'no_comp',
            text: '재청소만 가능합니다. 추가 보상은 없습니다.',
            feedback: '청결 불만에 보상 없음은 리뷰·재방문율에 악영향.',
            score: 12,
            nextNodeId: 'finish',
          },
        ],
      },
      {
        id: 'finish',
        guestLine: '다음부터는 이런 일 없길 바랍니다.',
        situation: '마무리 및 HK 피드백 루프.',
        choices: [
          {
            id: 'card_hk',
            text: '컴플레인 카드 + HK 특이사항 기록. 재청소 완료 시간·보상·사진 여부를 남깁니다.',
            feedback: '인수인계·HK 연계 완료. ideal path.',
            score: 22,
            nextNodeId: null,
          },
          {
            id: 'forget_card',
            text: '구두 사과만 하고 넘어갑니다.',
            feedback: '시설·HK 품질 추적 불가.',
            score: 5,
            nextNodeId: null,
          },
        ],
      },
    ],
    handoverTemplate: {
      category: '컴플레인',
      priority: 'today',
      title: '803 체크인 청결 불만',
      detailsTemplate: '바닥 머리카락·욕실 얼룩. HK 재청소 {시각}. 보상: {remedy}. 사진: {Y/N}.',
      next_action: 'HK QC 확인·동일 객실 재발 방지',
      complaint_remedies: ['breakfast'],
      complaint_remedy_other: '',
    },
  },
  {
    id: 'ac_failure',
    title: '심야 에어컨 고장',
    icon: '❄️',
    room: '1502',
    summary: '한여름 밤 11시, 에어컨이 작동하지 않아 더위를 호소하는 투숙객입니다.',
    slaReminder: COMPLAINT_SLA_TRAINING_NOTE,
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        guestLine: '에어컨이 안 나와요. 아이랑 같이 있는데 너무 더워요!',
        situation: '엔지니어링 야간 대기 여부 확인 필요. 긴급도 높음.',
        choices: [
          {
            id: 'eng_fan',
            text: '죄송합니다. 엔지니어링 출동 요청하고, 임시 선풍기를 바로 보내겠습니다.',
            feedback: '즉시 완화 + 수리 요청. 어린이 동반 시 urgent 우선순위 고려.',
            score: 27,
            nextNodeId: 'wait_eng',
          },
          {
            id: 'tomorrow',
            text: '야간에는 수리가 어렵습니다. 내일 아침에 봐 드릴게요.',
            feedback: '건강·안전 이슈. 내일로 미루기 부적절.',
            score: 4,
            nextNodeId: 'move',
          },
        ],
      },
      {
        id: 'wait_eng',
        guestLine: '30분 넘게 기다렸는데도 안 고쳐져요.',
        situation: '수리 지연. 객실 이동 또는 업그레이드 검토.',
        choices: [
          {
            id: 'upgrade_move',
            text: '동일 타입 가용 객실로 즉시 이동 안내. 짐 이동 HK 지원 요청.',
            feedback: 'free_upgrade remedy에 해당할 수 있음. FM 승인 후 기록.',
            score: 26,
            nextNodeId: 'finish',
            remedyHint: 'free_upgrade',
          },
          {
            id: 'partial_fix',
            text: '조금만 더 기다려 주세요. 거의 다 됐습니다.',
            feedback: '구체적 ETA·대안 없음.',
            score: 8,
            nextNodeId: 'move',
          },
        ],
      },
      {
        id: 'move',
        guestLine: '더는 못 기다리겠어요. 다른 방으로 옮겨 주세요.',
        situation: '투숙객이 객실 이동을 요구합니다.',
        choices: [
          {
            id: 'move_now',
            text: '가용 객실 확인 후 즉시 이동. 컴플레인 카드(긴급) 등록.',
            feedback: '적절한 에스컬레이션.',
            score: 22,
            nextNodeId: 'finish',
            remedyHint: 'free_upgrade',
          },
          {
            id: 'deny_move',
            text: '지금은 빈 방이 없습니다.',
            feedback: '확인 없이 거절 금지. 다른 층·타입 검색 후 답변.',
            score: 6,
            nextNodeId: 'finish',
          },
        ],
      },
      {
        id: 'finish',
        guestLine: '이동은 했는데, 오늘 밤 값은 어떻게 되나요?',
        situation: '요금·보상 정리.',
        choices: [
          {
            id: 'fm_rate',
            text: '요금 조정은 FM과 상의 후 안내. 카드에 불편·조치·보상 협의 중 기록.',
            feedback: 'rate_discount는 승인 후 remedies에 반영.',
            score: 24,
            nextNodeId: null,
            remedyHint: 'rate_discount',
          },
          {
            id: 'free_promise',
            text: '오늘은 무료입니다.',
            feedback: '임의 환불 약속 위험.',
            score: 7,
            nextNodeId: null,
            remedyHint: 'rate_refund',
          },
        ],
      },
    ],
    handoverTemplate: {
      category: '컴플레인',
      priority: 'urgent',
      title: '1502 심야 에어컨 고장',
      detailsTemplate: 'AC 미작동·아동 동반. 엔지니어링 {출동/결과}. 이동: {객실}. 요금: {협의}.',
      next_action: '1502 수리 상태·이동 객실 HK 인스펙션',
      complaint_remedies: ['free_upgrade'],
      complaint_remedy_other: '',
    },
  },
  {
    id: 'checkout_bill',
    title: '체크아웃 요금 분쟁',
    icon: '💳',
    room: '605',
    summary: '체크아웃 시 미니바·라운지 요금이 청구되었고 투숙객이 부인합니다.',
    slaReminder: COMPLAINT_SLA_TRAINING_NOTE,
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        guestLine: '미니바는 사용하지 않았어요. 이 금액 잘못됐습니다!',
        situation: 'PMS·미니바 피킹 리스트 대조 필요.',
        choices: [
          {
            id: 'verify_calm',
            text: '확인해 보겠습니다. 잠시 PMS와 미니바 기록을 대조하겠습니다. 불편 드려 죄송합니다.',
            feedback: '침착한 사실 확인. 첫 응대 적합.',
            score: 26,
            nextNodeId: 'evidence',
          },
          {
            id: 'insist_charge',
            text: '시스템에 나와 있으니까 맞습니다. 그대로 결제해 주세요.',
            feedback: '증거 확인 전 확정은 분쟁 확대.',
            score: 5,
            nextNodeId: 'manager',
          },
        ],
      },
      {
        id: 'evidence',
        guestLine: '기록이 틀렸다고요. 어제 밤 11시에는 이미 자고 있었어요.',
        situation: '피킹 타임스탬프·CCTV(정책 범위) 확인.',
        choices: [
          {
            id: 'adjust_if_wrong',
            text: '기록상 11:30 피킹입니다. 오류 가능성 있으면 FM 승인 후 조정하고 영수증 재발행.',
            feedback: 'rate_discount/remedy 기타 메모 가능.',
            score: 25,
            nextNodeId: 'close',
            remedyHint: 'rate_discount',
          },
          {
            id: 'show_cctv',
            text: 'CCTV 보여드리겠습니다.',
            feedback: 'CCTV 투숙객 공개는 정책·법적 검토 필요. GM 지시 따르기.',
            score: 10,
            nextNodeId: 'manager',
          },
        ],
      },
      {
        id: 'manager',
        guestLine: '지금 책임자와 이야기하겠습니다.',
        situation: 'FM 호출 필요.',
        choices: [
          {
            id: 'call_fm',
            text: '프런트 매니저 연결. 컴플레인 카드에 분쟁 금액·증빙 상태 기록.',
            feedback: '적절한 에스컬레이션.',
            score: 20,
            nextNodeId: 'close',
          },
          {
            id: 'hold_guest',
            text: '결제 완료 전까지 출입을 제한하겠습니다.',
            feedback: '불법·브랜드 이미지 훼손 위험.',
            score: 2,
            nextNodeId: 'close',
          },
        ],
      },
      {
        id: 'close',
        guestLine: 'adjustment 됐으면 영수증 다시 주세요.',
        situation: '마무리 및 기록.',
        choices: [
          {
            id: 'document_all',
            text: '조정 내역·PMS folio·컴플레인 카드·remedies(할인/기타) 기록 후 인계.',
            feedback: '완료. sanitizeComplaintRemediesForCategory로 저장.',
            score: 24,
            nextNodeId: null,
          },
          {
            id: 'verbal_adjust',
            text: '口頭로만 조정했다고 적지 않습니다.',
            feedback: '회계·감사 추적 불가.',
            score: 6,
            nextNodeId: null,
          },
        ],
      },
    ],
    handoverTemplate: {
      category: '컴플레인',
      priority: 'today',
      title: '605 체크아웃 요금 분쟁',
      detailsTemplate: '미니바 {금액} 부인. PMS/피킹 {시각}. 조정: {결과}. FM: {Y/N}.',
      next_action: 'folio 확정·영수증 재발행',
      complaint_remedies: ['rate_discount'],
      complaint_remedy_other: '',
    },
  },
  {
    id: 'slow_wifi',
    title: 'Wi-Fi 불만',
    icon: '📶',
    room: '1104',
    summary: '출장객이 화상회의 중 Wi-Fi 끊김으로 강하게 항의합니다.',
    slaReminder: COMPLAINT_SLA_TRAINING_NOTE,
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        guestLine: '회의 중인데 Wi-Fi가 계속 끊겨요. 지금 당장 고쳐 주세요!',
        situation: 'IT/엔지니어링 라인 점검. 업무 손실 강조.',
        choices: [
          {
            id: 'it_hotspot',
            text: '죄송합니다. IT 점검 요청하고, 임시 업무용 핫스팟을 로비에서 빌려드리겠습니다.',
            feedback: '즉시 대안 + 수리 요청.',
            score: 27,
            nextNodeId: 'follow',
          },
          {
            id: 'reboot_only',
            text: '공유기 재부팅해 보세요. 안 되면 내일 봐 드릴게요.',
            feedback: '업무 긴급 컴플레인에 내일은 부적절.',
            score: 6,
            nextNodeId: 'follow',
          },
        ],
      },
      {
        id: 'follow',
        guestLine: '핫스팟은 데이터가 부족해요. 호텔 잘못 아닌가요?',
        situation: '보상·기록 단계.',
        choices: [
          {
            id: 'gift_card',
            text: '불편에 대해 기프트 카드 보상을 FM과 상의해 드리겠습니다. 카드에 기록합니다.',
            feedback: 'gift_card remedy — 약 1만원 상당.',
            score: 25,
            nextNodeId: 'finish',
            remedyHint: 'gift_card',
          },
          {
            id: 'no_remedy',
            text: 'Wi-Fi는 무료 서비스라 보상은 어렵습니다.',
            feedback: '업무 피해 무시로 인식될 수 있음.',
            score: 8,
            nextNodeId: 'finish',
          },
        ],
      },
      {
        id: 'finish',
        guestLine: '다음 회의 전까지는 되야 합니다.',
        situation: 'next_action 설정.',
        choices: [
          {
            id: 'sla_card',
            text: '24시간 내 해결 SLA 추적. IT 조치·재발 여부를 컴플레인 카드 next_action에 명시.',
            feedback: 'COMPLAINT_SLA_RESOLUTION_HOURS와 정합.',
            score: 23,
            nextNodeId: null,
          },
          {
            id: 'forget',
            text: 'IT에만 맡기고 카드는 생략.',
            feedback: '인계 누락.',
            score: 5,
            nextNodeId: null,
          },
        ],
      },
    ],
    handoverTemplate: {
      category: '컴플레인',
      priority: 'today',
      title: '1104 Wi-Fi 끊김 컴플레인',
      detailsTemplate: '화상회의 중 단절. IT {티켓/조치}. 임시 핫스팟: {Y/N}. 보상: {remedy}.',
      next_action: 'IT 복구 확인·투숙객 회의 일정 전 재테스트',
      complaint_remedies: ['gift_card'],
      complaint_remedy_other: '',
    },
  },
];

export function getRoleplayScenario(id: string): RoleplayScenario | undefined {
  return COMPLAINT_ROLEPLAY_SCENARIOS.find((s) => s.id === id);
}

export function getRoleplayNode(
  scenario: RoleplayScenario,
  nodeId: string,
): RoleplayNode | undefined {
  return scenario.nodes.find((n) => n.id === nodeId);
}

export function computeRoleplayResult(
  scenario: RoleplayScenario,
  choiceIds: string[],
): RoleplayResult {
  const choiceMap = new Map<string, RoleplayChoice>();
  for (const node of scenario.nodes) {
    for (const choice of node.choices) {
      choiceMap.set(choice.id, choice);
    }
  }

  let totalScore = 0;
  const remedyHints: ComplaintRemedyId[] = [];
  const summaryLines: string[] = [];

  for (const id of choiceIds) {
    const choice = choiceMap.get(id);
    if (!choice) continue;
    totalScore += choice.score;
    if (choice.remedyHint && !remedyHints.includes(choice.remedyHint)) {
      remedyHints.push(choice.remedyHint);
    }
    if (choice.slaNote) summaryLines.push(choice.slaNote);
  }

  const maxScore = estimateMaxScore(scenario);
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let grade: RoleplayResult['grade'];
  let gradeLabel: string;
  if (percent >= 85) {
    grade = 'excellent';
    gradeLabel = '우수 — 현장 응대 준비 완료';
  } else if (percent >= 70) {
    grade = 'good';
    gradeLabel = '양호 — 일부 개선 여지';
  } else if (percent >= 50) {
    grade = 'fair';
    gradeLabel = '보통 — SLA·보상 기준 재학습 권장';
  } else {
    grade = 'poor';
    gradeLabel = '미흡 — 시나리오 재도전';
  }

  return {
    totalScore,
    maxScore,
    percent,
    grade,
    gradeLabel,
    choiceIds,
    remedyHints,
    summaryLines,
  };
}

function estimateMaxScore(scenario: RoleplayScenario): number {
  let max = 0;
  const visited = new Set<string>();

  function walk(nodeId: string, score: number) {
    if (visited.has(`${nodeId}:${score}`)) return;
    visited.add(`${nodeId}:${score}`);

    const node = getRoleplayNode(scenario, nodeId);
    if (!node) {
      max = Math.max(max, score);
      return;
    }
    for (const choice of node.choices) {
      if (choice.nextNodeId) {
        walk(choice.nextNodeId, score + choice.score);
      } else {
        max = Math.max(max, score + choice.score);
      }
    }
  }

  walk(scenario.startNodeId, 0);
  return max || 100;
}

export function buildHandoverSuggestion(
  scenario: RoleplayScenario,
  result: RoleplayResult,
  fieldValues: Record<string, string> = {},
): HandoverCardSuggestion {
  const remedies =
    result.remedyHints.length > 0 ? result.remedyHints : scenario.handoverTemplate.complaint_remedies;

  let details = scenario.handoverTemplate.detailsTemplate;
  for (const [key, value] of Object.entries(fieldValues)) {
    details = details.replaceAll(`{${key}}`, value.trim() || '-');
  }
  details = details.replace(/\{[^}]+\}/g, '-');
  details += `\n\n[롤플레이 점수 ${result.percent}% · ${result.gradeLabel}]`;

  return {
    category: scenario.handoverTemplate.category,
    priority: scenario.handoverTemplate.priority,
    title: scenario.handoverTemplate.title,
    details,
    next_action: scenario.handoverTemplate.next_action,
    complaint_remedies: remedies,
    complaint_remedy_other: scenario.handoverTemplate.complaint_remedy_other,
  };
}

export function formatRoleplayScoreBadge(percent: number): string {
  if (percent >= 85) return '우수';
  if (percent >= 70) return '양호';
  if (percent >= 50) return '보통';
  return '미흡';
}
