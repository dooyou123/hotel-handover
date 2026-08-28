export type AmenityTransactionType = '입고' | '출고' | '실사';

export interface Amenity {
  id: number;
  hotel_id: string;
  name: string;
  box_size: number;
  unit_size: number;
  sort_order: number;
  /** 재고 단위. 기본 '개', 커피 원두는 '봉'. */
  unit: string;
}

export interface AmenityInventoryRow {
  hotel_id: string;
  amenity_id: number;
  quantity: number;
  min_quantity: number;
  updated_at: string;
}

export interface AmenityTransaction {
  id: string;
  hotel_id: string;
  created_at: string;
  type: AmenityTransactionType;
  amenity_id: number;
  box_count: number;
  total_items: number;
  author: string;
  memo: string;
  audit_before?: number | null;
  audit_after?: number | null;
  amenities?: Pick<Amenity, 'name' | 'unit'>;
}

export interface InventoryItem extends Amenity {
  quantity: number;
  minQuantity: number;
  monthlyUsage: number;
  orderBoxes: number;
  remainingBoxes: number;
}

export function getEffectiveStockForEdit(
  items: InventoryItem[],
  editing: AmenityTransaction | null,
  targetAmenityId: number,
): number {
  const target = items.find((item) => item.id === targetAmenityId);
  if (!target) return 0;

  let qty = target.quantity;
  if (editing && editing.amenity_id === targetAmenityId) {
    if (editing.type === '실사') {
      if (editing.audit_before != null) qty = editing.audit_before;
    } else {
      qty += editing.type === '출고' ? editing.total_items : -editing.total_items;
    }
  }
  return qty;
}

export function formatAmenityDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAmenityDateTimeShort(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
