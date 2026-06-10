import {
  COMPLAINT_SLA_FIRST_RESPONSE_MIN,
  COMPLAINT_SLA_RESOLUTION_HOURS,
} from '@/lib/constants';
import type { Card } from '@/lib/handover/types';

export type ComplaintSlaStatus = 'ok' | 'warning' | 'breach' | 'met' | 'na';

export type ComplaintSlaInfo = {
  status: ComplaintSlaStatus;
  label: string;
  phase: 'response' | 'resolution' | 'done';
  elapsedMinutes: number;
  targetMinutes: number;
};

function minutesBetween(from: string, to: Date): number {
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((to.getTime() - start) / 60_000));
}

export function isComplaintCard(card: Pick<Card, 'category'>): boolean {
  return card.category === '컴플레인';
}

export function getComplaintSla(card: Card, now = new Date()): ComplaintSlaInfo | null {
  if (!isComplaintCard(card)) return null;

  const createdAt = card.created_at;
  const firstResponseAt =
    card.first_response_at ||
    (card.card_comments.length
      ? [...card.card_comments].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.created_at
      : null) ||
    (card.card_acknowledgments.length
      ? [...card.card_acknowledgments].sort((a, b) => a.acknowledged_at.localeCompare(b.acknowledged_at))[0]
          ?.acknowledged_at
      : null);

  if (card.column_id === 'done') {
    const resolvedAt = card.updated_at || createdAt;
    const elapsed = minutesBetween(createdAt, new Date(resolvedAt));
    const target = COMPLAINT_SLA_RESOLUTION_HOURS * 60;
    const met = elapsed <= target;
    return {
      status: met ? 'met' : 'breach',
      label: met ? `해결 ${formatDuration(elapsed)}` : `해결 SLA 초과`,
      phase: 'done',
      elapsedMinutes: elapsed,
      targetMinutes: target,
    };
  }

  if (!firstResponseAt) {
    const elapsed = minutesBetween(createdAt, now);
    const target = COMPLAINT_SLA_FIRST_RESPONSE_MIN;
    let status: ComplaintSlaStatus = 'ok';
    if (elapsed > target) status = 'breach';
    else if (elapsed > target * 0.7) status = 'warning';
    return {
      status,
      label:
        status === 'breach'
          ? `1차응답 SLA 초과 (${elapsed}분)`
          : `1차응답 ${target - elapsed}분 남음`,
      phase: 'response',
      elapsedMinutes: elapsed,
      targetMinutes: target,
    };
  }

  const elapsed = minutesBetween(createdAt, now);
  const target = COMPLAINT_SLA_RESOLUTION_HOURS * 60;
  let status: ComplaintSlaStatus = 'ok';
  if (elapsed > target) status = 'breach';
  else if (elapsed > target * 0.75) status = 'warning';
  return {
    status,
    label:
      status === 'breach'
        ? `해결 SLA 초과 (${formatDuration(elapsed)})`
        : `해결 목표 ${COMPLAINT_SLA_RESOLUTION_HOURS}h · 경과 ${formatDuration(elapsed)}`,
    phase: 'resolution',
    elapsedMinutes: elapsed,
    targetMinutes: target,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}
