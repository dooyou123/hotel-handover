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

function sliceForPrint<T>(items: T[], max: number): { shown: T[]; overflow: number } {
  if (items.length <= max) return { shown: items, overflow: 0 };
  return { shown: items.slice(0, max), overflow: items.length - max };
}

function renderPrintOverflowHtml(count: number): string {
  if (count <= 0) return '';
  return `<p class="section__more">외 ${count}건 — 앱에서 전체 확인</p>`;
}

function renderCompactCardItemHtml(card: Card, warn = false): string {
  const prefix = card.room ? `[${card.room}] ` : '';
  const meta = `${cardStatusLabel(card)} · ${card.author || '—'} · ${formatTime(card.updated_at || card.created_at)}`;
  const next = card.next_action ? ` · 다음: ${escapeHtml(card.next_action)}` : '';
  return `
    <div class="item${warn ? ' item--warn' : ''}">
      <p class="item__line"><strong>${escapeHtml(prefix + card.title)}</strong><span class="item__meta">${escapeHtml(meta)}${next}</span></p>
    </div>
  `;
}

function renderCompactNoticeItemHtml(notice: Notice): string {
  const tags = [notice.is_pinned ? '📌' : '', notice.type === 'change' ? '변경' : '공지']
    .filter(Boolean)
    .join(' ');
  const meta = `${tags || '공지'} · ${notice.author || '—'} · ${formatTime(notice.updated_at || notice.created_at)}`;
  return `
    <div class="item">
      <p class="item__line"><strong>${escapeHtml(notice.content)}</strong><span class="item__meta">${escapeHtml(meta)}</span></p>
    </div>
  `;
}

function renderCompactActivityItemHtml(log: ActivityLog): string {
  const detail = formatActivityDetail(log);
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '—';
  const meta = `${ACTION_LABELS[log.action] || log.action} · ${actor} · ${formatTime(log.created_at)}${detail ? ` · ${detail}` : ''}`;
  return `
    <div class="item">
      <p class="item__line"><strong>${escapeHtml(log.summary)}</strong><span class="item__meta">${escapeHtml(meta)}</span></p>
    </div>
  `;
}

function renderCompactTodoItemHtml(todo: Todo): string {
  const due = todo.due_date
    ? new Date(`${todo.due_date}T00:00:00`).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      })
    : '마감 없음';
  const meta = `${TODO_PRIORITY_LABELS[todo.priority]} · ${due}${todo.linked_card_id ? ' · 연동' : ''}`;
  return `
    <div class="item">
      <p class="item__line"><strong>${escapeHtml(todo.title)}</strong><span class="item__meta">${escapeHtml(meta)}</span></p>
    </div>
  `;
}

function renderCompactTaxiItemHtml(booking: TransportBooking): string {
  const guest = booking.booker_name || booking.guest_name;
  const meta = `${transportStatusLabel(booking.status)}${booking.room_number ? ` · ${booking.room_number}호` : ''}${guest ? ` · ${guest}` : ''}`;
  return `
    <div class="item">
      <p class="item__line"><strong>${escapeHtml(booking.pickup_time.slice(0, 5))} ${escapeHtml(booking.destination || '목적지 미입력')}</strong><span class="item__meta">${escapeHtml(meta)}</span></p>
    </div>
  `;
}

function renderCompactShiftHandoverItemHtml(record: ShiftHandover): string {
  const type = record.handover_type === 'start' ? '시작' : '종료';
  const meta = `미확인 ${record.unacked_urgent} · 긴급 ${record.urgent_count} · 진행 ${record.progress_count} · ${formatTime(record.handover_at)}`;
  return `
    <div class="item">
      <p class="item__line"><strong>[${escapeHtml(type)}] ${escapeHtml(record.shift)} · ${escapeHtml(record.staff_name || '—')}</strong><span class="item__meta">${escapeHtml(meta)}</span></p>
    </div>
  `;
}

