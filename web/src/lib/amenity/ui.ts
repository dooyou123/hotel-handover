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

export function getStockStatus(quantity: number, boxSize: number) {
  if (quantity === 0) return 'empty' as const;
  const ratio = quantity / boxSize;
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
  empty: 'amenity-card__badge--empty',
  critical: 'amenity-card__badge--critical',
  low: 'amenity-card__badge--low',
  ok: 'amenity-card__badge--ok',
};

export const STOCK_CARD_CLASS: Record<keyof typeof STOCK_LABELS, string> = {
  empty: 'amenity-card--empty',
  critical: 'amenity-card--critical',
  low: 'amenity-card--low',
  ok: '',
};

export const STOCK_METER_CLASS: Record<keyof typeof STOCK_LABELS, string> = {
  empty: 'amenity-card__meter-fill--empty',
  critical: 'amenity-card__meter-fill--critical',
  low: 'amenity-card__meter-fill--low',
  ok: 'amenity-card__meter-fill--ok',
};
