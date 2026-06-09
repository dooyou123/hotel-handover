import { SHIFTS, WORK_GROUPS, type WorkGroupCode } from '@/lib/constants';

const LEGACY_SHIFT_TO_GROUP: Record<(typeof SHIFTS)[number], WorkGroupCode> = {
  주간: 'A',
  오후: 'B',
  야간: 'C',
};

export function normalizeScheduleGroup(value: string): WorkGroupCode | null {
  const text = value.trim().replace(/조$/u, '').toUpperCase();
  if ((WORK_GROUPS as readonly string[]).includes(text)) return text as WorkGroupCode;
  if ((SHIFTS as readonly string[]).includes(value.trim())) {
    return LEGACY_SHIFT_TO_GROUP[value.trim() as (typeof SHIFTS)[number]];
  }
  return null;
}

export function emptyGroupSchedule(): Record<WorkGroupCode, string[]> {
  return { A: [], B: [], C: [], D: [], E: [] };
}
