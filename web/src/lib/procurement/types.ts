/** 시드 기본값 — DB `procurement_categories`가 우선 */
export const DEFAULT_PROCUREMENT_CATEGORIES = [
  { key: 'medicine', label: '의약품' },
  { key: 'office', label: '사무용품' },
  { key: 'amenity', label: '어메니티' },
  { key: 'retail', label: '판매상품' },
  { key: 'event', label: '이벤트용품' },
  { key: 'marketing', label: '마케팅용품' },
  { key: 'other', label: '기타' },
] as const;

export type ProcurementOrderStatus = 'ordered' | 'partial' | 'received' | 'cancelled';

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementOrderStatus, string> = {
  ordered: '발주됨',
  partial: '부분 입고',
  received: '입고 완료',
  cancelled: '취소',
};

export type ProcurementCategory = {
  id: string;
  hotel_id: string;
  key: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProcurementItem = {
  id: string;
  hotel_id: string;
  category: string;
  name: string;
  unit: string;
  note: string;
  sort_order: number;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProcurementOrderLine = {
  id: string;
  hotel_id: string;
  order_id: string;
  item_id: string | null;
  category: string;
  category_label: string;
  item_name: string;
  unit: string;
  quantity: number;
  received_qty: number | null;
  note: string;
  received_at: string | null;
  received_by: string;
  created_at: string;
  updated_at: string;
};

export type ProcurementOrder = {
  id: string;
  hotel_id: string;
  title: string;
  vendor: string;
  note: string;
  status: ProcurementOrderStatus;
  ordered_at: string;
  ordered_by: string;
  expected_receive_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string;
  created_at: string;
  updated_at: string;
  lines: ProcurementOrderLine[];
};

export type ProcurementItemInput = {
  category: string;
  name: string;
  unit?: string;
  note?: string;
};

export type ProcurementCategoryInput = {
  label: string;
  key?: string;
  sortOrder?: number;
};

export type ProcurementOrderLineInput = {
  itemId?: string | null;
  category: string;
  categoryLabel: string;
  itemName: string;
  unit?: string;
  quantity: number;
  note?: string;
};

export type ProcurementOrderInput = {
  title?: string;
  vendor?: string;
  note?: string;
  orderedAt: string;
  orderedBy: string;
  expectedReceiveAt?: string | null;
  lines: ProcurementOrderLineInput[];
};

export function slugifyCategoryKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .slice(0, 40);
  if (base) return base;
  return `cat-${Date.now().toString(36)}`;
}

export function categoryLabelOf(
  categories: ProcurementCategory[],
  key: string,
  fallback = '',
): string {
  return categories.find((c) => c.key === key)?.label || fallback || key;
}
