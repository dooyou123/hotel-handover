import type { WorkSession } from '@/lib/handover/types';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

// v2: 조를 키에서 제외 — 같은 사람이 조만 바꿔 접속해도 다시 뜨지 않게 이름+날짜만 쓴다
export const DAILY_HANDOVER_WELCOME_PREFIX = 'handover-daily-welcome-v2';

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

export function dailyHandoverWelcomeKey(staffName: string, now = new Date()): string {
  return [
    DAILY_HANDOVER_WELCOME_PREFIX,
    localDateKey(now),
    encodeURIComponent(staffName.trim()),
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

function readLocalWelcomeHandled(staffName: string, now = new Date()): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(dailyHandoverWelcomeKey(staffName, now)) === 'done';
  } catch {
    return true;
  }
}

function writeLocalWelcomeHandled(staffName: string, now = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(dailyHandoverWelcomeKey(staffName, now), 'done');
  } catch {
    // 저장 공간이 막힌 브라우저에서도 화면 이동은 계속 허용한다.
  }
}

function isSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST205') return true;
  return /does not exist/i.test(error.message ?? '');
}

/**
 * 오늘 이 이름으로 웰컴 화면을 이미 확인했는지 — DB(daily_welcome_acks)가 기준.
 * PC 4대 어디서 확인했든 한 번만 뜬다. localStorage는 같은 기기 재방문용 빠른 경로.
 */
export async function fetchDailyHandoverWelcomeHandled(
  staffName: string,
  now = new Date(),
): Promise<boolean> {
  const name = staffName.trim();
  if (!name) return true;
  if (readLocalWelcomeHandled(name, now)) return true;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_welcome_acks')
      .select('staff_name')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('date_key', localDateKey(now))
      .eq('staff_name', name)
      .maybeSingle();
    if (error) {
      if (isSchemaMissing(error)) return false;
      throw error;
    }
    if (data) writeLocalWelcomeHandled(name, now);
    return Boolean(data);
  } catch {
    // 네트워크 오류 등 — 이 기기의 로컬 기록(false)에 따라 화면을 띄우고,
    // 확인 시 로컬에라도 저장돼 반복 표시는 막힌다.
    return false;
  }
}

/** 확인 상태를 DB에 기록. 실패해도 로컬 기록으로 이 기기에서의 반복 표시는 막는다. */
export async function markDailyHandoverWelcomeHandled(
  staffName: string,
  now = new Date(),
): Promise<void> {
  const name = staffName.trim();
  if (!name) return;
  writeLocalWelcomeHandled(name, now);
  try {
    const supabase = createClient();
    await supabase.from('daily_welcome_acks').upsert(
      { hotel_id: DEFAULT_HOTEL_ID, date_key: localDateKey(now), staff_name: name },
      { onConflict: 'hotel_id,date_key,staff_name', ignoreDuplicates: true },
    );
  } catch {
    // DB 기록 실패는 무시 — 다른 기기에서 한 번 더 뜰 수 있을 뿐 동작엔 지장 없다.
  }
}
