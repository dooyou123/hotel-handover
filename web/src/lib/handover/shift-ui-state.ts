import type { ShiftHandover, WorkSession } from '@/lib/handover/types';

export type ShiftWorkbenchState = 'needs_session' | 'needs_start' | 'on_shift';

export function deriveShiftWorkbenchState(
  session: Pick<WorkSession, 'group' | 'name'>,
  todayHandovers: ShiftHandover[],
): ShiftWorkbenchState {
  if (!session.group || !session.name) return 'needs_session';

  const latestMine = todayHandovers
    .filter((record) => record.staff_name === session.name)
    .sort((a, b) => b.handover_at.localeCompare(a.handover_at))[0];

  if (!latestMine || latestMine.handover_type === 'end') return 'needs_start';
  return 'on_shift';
}

export function formatWorkbenchSessionLabel(session: Pick<WorkSession, 'group' | 'name'>): string {
  const parts = formatWorkbenchSessionParts(session);
  if (!parts.ready && !session.name) return '지금 근무 설정 필요';
  if (parts.group) return `${parts.name} (${parts.group})`;
  return parts.name;
}

export function formatWorkbenchSessionParts(session: Pick<WorkSession, 'group' | 'name'>): {
  name: string;
  group: string | null;
  ready: boolean;
} {
  if (!session.name) {
    return { name: '근무자를 설정하세요', group: null, ready: false };
  }
  return {
    name: session.name,
    group: session.group ? `${session.group}조` : null,
    ready: Boolean(session.group),
  };
}

export function formatAsideRecordTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export type AsideFeedTab = 'all' | 'shift' | 'activity';

export const ASIDE_FEED_DISPLAY_LIMIT = 4;
