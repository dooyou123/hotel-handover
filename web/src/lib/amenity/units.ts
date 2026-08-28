export const DEFAULT_AMENITY_UNIT = '개';
export const BAG_AMENITY_UNIT = '봉';
export const BAG_AMENITY_NAME = '커피 원두';
export const BAG_QTY_PRESETS = [1, 2, 3] as const;

export function resolveAmenityUnit(item?: { unit?: string | null; name?: string | null } | null): string {
  const unit = item?.unit?.trim();
  if (unit) return unit;
  if (item?.name === BAG_AMENITY_NAME) return BAG_AMENITY_UNIT;
  return DEFAULT_AMENITY_UNIT;
}

export function formatAmenityQty(quantity: number, unit: string = DEFAULT_AMENITY_UNIT): string {
  return `${quantity.toLocaleString()}${unit}`;
}

export function isBagAmenityUnit(unit: string): boolean {
  return unit === BAG_AMENITY_UNIT;
}

/** 봉지 단위는 박스 잔량을 따로 보여 주지 않는다. */
export function amenityShowsPackCount(item: { unit?: string | null; name?: string | null; unit_size: number }): boolean {
  return !isBagAmenityUnit(resolveAmenityUnit(item)) && item.unit_size > 1;
}

export function bagQtyPresets(boxSize?: number): number[] {
  const presets: number[] = [...BAG_QTY_PRESETS];
  if (boxSize && boxSize > 0 && !presets.includes(boxSize)) {
    presets.push(boxSize);
  }
  return presets;
}
