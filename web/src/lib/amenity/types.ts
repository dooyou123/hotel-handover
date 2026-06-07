export type AmenityTransactionType = '입고' | '출고';

export interface Amenity {
  id: number;
  hotel_id: string;
  name: string;
  box_size: number;
  unit_size: number;
  sort_order: number;
}

export interface AmenityInventoryRow {
  hotel_id: string;
  amenity_id: number;
  quantity: number;
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
  amenities?: Pick<Amenity, 'name'>;
}

export interface InventoryItem extends Amenity {
  quantity: number;
  availableBoxes: number;
  fullBoxes: number;
}

export function calcInventoryMetrics(amenity: Amenity, quantity: number) {
  return {
    availableBoxes: Math.floor(quantity / amenity.unit_size),
    fullBoxes: Math.floor(quantity / amenity.box_size),
  };
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
