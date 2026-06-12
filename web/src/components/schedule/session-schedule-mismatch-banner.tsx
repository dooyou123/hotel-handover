'use client';

import { formatWorkGroupLabel } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  formatSessionScheduleMismatchMessage,
  getSessionScheduleMismatch,
} from '@/lib/schedule/session-schedule-match';
import { useTodaySchedule } from '@/lib/schedule/use-schedule';

export function SessionScheduleMismatchBanner() {
  const { data: schedule } = useTodaySchedule();
  const { session, persistSession } = useWorkSession();

  const mismatch = getSessionScheduleMismatch(session, schedule);
  if (!mismatch) return null;

  function applyScheduledGroup() {
    persistSession({
      ...session,
      group: mismatch!.scheduledGroup,
      shift: mismatch!.scheduledGroup,
    });
  }

  return (
    <div className="session-schedule-mismatch" role="alert">
      <p className="session-schedule-mismatch__text">{formatSessionScheduleMismatchMessage(mismatch)}</p>
      <button type="button" className="session-schedule-mismatch__action" onClick={applyScheduledGroup}>
        {formatWorkGroupLabel(mismatch.scheduledGroup)}로 맞추기
      </button>
    </div>
  );
}
