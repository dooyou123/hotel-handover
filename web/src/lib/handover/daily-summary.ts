import { ACTION_LABELS } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import { COLUMN_LABELS } from '@/lib/handover/constants';
import {
  cardStatusLabel,
  formatActivityDetail,
  getTodayLabel,
  type ShiftSummaryData,
} from '@/lib/handover/shift-summary';
import type { ActivityLog, Card, Notice, ShiftHandover } from '@/lib/handover/types';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { transportStatusLabel, type TransportBooking } from '@/lib/transport/types';

export type BriefHandoverExtras = {
  todayTodos?: Todo[];
  pendingTaxi?: TransportBooking[];
  todayShiftLogs?: ShiftHandover[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function getSummaryMetaLine(authorLabel: string): string {
  const now = new Date();
  const sessionLabel = authorLabel || '근무자 미선택';
  return `${getTodayLabel()} · ${sessionLabel} · ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function getExportFilename(ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `인수인계_${date}.${ext}`;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderSummaryCardText(card: Card): string {
  const lines: string[] = [];
  const prefix = card.room ? `[${card.room}] ` : '';
  lines.push(`- ${prefix}${card.title}`);
  lines.push(`  ${cardStatusLabel(card)}`);
  if (card.details.trim()) lines.push(`  상세: ${card.details.trim()}`);
  if (card.next_action) lines.push(`  다음: ${card.next_action}`);
  lines.push(`  ${card.author || '작성자 미입력'} · ${formatTime(card.updated_at || card.created_at)}`);
  return lines.join('\n');
}

function renderSummaryNoticeText(notice: Notice): string {
  const tags = [notice.is_pinned ? '📌 고정' : '', notice.type === 'change' ? '변경' : '공지']
    .filter(Boolean)
    .join(' · ');
  return [
    `- ${notice.content}`,
    `  ${tags || '공지'} · ${notice.author || '작성자 미입력'} · ${formatTime(notice.updated_at || notice.created_at)}`,
  ].join('\n');
}

function renderSummaryActivityText(log: ActivityLog): string {
  const detail = formatActivityDetail(log);
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
  return `- [${ACTION_LABELS[log.action] || log.action}] ${log.summary}\n  ${actor} · ${formatTime(log.created_at)}${detail ? ` · ${detail}` : ''}`;
}

function renderSummaryTodoText(todo: Todo): string {
  const due = todo.due_date
    ? new Date(`${todo.due_date}T00:00:00`).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      })
    : '마감 없음';
  return [
    `- ${todo.title}`,
    `  ${TODO_PRIORITY_LABELS[todo.priority]} · ${due}${todo.linked_card_id ? ' · 인수인계 연동' : ''}`,
  ].join('\n');
}

function renderSummaryShiftHandoverText(record: ShiftHandover): string {
  const type = record.handover_type === 'start' ? '교대 시작' : '교대 종료';
  return [
    `- [${type}] ${record.shift} · ${record.staff_name || '—'}`,
    `  미확인 긴급 ${record.unacked_urgent} · 긴급 ${record.urgent_count} · 진행 ${record.progress_count} · ${formatTime(record.handover_at)}`,
    record.notes.trim() ? `  메모: ${record.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderSummaryTaxiText(booking: TransportBooking): string {
  const guest = booking.booker_name || booking.guest_name;
  return [
    `- ${booking.pickup_time.slice(0, 5)} ${booking.destination || '목적지 미입력'}`,
    `  ${transportStatusLabel(booking.status)}${booking.room_number ? ` · ${booking.room_number}호` : ''}${guest ? ` · ${guest}` : ''}`,
  ].join('\n');
}

export function buildSummaryText(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  authorLabel: string,
  extras?: BriefHandoverExtras,
): string {
  const todayTodos = extras?.todayTodos ?? [];
  const pendingTaxi = extras?.pendingTaxi ?? [];
  const todayShiftLogs = extras?.todayShiftLogs ?? [];

  const sections: [string, unknown[], (item: never) => string][] = [
    ['⚠️ 미확인 긴급', data.unackedUrgent, renderSummaryCardText as (item: never) => string],
    ['🔴 현재 긴급', data.urgentActive, renderSummaryCardText as (item: never) => string],
    ['🟡 현재 진행중', data.progressActive, renderSummaryCardText as (item: never) => string],
    ['⏸ 보류 중', data.holdActive, renderSummaryCardText as (item: never) => string],
    ['📋 오늘 할일 (미완료)', todayTodos, renderSummaryTodoText as (item: never) => string],
    ['🚕 오늘 택시 (미완료)', pendingTaxi, renderSummaryTaxiText as (item: never) => string],
    ['📒 오늘 교대 기록', todayShiftLogs, renderSummaryShiftHandoverText as (item: never) => string],
    ['📢 업무 공지', data.announcements, renderSummaryNoticeText as (item: never) => string],
    ['🔄 업무 변경', data.changes, renderSummaryNoticeText as (item: never) => string],
    ['✅ 오늘 완료', data.doneToday, renderSummaryCardText as (item: never) => string],
    ['📝 오늘 변경 기록', activityLogs, renderSummaryActivityText as (item: never) => string],
  ];

  const lines = [
    '프런트 인수인계 일일 요약',
    getSummaryMetaLine(authorLabel),
    '',
    '[요약]',
    `미확인 긴급 ${data.unackedUrgent.length}건 · 긴급 ${data.urgentActive.length}건 · 진행중 ${data.progressActive.length}건 · 보류 ${data.holdActive.length}건 · 할일 ${todayTodos.length}건 · 택시 ${pendingTaxi.length}건 · 오늘 완료 ${data.doneToday.length}건`,
    '',
  ];

  sections.forEach(([title, items, formatter]) => {
    if (!items.length) return;
    lines.push(`${title} (${items.length}건)`);
    items.forEach((item) => lines.push(formatter(item as never)));
    lines.push('');
  });

  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length <= 6) lines.push('표시할 업무가 없습니다.');

  return lines.join('\n');
}

function renderShiftSummaryItemHtml(card: Card, warn = false): string {
  const prefix = card.room ? `[${card.room}] ` : '';
  return `
    <div class="item${warn ? ' item--warn' : ''}">
      <p class="item__title">${escapeHtml(prefix + card.title)}</p>
      <p class="item__meta">${escapeHtml(cardStatusLabel(card))} · ${escapeHtml(card.author || '작성자 미입력')} · ${formatTime(card.updated_at || card.created_at)}</p>
      ${card.next_action ? `<p class="item__meta">다음: ${escapeHtml(card.next_action)}</p>` : ''}
    </div>
  `;
}

function renderShiftNoticeItemHtml(notice: Notice): string {
  const tags = [notice.is_pinned ? '📌 고정' : '', notice.type === 'change' ? '변경' : '공지']
    .filter(Boolean)
    .join(' · ');
  return `
    <div class="item">
      <p class="item__title">${escapeHtml(notice.content)}</p>
      <p class="item__meta">${escapeHtml(tags || '공지')} · ${escapeHtml(notice.author || '작성자 미입력')} · ${formatTime(notice.updated_at || notice.created_at)}</p>
    </div>
  `;
}

function renderShiftActivityItemHtml(log: ActivityLog): string {
  const detail = formatActivityDetail(log);
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
  return `
    <div class="item">
      <p class="item__title">${escapeHtml(log.summary)}</p>
      <p class="item__meta">${escapeHtml(ACTION_LABELS[log.action] || log.action)} · ${escapeHtml(actor)} · ${formatTime(log.created_at)}${detail ? ` · ${escapeHtml(detail)}` : ''}</p>
    </div>
  `;
}

function renderShiftSectionHtml(
  title: string,
  subtitle: string,
  items: Array<Card | Notice | ActivityLog>,
  warn = false,
): string {
  if (!items.length) return '';

  const itemsHtml = items
    .map((item) => {
      if ('column_id' in item) return renderShiftSummaryItemHtml(item, warn && item.card_acknowledgments.length === 0);
      if ('summary' in item) return renderShiftActivityItemHtml(item);
      return renderShiftNoticeItemHtml(item);
    })
    .join('');

  return `
    <section class="section${warn ? ' section--warn' : ''}">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${subtitle ? `<p class="section__sub">${escapeHtml(subtitle)}</p>` : ''}
      ${itemsHtml}
    </section>
  `;
}

function renderShiftTodoItemHtml(todo: Todo): string {
  const due = todo.due_date
    ? new Date(`${todo.due_date}T00:00:00`).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      })
    : '마감 없음';
  return `
    <div class="item">
      <p class="item__title">${escapeHtml(todo.title)}</p>
      <p class="item__meta">${escapeHtml(TODO_PRIORITY_LABELS[todo.priority])} · ${escapeHtml(due)}${todo.linked_card_id ? ' · 인수인계 연동' : ''}</p>
    </div>
  `;
}

function renderShiftTaxiItemHtml(booking: TransportBooking): string {
  const guest = booking.booker_name || booking.guest_name;
  return `
    <div class="item">
      <p class="item__title">${escapeHtml(booking.pickup_time.slice(0, 5))} ${escapeHtml(booking.destination || '목적지 미입력')}</p>
      <p class="item__meta">${escapeHtml(transportStatusLabel(booking.status))}${booking.room_number ? ` · ${escapeHtml(booking.room_number)}호` : ''}${guest ? ` · ${escapeHtml(guest)}` : ''}</p>
    </div>
  `;
}

function renderShiftHandoverItemHtml(record: ShiftHandover): string {
  const type = record.handover_type === 'start' ? '교대 시작' : '교대 종료';
  return `
    <div class="item">
      <p class="item__title">[${escapeHtml(type)}] ${escapeHtml(record.shift)} · ${escapeHtml(record.staff_name || '—')}</p>
      <p class="item__meta">미확인 긴급 ${record.unacked_urgent} · 긴급 ${record.urgent_count} · 진행 ${record.progress_count} · ${formatTime(record.handover_at)}</p>
      ${record.notes.trim() ? `<p class="item__meta">${escapeHtml(record.notes.trim())}</p>` : ''}
    </div>
  `;
}

function renderShiftExtrasSectionHtml(
  title: string,
  subtitle: string,
  items: Todo[] | TransportBooking[] | ShiftHandover[],
  kind: 'todo' | 'taxi' | 'shift',
): string {
  if (!items.length) return '';
  const itemsHtml = items
    .map((item) => {
      if (kind === 'todo') return renderShiftTodoItemHtml(item as Todo);
      if (kind === 'taxi') return renderShiftTaxiItemHtml(item as TransportBooking);
      return renderShiftHandoverItemHtml(item as ShiftHandover);
    })
    .join('');
  return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${subtitle ? `<p class="section__sub">${escapeHtml(subtitle)}</p>` : ''}
      ${itemsHtml}
    </section>
  `;
}

export function buildSummarySectionsHtml(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  extras?: BriefHandoverExtras,
): string {
  const todayTodos = extras?.todayTodos ?? [];
  const pendingTaxi = extras?.pendingTaxi ?? [];
  const todayShiftLogs = extras?.todayShiftLogs ?? [];

  return [
    renderShiftSectionHtml(
      '⚠️ 미확인 긴급',
      '교대 시작 후 카드에서 ✓ 긴급 확인을 눌러 주세요.',
      data.unackedUrgent,
      true,
    ),
    renderShiftSectionHtml('🔴 현재 긴급', '긴급 칸에 남아 있는 업무입니다.', data.urgentActive),
    renderShiftSectionHtml('🟡 현재 진행중', '진행중 칸의 업무입니다.', data.progressActive),
    renderShiftSectionHtml('⏸ 보류 중', '대기 중인 업무입니다.', data.holdActive),
    renderShiftExtrasSectionHtml('📋 오늘 할일 (미완료)', '오늘 처리할 열린 할일입니다.', todayTodos, 'todo'),
    renderShiftExtrasSectionHtml('🚕 오늘 택시 (미완료)', '오늘 픽업 예정·미완료 건입니다.', pendingTaxi, 'taxi'),
    renderShiftExtrasSectionHtml(
      '📒 오늘 교대 기록',
      '교대 시작·종료 시 저장된 인수·마감 스냅샷입니다.',
      todayShiftLogs,
      'shift',
    ),
    renderShiftSectionHtml(
      '📢 업무 공지',
      data.pinnedAnnouncements.length > 0 ? `고정 공지 ${data.pinnedAnnouncements.length}건 포함` : '',
      data.announcements,
    ),
    renderShiftSectionHtml('🔄 업무 변경', '운영·절차 변경 사항입니다.', data.changes),
    renderShiftSectionHtml('✅ 오늘 완료', '오늘 처리 완료된 업무입니다.', data.doneToday),
    renderShiftSectionHtml('📝 오늘 변경 기록', '추가 · 수정 · 삭제 · 이동 내역입니다.', activityLogs),
  ]
    .filter(Boolean)
    .join('');
}

export function renderSummaryStatsHtml(data: ShiftSummaryData): string {
  return [
    data.unackedUrgent.length > 0
      ? `<span class="stat stat--warn">⚠️ 미확인 긴급 <strong>${data.unackedUrgent.length}</strong>건</span>`
      : '',
    `<span class="stat">🔴 긴급 <strong>${data.urgentActive.length}</strong>건</span>`,
    `<span class="stat">🟡 진행중 <strong>${data.progressActive.length}</strong>건</span>`,
    data.holdActive.length > 0
      ? `<span class="stat">⏸ 보류 <strong>${data.holdActive.length}</strong>건</span>`
      : '',
    `<span class="stat">📋 오늘 업무 <strong>${data.todayCards.length}</strong>건</span>`,
    `<span class="stat">✅ 오늘 완료 <strong>${data.doneToday.length}</strong>건</span>`,
  ]
    .filter(Boolean)
    .join('');
}

const PRINT_STYLES = `
  body { font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif; color: #0f172a; margin: 24px; }
  h1 { margin: 0 0 6px; font-size: 1.35rem; }
  .meta { margin: 0 0 18px; color: #64748b; font-size: 0.92rem; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .stat { padding: 8px 12px; border: 1px solid #dbeafe; border-radius: 999px; background: #f8fafc; font-size: 0.86rem; }
  .stat--warn { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section--warn h3 { color: #991b1b; }
  h3 { margin: 0 0 8px; font-size: 1rem; }
  .section__sub { margin: 0 0 8px; color: #64748b; font-size: 0.82rem; }
  .item { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; }
  .item--warn { border-color: #fecaca; background: #fef2f2; }
  .item__title { margin: 0 0 4px; font-weight: 600; line-height: 1.45; }
  .item__meta { margin: 0; color: #64748b; font-size: 0.82rem; }
  .empty { color: #64748b; text-align: center; padding: 24px 0; }
  @media print { body { margin: 12mm; } }
`;

export function buildPrintDocumentHtml(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  authorLabel: string,
  extras?: BriefHandoverExtras,
): string {
  const sections = buildSummarySectionsHtml(data, activityLogs, extras);
  const content = sections || '<div class="empty">오늘 표시할 업무가 없습니다.</div>';

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>프런트 인수인계 일일 요약</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <h1>프런트 인수인계 일일 요약</h1>
    <p class="meta">${escapeHtml(getSummaryMetaLine(authorLabel))}</p>
    <div class="stats">${renderSummaryStatsHtml(data)}</div>
    ${content}
  </body>
</html>`;
}

export function openSummaryPrintWindow(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  authorLabel: string,
  extras?: BriefHandoverExtras,
): boolean {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildPrintDocumentHtml(data, activityLogs, authorLabel, extras));
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
  return true;
}

export function hasSummaryContent(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  extras?: BriefHandoverExtras,
): boolean {
  return (
    data.unackedUrgent.length > 0 ||
    data.urgentActive.length > 0 ||
    data.progressActive.length > 0 ||
    data.holdActive.length > 0 ||
    (extras?.todayTodos?.length ?? 0) > 0 ||
    (extras?.pendingTaxi?.length ?? 0) > 0 ||
    (extras?.todayShiftLogs?.length ?? 0) > 0 ||
    data.announcements.length > 0 ||
    data.changes.length > 0 ||
    data.doneToday.length > 0 ||
    activityLogs.length > 0
  );
}

export { COLUMN_LABELS };
