import {
  HK_BED_SUFFIXES,
  HK_FLOORS_DESC,
  formatHkRoomNumber,
  isHkBedRoomTarget,
} from '@/lib/housekeeping/rooms';
import {
  hkBedTypeLabel,
  hkExtraBedActionLabel,
  type HousekeepingBedDraft,
  type HousekeepingReport,
  type HousekeepingSpecialDraft,
} from '@/lib/housekeeping/types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '<br />');
}

function formatWorkDateLabel(workDate: string): string {
  const date = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return workDate;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function getHousekeepingExportFilename(workDate: string, ext: string): string {
  return `하우스키핑리포트_${workDate}.${ext}`;
}

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 6mm 7mm;
  }

  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #cbd5e1;
    --panel: #f1f5f9;
    --accent: #15803d;
  }

  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    color: var(--ink);
    background: #fff;
    font-size: 9.5px;
    line-height: 1.25;
  }

  .sheet {
    width: 100%;
    max-width: none;
  }

  .sheet__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom: 2px solid var(--accent);
  }

  .sheet__title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .sheet__subtitle {
    margin: 1px 0 0;
    color: var(--muted);
    font-size: 9px;
  }

  .sheet__meta {
    text-align: right;
    color: var(--muted);
    font-size: 8.5px;
    line-height: 1.35;
    white-space: nowrap;
  }

  .top-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: flex-start;
    margin-bottom: 6px;
  }

  .eb-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 7px;
    border-radius: 6px;
    border: 1px solid var(--line);
    font-size: 8.5px;
    font-weight: 700;
    white-space: nowrap;
  }

  .eb-chip--add { background: #ecfdf5; border-color: #86efac; }
  .eb-chip--remove { background: #fef2f2; border-color: #fecaca; }

  .eb-chip__room { font-size: 10px; font-weight: 800; }
  .eb-chip__action {
    padding: 1px 5px;
    border-radius: 999px;
    font-size: 7.5px;
    color: #fff;
  }
  .eb-chip--add .eb-chip__action { background: #16a34a; }
  .eb-chip--remove .eb-chip__action { background: #dc2626; }

  .note-strip {
    flex: 1 1 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-bottom: 2px;
  }

  .note-strip__item {
    padding: 4px 6px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    font-size: 8.5px;
  }

  .note-strip__label {
    display: block;
    color: var(--muted);
    font-size: 7px;
    font-weight: 700;
    margin-bottom: 1px;
  }

  .note-strip__text {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.3;
  }

  .main-section {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .main-section__head {
    padding: 4px 8px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .main-section__head h2 {
    margin: 0;
    font-size: 10px;
    font-weight: 800;
  }

  .main-section__head p {
    margin: 0;
    color: var(--muted);
    font-size: 7.5px;
  }

  .bed-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .bed-grid th,
  .bed-grid td {
    border: 1px solid var(--line);
    text-align: center;
    vertical-align: middle;
    padding: 0;
  }

  .bed-grid thead th {
    background: #e2e8f0;
    font-size: 8px;
    font-weight: 800;
    padding: 3px 2px;
  }

  .bed-grid tbody th {
    width: 28px;
    background: var(--panel);
    font-size: 8px;
    font-weight: 800;
    padding: 2px 1px;
  }

  .bed-cell {
    padding: 2px 3px;
    height: 1%;
  }

  .bed-cell--add { background: #f0fdf4; }
  .bed-cell--remove { background: #fef2f2; }
  .bed-cell--na {
    background: #f8fafc;
    color: #94a3b8;
    font-size: 7px;
    padding: 3px 2px;
  }

  .bed-cell__no {
    display: block;
    font-size: 9.5px;
    font-weight: 800;
    line-height: 1.1;
  }

  .badge {
    display: inline-block;
    padding: 0 4px;
    border-radius: 999px;
    font-size: 6.5px;
    font-weight: 700;
    line-height: 1.5;
    margin-top: 1px;
  }

  .badge--twin { background: #e0f2fe; color: #0369a1; }
  .badge--triple { background: #fef3c7; color: #b45309; }
  .badge--empty { background: #f1f5f9; color: #94a3b8; }

  .action-pill {
    display: inline-block;
    padding: 0 4px;
    border-radius: 999px;
    font-size: 6px;
    font-weight: 700;
    line-height: 1.5;
    margin-top: 1px;
  }

  .action-pill--add { background: #16a34a; color: #fff; }
  .action-pill--remove { background: #dc2626; color: #fff; }
  .action-pill--keep { background: #e2e8f0; color: #475569; }

  .special-section {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }

  .special-section__head {
    padding: 4px 8px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    font-size: 9px;
    font-weight: 800;
  }

  .special-table {
    width: 100%;
    border-collapse: collapse;
  }

  .special-table th,
  .special-table td {
    border-bottom: 1px solid var(--line);
    padding: 3px 6px;
    text-align: left;
    vertical-align: top;
    font-size: 8.5px;
  }

  .special-table th {
    font-size: 7.5px;
    color: var(--muted);
    font-weight: 700;
    background: #fafbfc;
  }

  .special-table tr:last-child td { border-bottom: 0; }

  .room-no { font-weight: 800; white-space: nowrap; }

  .tag {
    display: inline-block;
    margin: 0 3px 2px 0;
    padding: 1px 5px;
    border-radius: 999px;
    font-size: 7px;
    font-weight: 700;
  }

  .tag--vip { background: #fffbeb; color: #92400e; }
  .tag--long { background: #eff6ff; color: #1d4ed8; }
  .tag--early { background: #f5f3ff; color: #6d28d9; }

  @media print {
    html, body { font-size: 9.5px; }
    .sheet { page-break-inside: avoid; }
    .main-section { page-break-inside: avoid; }
    .bed-grid tr { page-break-inside: avoid; }
    .special-section { page-break-before: auto; }
  }
`;

function bedBadgeHtml(roomType: string): string {
  if (roomType === 'twin') return '<span class="badge badge--twin">트윈</span>';
  if (roomType === 'triple') return '<span class="badge badge--triple">트리플</span>';
  return '<span class="badge badge--empty">미지정</span>';
}

function actionPillHtml(action: string): string {
  if (!action || action === 'keep') {
    return action === 'keep' ? '<span class="action-pill action-pill--keep">유지</span>' : '';
  }
  if (action === 'add') {
    return `<span class="action-pill action-pill--add">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
  }
  if (action === 'remove') {
    return `<span class="action-pill action-pill--remove">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
  }
  return '';
}

function renderBedCellHtml(room: HousekeepingBedDraft | undefined, roomNumber: string): string {
  if (!isHkBedRoomTarget(roomNumber)) {
    return '<td class="bed-cell bed-cell--na">—</td>';
  }

  const action = room?.extra_bed_action ?? '';
  return `
    <td class="bed-cell${action === 'add' ? ' bed-cell--add' : action === 'remove' ? ' bed-cell--remove' : ''}">
      <span class="bed-cell__no">${escapeHtml(roomNumber)}</span>
      ${bedBadgeHtml(room?.room_type ?? '')}
      ${actionPillHtml(action)}
    </td>
  `;
}

function renderBedGridHtml(bedRooms: HousekeepingBedDraft[]): string {
  const byRoom = new Map(bedRooms.map((room) => [room.room_number, room]));

  const body = HK_FLOORS_DESC.map((floor) => {
    const cells = HK_BED_SUFFIXES.map((suffix) => {
      const roomNumber = formatHkRoomNumber(floor, suffix);
      return renderBedCellHtml(byRoom.get(roomNumber), roomNumber);
    }).join('');
    return `<tr><th>${floor}F</th>${cells}</tr>`;
  }).join('');

  return `
    <section class="main-section">
      <div class="main-section__head">
        <h2>트윈 · 트리플 · 엑스트라베드</h2>
        <p>4~13층 02·10·16호 (416·516·1302 제외)</p>
      </div>
      <table class="bed-grid">
        <thead>
          <tr><th>층</th><th>02호</th><th>10호</th><th>16호</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

function renderTopStripHtml(
  report: HousekeepingReport | null,
  bedRooms: HousekeepingBedDraft[],
): string {
  const changes = bedRooms.filter((room) => room.extra_bed_action === 'add' || room.extra_bed_action === 'remove');
  const previousNotes = report?.previous_day_notes?.trim() ?? '';
  const nextDayNotes = report?.next_day_notes?.trim() ?? '';

  if (!changes.length && !previousNotes && !nextDayNotes) return '';

  const chips = changes
    .map((room) => {
      const isAdd = room.extra_bed_action === 'add';
      return `
        <span class="eb-chip eb-chip--${isAdd ? 'add' : 'remove'}">
          <span class="eb-chip__room">${escapeHtml(room.room_number)}</span>
          <span>${escapeHtml(hkBedTypeLabel(room.room_type))}</span>
          <span class="eb-chip__action">${escapeHtml(hkExtraBedActionLabel(room.extra_bed_action))}</span>
        </span>
      `;
    })
    .join('');

  const notesHtml =
    previousNotes || nextDayNotes
      ? `<div class="note-strip">
          ${previousNotes ? `<div class="note-strip__item"><span class="note-strip__label">지난 날 특이</span><p class="note-strip__text">${escapeHtml(previousNotes)}</p></div>` : '<div></div>'}
          ${nextDayNotes ? `<div class="note-strip__item"><span class="note-strip__label">다음 날 특이</span><p class="note-strip__text">${escapeHtml(nextDayNotes)}</p></div>` : '<div></div>'}
        </div>`
      : '';

  return `
    <div class="top-strip">
      ${changes.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;width:100%;margin-bottom:${notesHtml ? '4px' : '0'}"><strong style="font-size:8px;color:var(--muted);margin-right:2px;align-self:center">EB작업</strong>${chips}</div>` : ''}
      ${notesHtml}
    </div>
  `;
}

function renderSpecialRoomsHtml(specialRooms: HousekeepingSpecialDraft[]): string {
  const rows = specialRooms.filter(
    (room) =>
      room.room_number.trim() ||
      room.early_checkin.trim() ||
      room.is_vip ||
      room.is_long_stay ||
      room.notes.trim(),
  );

  if (!rows.length) return '';

  const body = rows
    .map((room) => {
      const tags = [
        room.early_checkin.trim()
          ? `<span class="tag tag--early">일찍체크인 ${escapeHtml(room.early_checkin.trim())}</span>`
          : '',
        room.is_vip ? '<span class="tag tag--vip">VIP</span>' : '',
        room.is_long_stay ? '<span class="tag tag--long">장박</span>' : '',
      ]
        .filter(Boolean)
        .join('');

      return `
        <tr>
          <td class="room-no">${escapeHtml(room.room_number || '—')}</td>
          <td>${tags || '—'}</td>
          <td>${escapeHtml(room.notes || '—')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="special-section">
      <div class="special-section__head">특이 객실 · 일찍 체크인 · VIP · 장박</div>
      <table class="special-table">
        <thead><tr><th style="width:52px">객실</th><th style="width:38%">구분</th><th>비고</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

export function buildHousekeepingPrintHtml(
  report: HousekeepingReport | null,
  bedRooms: HousekeepingBedDraft[],
  specialRooms: HousekeepingSpecialDraft[],
  workDate: string,
  authorLabel: string,
): string {
  const dateLabel = formatWorkDateLabel(workDate);
  const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const changeCount = bedRooms.filter(
    (room) => room.extra_bed_action === 'add' || room.extra_bed_action === 'remove',
  ).length;

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>하우스키핑 리포트 ${workDate}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="sheet">
      <header class="sheet__header">
        <div>
          <h1 class="sheet__title">Housekeeping Report</h1>
          <p class="sheet__subtitle">하우스키핑 전달 리포트</p>
        </div>
        <div class="sheet__meta">
          <div><strong>${escapeHtml(dateLabel)}</strong></div>
          <div>${escapeHtml(authorLabel || '작성자 미입력')}</div>
          <div>출력 ${escapeHtml(now)} · EB ${changeCount}건</div>
        </div>
      </header>
      ${renderTopStripHtml(report, bedRooms)}
      ${renderBedGridHtml(bedRooms)}
      ${renderSpecialRoomsHtml(specialRooms)}
    </div>
  </body>
</html>`;
}

function triggerPrint(doc: Document, win: Window, onDone?: () => void): void {
  const runPrint = () => {
    win.focus();
    win.print();
    onDone?.();
  };

  if (doc.readyState === 'complete') {
    setTimeout(runPrint, 200);
    return;
  }

  win.addEventListener('load', () => setTimeout(runPrint, 200), { once: true });
}

export function openHousekeepingPrintWindow(
  report: HousekeepingReport | null,
  bedRooms: HousekeepingBedDraft[],
  specialRooms: HousekeepingSpecialDraft[],
  workDate: string,
  authorLabel: string,
): boolean {
  const html = buildHousekeepingPrintHtml(report, bedRooms, specialRooms, workDate, authorLabel);

  const popup = window.open('about:blank', '_blank');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    triggerPrint(popup.document, popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '하우스키핑 리포트 인쇄');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWin?.document;
  if (!frameWin || !frameDoc) {
    document.body.removeChild(iframe);
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  triggerPrint(frameDoc, frameWin, () => {
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  });
  return true;
}
