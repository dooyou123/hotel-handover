import { WORK_GROUPS, formatWorkGroupLabel, type WorkGroupCode } from '@/lib/constants';
import type { WorkSession } from '@/lib/handover/types';
import type { TodaySchedule } from '@/lib/schedule/use-schedule';

export type SessionScheduleMismatch = {
  staffName: string;
  sessionGroup: WorkGroupCode;
  scheduledGroup: WorkGroupCode;
};

export function findScheduledGroupForStaff(
  schedule: TodaySchedule,
  staffName: string,
): WorkGroupCode | null {
  const name = staffName.trim();
  if (!name) return null;

  for (const group of WORK_GROUPS) {
    if ((schedule.groups[group] ?? []).some((entry) => entry.trim() === name)) {
      return group;
    }
  }

  return null;
}

export function getSessionScheduleMismatch(
  session: WorkSession,
  schedule: TodaySchedule | undefined,
): SessionScheduleMismatch | null {
  if (!session.group || !session.name.trim() || !schedule) return null;

  const scheduledGroup = findScheduledGroupForStaff(schedule, session.name);
  if (!scheduledGroup || scheduledGroup === session.group) return null;

  return {
    staffName: session.name.trim(),
    sessionGroup: session.group as WorkGroupCode,
    scheduledGroup,
  };
}

export function formatSessionScheduleMismatchMessage(mismatch: SessionScheduleMismatch): string {
  return `지금 근무는 ${formatWorkGroupLabel(mismatch.sessionGroup)}인데, 오늘 근무표에는 ${formatWorkGroupLabel(mismatch.scheduledGroup)}로 등록되어 있습니다.`;
}
