/** 4~13층, 끝자리 02·10·16호 — 트윈/트리플·엑스트라베드 대상 */
export const HK_FLOORS_ASC = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export const HK_FLOORS_DESC = [...HK_FLOORS_ASC].reverse() as (typeof HK_FLOORS_ASC)[number][];

/** @deprecated 표시 순서가 필요하면 HK_FLOORS_DESC 사용 */
export const HK_FLOORS = HK_FLOORS_ASC;

export const HK_BED_SUFFIXES = ['02', '10', '16'] as const;

/** 트윈/트리플 대상에서 제외되는 객실 */
export const HK_EXCLUDED_ROOM_NUMBERS = new Set(['416', '516', '1302']);

export type HkBedSuffix = (typeof HK_BED_SUFFIXES)[number];
export type HkFloor = (typeof HK_FLOORS_ASC)[number];

export function formatHkRoomNumber(floor: number, suffix: HkBedSuffix): string {
  return `${floor}${suffix}`;
}

export function isHkBedRoomTarget(roomNumber: string): boolean {
  return !HK_EXCLUDED_ROOM_NUMBERS.has(roomNumber);
}

export function buildDefaultBedRoomNumbers(): string[] {
  return HK_FLOORS_ASC.flatMap((floor) =>
    HK_BED_SUFFIXES.map((suffix) => formatHkRoomNumber(floor, suffix)),
  ).filter(isHkBedRoomTarget);
}

export function parseHkBedRoom(roomNumber: string): { floor: number; suffix: HkBedSuffix } | null {
  if (!isHkBedRoomTarget(roomNumber)) return null;
  const match = roomNumber.match(/^(\d{1,2})(02|10|16)$/);
  if (!match) return null;
  const floor = Number(match[1]);
  const suffix = match[2] as HkBedSuffix;
  if (!HK_FLOORS_ASC.includes(floor as HkFloor)) return null;
  if (!HK_BED_SUFFIXES.includes(suffix)) return null;
  return { floor, suffix };
}

export function isDefaultBedRoom(roomNumber: string): boolean {
  return parseHkBedRoom(roomNumber) !== null;
}
