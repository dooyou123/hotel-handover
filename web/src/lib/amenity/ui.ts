export const AMENITY_ICONS: Record<string, string> = {
  '덴탈키트': '🪥',
  '면도기': '🪒',
  '빗': '🪮',
  '입욕제(라벤더)': '🛁',
  '입욕제(자스민)': '🌸',
  '설탕': '🧂',
  '샤워캡': '🚿',
  '헤어밴드': '💆',
  '티(잉글리시)': '🫖',
  '티(얼그레이)': '🍵',
  '티(카모마일)': '🌼',
  '커피스틱': '☕',
  '마스크팩': '🧴',
  '종이컵(대)': '🥤',
  '종이컵(소)': '🥛',
};

export function getAmenityIcon(name: string) {
  return AMENITY_ICONS[name] ?? '📦';
}

/** box_size = 품목별 기준 재고 (부족/긴급 판단용, UI에는 노출하지 않음) */
export function getStockStatus(quantity: number, reorderLevel: number) {
  if (quantity === 0) return 'empty' as const;
  const ratio = reorderLevel > 0 ? quantity / reorderLevel : 1;
  if (ratio <= 0.2) return 'critical' as const;
  if (ratio <= 0.5) return 'low' as const;
  return 'ok' as const;
}

export const STOCK_LABELS = {
  empty: '품절',
  critical: '긴급',
  low: '부족',
  ok: '양호',
} as const;

export const STOCK_BADGE_CLASS: Record<keyof typeof STOCK_LABELS, string> = {
  empty: 'amenity-stock-badge--empty',
  critical: 'amenity-stock-badge--critical',
  low: 'amenity-stock-badge--low',
  ok: 'amenity-stock-badge--ok',
};

export const STOCK_ROW_CLASS: Record<keyof typeof STOCK_LABELS, string> = {
  empty: 'amenity-table-row--empty',
  critical: 'amenity-table-row--critical',
  low: 'amenity-table-row--low',
  ok: '',
};

export const STOCK_CARD_CLASS: Record<keyof typeof STOCK_LABELS, string> = {
  empty: 'amenity-grid-card--empty',
  critical: 'amenity-grid-card--critical',
  low: 'amenity-grid-card--low',
  ok: '',
};
