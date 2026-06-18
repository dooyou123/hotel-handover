export const AMENITY_WORKSPACE_TABS = {
  inventory: {
    label: '재고 관리',
    description: '품목을 선택해 입고·출고·실사를 입력합니다.',
  },
  history: {
    label: '입출고 기록',
    description: '전체 품목의 입고·출고·실사 기록을 시간순으로 봅니다.',
  },
} as const;

export const AMENITY_MODE_HINTS = {
  출고: '객실·층 배치 등으로 나간 수량을 차감합니다.',
  입고: '입고·발주 반영 시 재고를 늘립니다.',
  실사: '실제 개수를 입력해 시스템 재고를 맞춥니다.',
} as const;

export const AMENITY_ORDER_SHEET_HINT = '최근 30일 출고 기준으로 권장 발주량을 계산합니다.';
