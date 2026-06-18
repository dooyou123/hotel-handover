'use client';

import {
  activityPreviewMeta,
  activityPreviewTitle,
  activityPreviewTooltip,
  activityVisual,
} from '@/lib/handover/activity-display';
import { formatAsideRecordTime } from '@/lib/handover/shift-ui-state';
import type { ActivityLog, ShiftHandover } from '@/lib/handover/types';
import type { AsideFeedTab } from '@/lib/handover/shift-ui-state';

export function shiftHandoverTypeLabel(type: ShiftHandover['handover_type']): string {
  return type === 'start' ? '교대 시작' : '교대 종료';
}

function shiftHandoverTitle(record: ShiftHandover): string {
  const parts = [
    record.unacked_urgent > 0 ? `미확인 긴급 ${record.unacked_urgent}` : null,
    record.urgent_count > 0 ? `긴급 ${record.urgent_count}` : null,
    record.progress_count > 0 ? `진행 ${record.progress_count}` : null,
  ].filter(Boolean);
  if (record.notes.trim()) return record.notes.trim().split('\n')[0] ?? record.notes.trim();
  if (parts.length) return parts.join(' · ');
  return shiftHandoverTypeLabel(record.handover_type);
}

function shiftHandoverTooltip(record: ShiftHandover): string {
  const lines = [
    `${shiftHandoverTypeLabel(record.handover_type)} · ${record.shift}`,
    `미확인 긴급 ${record.unacked_urgent} · 긴급 ${record.urgent_count} · 진행 ${record.progress_count}`,
    record.checklist_incomplete > 0 ? `체크리스트 미완료 ${record.checklist_incomplete}` : '',
    record.notes.trim(),
  ].filter(Boolean);
  return lines.join('\n');
}

export function ShiftHandoverRecordItem({ record }: { record: ShiftHandover }) {
  const isStart = record.handover_type === 'start';
  return (
    <article className="activity-item">
      <div className="activity-item__top">
        <span className={`activity-item__badge${isStart ? ' activity-item__badge--create' : ''}`}>
          {shiftHandoverTypeLabel(record.handover_type)}
        </span>
        <span className="activity-item__entity">{record.shift}</span>
        <time className="activity-item__time" dateTime={record.handover_at}>
          {formatAsideRecordTime(record.handover_at)}
        </time>
      </div>
      <p className="activity-item__headline">
        <strong>{record.staff_name || '—'}</strong>
        <span>
          {' '}
          · 미확인 긴급 {record.unacked_urgent} · 긴급 {record.urgent_count} · 진행 {record.progress_count}
          {record.checklist_incomplete > 0 ? ` · 체크리스트 미완료 ${record.checklist_incomplete}` : ''}
        </span>
      </p>
      {record.notes.trim() ? (
        <blockquote className="activity-item__quote">{record.notes.trim()}</blockquote>
      ) : null}
    </article>
  );
}

export function ActivityRecordItem({ log }: { log: ActivityLog }) {
  const target = activityPreviewTitle(log);
  const detail = activityPreviewTooltip(log).split('\n').slice(1).join('\n');
  const visual = activityVisual(log);
  const tone = visual.tone === 'default' ? '' : visual.tone;

  return (
    <article className={`activity-item${tone ? ` activity-item--${tone}` : ''}`}>
      <div className="activity-item__top">
        <span className={`activity-item__badge activity-item__badge--${tone || 'default'}`}>
          {visual.shortLabel}
        </span>
        <time className="activity-item__time" dateTime={log.created_at}>
          {formatAsideRecordTime(log.created_at)}
        </time>
      </div>

      <p className="activity-item__headline">
        <strong>{target}</strong>
      </p>

      <p className="activity-item__meta-line">{activityPreviewMeta(log)}</p>

      {detail ? <blockquote className="activity-item__quote">{detail}</blockquote> : null}
    </article>
  );
}

type PreviewItemProps = {
  onClick?: () => void;
};

export function ShiftHandoverPreviewItem({
  record,
  onClick,
}: PreviewItemProps & { record: ShiftHandover }) {
  const isStart = record.handover_type === 'start';
  const title = shiftHandoverTitle(record);
  const tooltip = shiftHandoverTooltip(record);

  return (
    <li className="aside-records__item">
      <button
        type="button"
        className="aside-records__row"
        title={tooltip}
        onClick={onClick}
      >
        <span
          className={`aside-records__icon aside-records__icon--shift${isStart ? ' aside-records__icon--start' : ' aside-records__icon--end'}`}
          aria-hidden
        >
          {isStart ? '▶' : '■'}
        </span>
        <span className="aside-records__body">
          <span className="aside-records__title">{title}</span>
          <span className="aside-records__meta">
            {record.staff_name || '—'} ({record.shift}) · {formatAsideRecordTime(record.handover_at)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function ActivityPreviewItem({
  log,
  onClick,
}: PreviewItemProps & { log: ActivityLog }) {
  const visual = activityVisual(log);
  const title = activityPreviewTitle(log);
  const tooltip = activityPreviewTooltip(log);

  return (
    <li className="aside-records__item">
      <button
        type="button"
        className="aside-records__row"
        title={tooltip}
        onClick={onClick}
      >
        <span className={`aside-records__icon aside-records__icon--${visual.tone}`} aria-hidden>
          {visual.icon}
        </span>
        <span className="aside-records__body">
          <span className="aside-records__title">{title}</span>
          <span className="aside-records__meta">{activityPreviewMeta(log)}</span>
        </span>
      </button>
    </li>
  );
}

export type PreviewEntry =
  | { kind: 'shift'; at: string; record: ShiftHandover }
  | { kind: 'activity'; at: string; log: ActivityLog };

export function buildTodayRecordTimeline(
  shiftLogs: ShiftHandover[],
  activityLogs: ActivityLog[],
  filter: AsideFeedTab,
): PreviewEntry[] {
  const entries: PreviewEntry[] = [
    ...shiftLogs.map((record) => ({ kind: 'shift' as const, at: record.handover_at, record })),
    ...activityLogs.map((log) => ({ kind: 'activity' as const, at: log.created_at, log })),
  ];

  const sorted = entries.sort((a, b) => b.at.localeCompare(a.at));
  if (filter === 'shift') return sorted.filter((entry) => entry.kind === 'shift');
  if (filter === 'activity') return sorted.filter((entry) => entry.kind === 'activity');
  return sorted;
}

/** @deprecated use buildTodayRecordTimeline */
export function buildTodayRecordPreview(
  shiftLogs: ShiftHandover[],
  activityLogs: ActivityLog[],
  limit = 5,
): PreviewEntry[] {
  return buildTodayRecordTimeline(shiftLogs, activityLogs, 'all').slice(0, limit);
}
