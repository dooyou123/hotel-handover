import { HK_FLOORS_ASC, parseHkBedRoom, type HkFloor } from '@/lib/housekeeping/rooms';

export const KNOWN_HOTEL_FLOORS = HK_FLOORS_ASC;

/** 객실번호에서 층 추출 (4~13층 호텔 기준) */
export function parseRoomFloor(room: string): number | null {
  const digits = room.trim().replace(/\s/g, '');
  if (!digits) return null;

  const hk = parseHkBedRoom(digits);
  if (hk) return hk.floor;

  const numeric = digits.replace(/\D/g, '');
  if (numeric.length >= 3) {
    const floorTwo = Number.parseInt(numeric.slice(0, -2), 10);
    if (KNOWN_HOTEL_FLOORS.includes(floorTwo as HkFloor)) return floorTwo;
  }
  if (numeric.length >= 2) {
    const floorTwo = Number.parseInt(numeric.slice(0, 2), 10);
    if (KNOWN_HOTEL_FLOORS.includes(floorTwo as HkFloor)) return floorTwo;
    const floorOne = Number.parseInt(numeric.slice(0, 1), 10);
    if (KNOWN_HOTEL_FLOORS.includes(floorOne as HkFloor)) return floorOne;
  }

  return null;
}

export function normalizeRoomNumber(room: string): string {
  return room.trim().replace(/\s/g, '');
}