function renderPrintCardSectionHtml(
  title: string,
  items: Card[],
  max: number,
  warn = false,
  fullWidth = false,
): string {
  const { shown, overflow } = sliceForPrint(items, max);
  if (!shown.length) return '';
  const itemsHtml = shown
    .map((item) => renderCompactCardItemHtml(item, warn && item.card_acknowledgments.length === 0))
    .join('');
  return `
    <section class="section${warn ? ' section--warn' : ''}${fullWidth ? ' section--full' : ''}">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${itemsHtml}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
}

function renderPrintNoticeSectionHtml(title: string, items: Notice[], max: number): string {
  const { shown, overflow } = sliceForPrint(items, max);
  if (!shown.length) return '';
  return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${shown.map(renderCompactNoticeItemHtml).join('')}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
}

function renderPrintActivitySectionHtml(title: string, items: ActivityLog[], max: number): string {
  const { shown, overflow } = sliceForPrint(items, max);
  if (!shown.length) return '';
  return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${shown.map(renderCompactActivityItemHtml).join('')}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
}

function renderPrintExtrasSectionHtml(
  title: string,
  items: Todo[] | TransportBooking[] | ShiftHandover[],
  max: number,
  kind: 'todo' | 'taxi' | 'shift',
): string {
  if (!items.length) return '';
  let itemsHtml = '';
  if (kind === 'todo') {
    const { shown, overflow } = sliceForPrint(items as Todo[], max);
    if (!shown.length) return '';
    itemsHtml = shown.map(renderCompactTodoItemHtml).join('');
    return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${itemsHtml}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
  }
  if (kind === 'taxi') {
    const { shown, overflow } = sliceForPrint(items as TransportBooking[], max);
    if (!shown.length) return '';
    itemsHtml = shown.map(renderCompactTaxiItemHtml).join('');
    return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${itemsHtml}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
  }
  const { shown, overflow } = sliceForPrint(items as ShiftHandover[], max);
  if (!shown.length) return '';
  itemsHtml = shown.map(renderCompactShiftHandoverItemHtml).join('');
  return `
    <section class="section">
      <h3>${escapeHtml(title)} (${items.length}건)</h3>
      ${itemsHtml}
      ${renderPrintOverflowHtml(overflow)}
    </section>
  `;
}

export function buildA4PrintSectionsHtml(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  extras?: BriefHandoverExtras,
): string {
  const todayTodos = extras?.todayTodos ?? [];
  const pendingTaxi = extras?.pendingTaxi ?? [];
  const todayShiftLogs = extras?.todayShiftLogs ?? [];

  return [
    renderPrintCardSectionHtml('⚠️ 미확인 긴급', data.unackedUrgent, 5, true, true),
    renderPrintCardSectionHtml('🔴 현재 긴급', data.urgentActive, 5),
    renderPrintCardSectionHtml('🟡 현재 진행중', data.progressActive, 4),
    renderPrintCardSectionHtml('⏸ 보류 중', data.holdActive, 3),
    renderPrintExtrasSectionHtml('📋 오늘 할일', todayTodos, 4, 'todo'),
    renderPrintExtrasSectionHtml('🚕 오늘 택시', pendingTaxi, 4, 'taxi'),
    renderPrintExtrasSectionHtml('📒 교대 기록', todayShiftLogs, 3, 'shift'),
    renderPrintNoticeSectionHtml('📢 업무 공지', data.announcements, 3),
    renderPrintNoticeSectionHtml('🔄 업무 변경', data.changes, 3),
    renderPrintCardSectionHtml('✅ 오늘 완료', data.doneToday, 4),
    renderPrintActivitySectionHtml('📝 변경 기록', activityLogs, 4),
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
  @page { size: A4 portrait; margin: 6mm; }

  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #0f172a;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    font-size: 9pt;
    line-height: 1.32;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .preview-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: #1e3a5f;
    color: #fff;
  }

  .preview-toolbar__title { font-size: 13px; font-weight: 700; }

  .preview-toolbar__btn {
    padding: 7px 14px;
    border: 0;
    border-radius: 6px;
    background: #fff;
    color: #1e3a5f;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .sheet {
    width: 100%;
    max-width: 198mm;
    margin: 0 auto;
    padding: 4mm 2mm 2mm;
  }

  .sheet__head h1 {
    margin: 0 0 1mm;
    font-size: 13pt;
    font-weight: 800;
    line-height: 1.15;
  }

  .meta {
    margin: 0 0 2.5mm;
    color: #64748b;
    font-size: 8pt;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5mm;
    margin-bottom: 3mm;
  }

  .stat {
    padding: 1mm 2.5mm;
    border: 0.25mm solid #dbeafe;
    border-radius: 999px;
    background: #f8fafc;
    font-size: 7.5pt;
    white-space: nowrap;
  }

  .stat--warn {
    border-color: #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }

  .sections-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm;
    align-items: start;
  }

  .section {
    margin: 0;
    padding: 1.5mm 2mm;
    border: 0.25mm solid #e2e8f0;
    border-radius: 2mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section--full { grid-column: 1 / -1; }

  .section--warn {
    border-color: #fecaca;
    background: #fff5f5;
  }

  .section--warn h3 { color: #991b1b; }

  h3 {
    margin: 0 0 1.5mm;
    font-size: 8pt;
    font-weight: 800;
    line-height: 1.2;
  }

  .section__more {
    margin: 1mm 0 0;
    color: #94a3b8;
    font-size: 7pt;
    font-style: italic;
  }

  .item {
    padding: 1mm 1.5mm;
    border: 0.2mm solid #e2e8f0;
    border-radius: 1.5mm;
    margin-bottom: 1mm;
    background: #fff;
  }

  .item:last-child { margin-bottom: 0; }

  .item--warn {
    border-color: #fecaca;
    background: #fef2f2;
  }

  .item__line {
    margin: 0;
    font-size: 7.5pt;
    line-height: 1.35;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  .item__line strong { font-weight: 700; }

  .item__meta {
    display: block;
    margin-top: 0.3mm;
    color: #64748b;
    font-size: 7pt;
    font-weight: 400;
  }

  .empty {
    grid-column: 1 / -1;
    color: #64748b;
    text-align: center;
    padding: 8mm 0;
    font-size: 9pt;
  }

  @media print {
    .screen-only { display: none !important; }
    body { margin: 0; }
    .sheet { padding: 0; max-width: none; }
  }
`;

function printWhenReady(targetWindow: Window, onCleanup?: () => void) {
  const runPrint = () => {
    targetWindow.focus();
    targetWindow.print();
    onCleanup?.();
  };

  if (targetWindow.document.readyState === 'complete') {
    requestAnimationFrame(runPrint);
    return;
  }

  targetWindow.addEventListener('load', () => requestAnimationFrame(runPrint), { once: true });
}

export function buildPrintDocumentHtml(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  authorLabel: string,
  extras?: BriefHandoverExtras,
): string {
  const sections = buildA4PrintSectionsHtml(data, activityLogs, extras);
  const content = sections || '<div class="empty">오늘 표시할 업무가 없습니다.</div>';

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>교대 인계 요약</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="preview-toolbar screen-only">
      <span class="preview-toolbar__title">교대 인계 요약 · A4 1장</span>
      <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
    </div>
    <div class="sheet">
      <header class="sheet__head">
        <h1>교대 인계 요약</h1>
        <p class="meta">${escapeHtml(getSummaryMetaLine(authorLabel))}</p>
      </header>
      <div class="stats">${renderSummaryStatsHtml(data)}</div>
      <div class="sections-grid">${content}</div>
    </div>
  </body>
</html>`;
}

export function openSummaryPrintWindow(
  data: ShiftSummaryData,
  activityLogs: ActivityLog[],
  authorLabel: string,
  extras?: BriefHandoverExtras,
): boolean {
  const html = buildPrintDocumentHtml(data, activityLogs, authorLabel, extras);

  const popup = window.open('about:blank', 'shift-handover-summary', 'width=900,height=1100');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    printWhenReady(popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '교대 인계 요약');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWin?.document;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  printWhenReady(frameWin, () => {
    window.setTimeout(() => iframe.remove(), 1000);
  });
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
