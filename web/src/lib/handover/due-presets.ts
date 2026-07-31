export type DuePresetConfig = {
  label: string;
  /** 0 = 오늘, 1 = 내일 */
  dayOffset: 0 | 1;
  time: string; // HH:MM
};

export type DuePreset = {
  label: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
};

export const DEFAULT_DUE_PRESETS: DuePresetConfig[] = [
  { label: '오늘 자정', dayOffset: 0, time: '23:59' },
  { label: '오늘 저녁', dayOffset: 0, time: '18:00' },
  { label: '내일 아침', dayOffset: 1, time: '09:00' },
];

export const MAX_DUE_PRESETS = 5;

const STORAGE_KEY = 'handover-due-presets-v1';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 저장된 값 검증 — 형식이 깨졌으면 기본값으로 돌아간다 */
export function sanitizeDuePresets(value: unknown): DuePresetConfig[] {
  if (!Array.isArray(value)) return DEFAULT_DUE_PRESETS;
  const valid = value
    .filter(
      (item): item is DuePresetConfig =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as DuePresetConfig).label === 'string' &&
        (item as DuePresetConfig).label.trim().length > 0 &&
        ((item as DuePresetConfig).dayOffset === 0 || (item as DuePresetConfig).dayOffset === 1) &&
        typeof (item as DuePresetConfig).time === 'string' &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test((item as DuePresetConfig).time),
    )
    .slice(0, MAX_DUE_PRESETS)
    .map((item) => ({ label: item.label.trim().slice(0, 12), dayOffset: item.dayOffset, time: item.time }));
  return valid.length ? valid : DEFAULT_DUE_PRESETS;
}

export function loadDuePresets(): DuePresetConfig[] {
  if (typeof window === 'undefined') return DEFAULT_DUE_PRESETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DUE_PRESETS;
    return sanitizeDuePresets(JSON.parse(raw));
  } catch {
    return DEFAULT_DUE_PRESETS;
  }
}

export function saveDuePresets(configs: DuePresetConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // 저장 실패는 무시 — 기본값으로 계속 동작
  }
}

/** 프리셋 설정을 오늘 날짜 기준의 실제 날짜/시간 값으로 변환 */
export function resolveDuePreset(config: DuePresetConfig, now: Date = new Date()): DuePreset {
  const target = new Date(now);
  target.setDate(target.getDate() + config.dayOffset);
  return {
    label: config.label,
    date: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`,
    time: config.time,
  };
}
