export const TAXI_DESTINATIONS = [
  '인천공항 T1',
  '인천공항 T2',
  '김포공항 국제선',
  '김포공항 국내선',
] as const;

export type TaxiDestination = (typeof TAXI_DESTINATIONS)[number];

export const TAXI_VEHICLE_TYPES = ['일반', '점보'] as const;
export type TaxiVehicleType = (typeof TAXI_VEHICLE_TYPES)[number];

const INCHEON_DESTINATIONS = new Set(['인천공항 T1', '인천공항 T2']);

export function isKnownDestination(destination: string): destination is TaxiDestination {
  return (TAXI_DESTINATIONS as readonly string[]).includes(destination);
}

/** 목적지·차종에 따른 요금 (문자열 — 미터 요금 등 포함) */
export function calculateTaxiPrice(
  destination: string,
  vehicleType: TaxiVehicleType,
): string {
  if (INCHEON_DESTINATIONS.has(destination)) {
    return vehicleType === '점보' ? '105000' : '85000';
  }
  if (destination === '김포공항 국내선') {
    return vehicleType === '점보' ? '60000' : '45000';
  }
  if (destination === '김포공항 국제선') {
    return vehicleType === '점보' ? '60000' : '미터(약 45,000)';
  }
  return '';
}

export function formatTaxiPriceDisplay(price: string): string {
  if (!price) return '—';
  if (/[^0-9]/.test(price)) return price;
  const num = Number(price);
  if (Number.isNaN(num)) return price;
  return `${num.toLocaleString('ko-KR')}원`;
}

export function parsePriceAsNumber(price: string): number | null {
  const digits = price.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}
