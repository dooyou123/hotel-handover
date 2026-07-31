import type { WorkSession } from '@/lib/handover/types';

export const DAILY_HANDOVER_WELCOME_PREFIX = 'handover-daily-welcome-v1';

/** 어두운 호텔 분위기 배경. 같은 날·근무자에게는 항상 같은 장이 나온다. */
export const DAILY_HANDOVER_WELCOME_BACKGROUNDS = [
  '/handover-daily-welcome-01.webp',
  '/handover-daily-welcome-02.webp',
  '/handover-daily-welcome-03.webp',
  '/handover-daily-welcome-04.webp',
  '/handover-daily-welcome-05.webp',
  '/handover-daily-welcome-06.webp',
  '/handover-daily-welcome-07.webp',
] as const;

export function localDateKey(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dailyHandoverWelcomeKey(
  session: Pick<WorkSession, 'group' | 'name'>,
  now = new Date(),
): string {
  return [
    DAILY_HANDOVER_WELCOME_PREFIX,
    localDateKey(now),
    encodeURIComponent(session.group.trim()),
    encodeURIComponent(session.name.trim()),
  ].join(':');
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type DailyHandoverWelcomeVisual = {
  url: (typeof DAILY_HANDOVER_WELCOME_BACKGROUNDS)[number];
  /** 같은 날·근무자에게 고정. 좌우 반전으로 체감 장수를 늘린다. */
  mirrored: boolean;
};

export function pickDailyHandoverWelcomeBackground(
  session: Pick<WorkSession, 'group' | 'name'>,
  now = new Date(),
): DailyHandoverWelcomeVisual {
  const seed = [
    localDateKey(now),
    session.group.trim(),
    session.name.trim(),
  ].join(':');
  const hash = hashSeed(seed);
  const index = hash % DAILY_HANDOVER_WELCOME_BACKGROUNDS.length;
  // 사진 인덱스와 독립된 비트로 반전 여부를 정해, 같은 장이라도 다른 날엔 뒤집힐 수 있게 한다.
  const mirrored = ((hash >>> 16) & 1) === 1;
  return {
    url: DAILY_HANDOVER_WELCOME_BACKGROUNDS[index],
    mirrored,
  };
}

export function hasHandledDailyHandoverWelcome(
  session: Pick<WorkSession, 'group' | 'name'>,
  now = new Date(),
): boolean {
  if (typeof window === 'undefined' || !session.group.trim() || !session.name.trim()) return true;
  try {
    return localStorage.getItem(dailyHandoverWelcomeKey(session, now)) === 'done';
  } catch {
    return true;
  }
}

export function markDailyHandoverWelcomeHandled(
  session: Pick<WorkSession, 'group' | 'name'>,
  now = new Date(),
): void {
  if (typeof window === 'undefined' || !session.group.trim() || !session.name.trim()) return;
  try {
    localStorage.setItem(dailyHandoverWelcomeKey(session, now), 'done');
  } catch {
    // 저장 공간이 막힌 브라우저에서도 화면 이동은 계속 허용한다.
  }
}
