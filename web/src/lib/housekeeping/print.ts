import {
  getEffectiveBedType,
  isBedRoomChangedToday,
  type BedRoomBaseline,
} from '@/lib/housekeeping/baseline';
import {
  HK_BED_SUFFIXES,
  HK_FLOORS_DESC,
  formatHkRoomNumber,
  isHkBedRoomTarget,
} from '@/lib/housekeeping/rooms';
import {
  type HousekeepingBedDraft,
  type HousekeepingReport,
  type HousekeepingSpecialDraft,
  hkBedTypeLabel,
  hkExtraBedActionLabel,
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
    weekday: 'short',
  });
}

export function getHousekeepingExportFilename(workDate: string, ext: string): string {
  return `하우스키핑리포트_${workDate}.${ext}`;
}

export function getChangedBedRooms(
  bedRooms: HousekeepingBedDraft[],
  baseline: BedRoomBaseline = {},
): HousekeepingBedDraft[] {
  return bedRooms
    .filter((room) => isBedRoomChangedToday(room, baseline))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
}

function getFilledSpecialRooms(specialRooms: HousekeepingSpecialDraft[]): HousekeepingSpecialDraft[] {
  return specialRooms.filter(
    (room) =>
      room.room_number.trim() ||
      room.early_checkin.trim() ||
      room.is_vip ||
      room.is_long_stay ||
      room.notes.trim(),
  );
}

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }

  :root {
    --text: #171717;
    --muted: #737373;
    --border: #e5e5e5;
    --surface: #ffffff;
    --surface-2: #fafafa;
    --primary: #166534;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    color: var(--text);
    background: var(--surface);
    font-size: 11px;
    line-height: 1.45;
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
    padding: 12px 20px;
    background: #14532d;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .preview-toolbar__title {
    font-size: 14px;
    font-weight: 700;
  }

  .preview-toolbar__btn {
    padding: 8px 16px;
    border: 0;
    border-radius: 8px;
    background: #fff;
    color: #14532d;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .sheet {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 20px 18px 28px;
  }

  .sheet__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 2px solid var(--primary);
  }

  .sheet__title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .sheet__subtitle {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 12px;
  }

  .sheet__meta {
    text-align: right;
    font-size: 12px;
    line-height: 1.55;
    color: var(--muted);
    flex-shrink: 0;
  }

  .sheet__meta strong {
    display: block;
    color: var(--text);
    font-size: 15px;
    font-weight: 800;
  }

  .summary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .summary-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 12px;
    color: var(--muted);
  }

  .summary-chip strong {
    color: var(--text);
    font-weight: 800;
  }

  .summary-chip--twin {
    border-color: #bae6fd;
    background: #e0f2fe;
    color: #0369a1;
  }

  .summary-chip--triple {
    border-color: #fde68a;
    background: #fef3c7;
    color: #b45309;
  }

  .summary-chip--add {
    border-color: #bbf7d0;
    background: #f0fdf4;
    color: #166534;
  }

  .summary-chip--remove {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }

  .notes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .notes__item {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    min-height: 2.5rem;
  }

  .notes__label {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .notes__text {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .section {
    margin-bottom: 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .section__head {
    padding: 8px 12px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
  }

  .section__head h2 {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 800;
  }

  .section__head p {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }

  .changed-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 12px;
  }

  .room-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    text-align: center;
  }

  .room-card__no {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .pill {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
    white-space: nowrap;
  }

  .pill--twin { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .pill--triple { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .pill--unset { background: var(--surface-2); color: var(--muted); border: 1px dashed var(--border); }
  .pill--dash { color: var(--muted); font-size: 11px; }

  .pill--eb-add { background: #166534; color: #fff; }
  .pill--eb-remove { background: #b91c1c; color: #fff; }
  .pill--eb-keep { background: #e5e5e5; color: #525252; }

  .room-map {
    display: grid;
    grid-template-columns: 2.8rem repeat(3, 1fr);
    gap: 5px;
    padding: 12px;
  }

  .room-map__corner,
  .room-map__colhead,
  .room-map__rowhead {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
  }

  .room-map__rowhead {
    justify-content: flex-end;
    padding-right: 4px;
  }

  .room-map__colhead {
    padding: 4px 2px;
    background: var(--surface-2);
    border-radius: 4px;
  }

  .room-map__cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 52px;
    padding: 4px 2px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-2);
    font-size: 10px;
  }

  .room-map__cell--twin { background: #e0f2fe; border-color: #bae6fd; }
  .room-map__cell--triple { background: #fef3c7; border-color: #fde68a; }
  .room-map__cell--changed { outline: 2px solid var(--primary); outline-offset: -1px; }
  .room-map__cell--na { color: var(--muted); border-style: dashed; background: transparent; }

  .room-map__no {
    font-size: 11px;
    font-weight: 800;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: middle;
    font-size: 12px;
  }

  .data-table th {
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    background: var(--surface);
  }

  .data-table tr:last-child td {
    border-bottom: 0;
  }

  .data-table .col-room {
    width: 4.5rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .tag {
    display: inline-block;
    margin: 0 4px 2px 0;
    padding: 3px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
  }

  .tag--vip { background: #fffbeb; color: #92400e; }
  .tag--long { background: #eff6ff; color: #1d4ed8; }
  .tag--early { background: #f5f3ff; color: #6d28d9; }

  .empty {
    padding: 20px 12px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }

  .sheet__footer {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--muted);
    text-align: center;
  }

  @media screen {
    body {
      background: #f4f4f5;
    }

    .sheet {
      margin-top: 0;
      margin-bottom: 24px;
      background: #fff;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }

  @media (max-width: 560px) {
    .changed-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .notes {
      grid-template-columns: 1fr;
    }
  }

  @media print {
    .preview-toolbar { display: none !important; }
    body { background: #fff; }
    .sheet {
      max-width: none;
      margin: 0;
      padding: 0;
      box-shadow: none;
      border-radius: 0;
    }
    .section { break-inside: avoid; }
    .notes { break-inside: avoid; }
    .changed-grid { grid-template-columns: repeat(3, 1fr); }
  }
`;

function bedTypePillHtml(roomType: string): string {
  if (roomType === 'twin') return '<span class="pill pill--twin">트윈</span>';
  if (roomType === 'triple') return '<span class="pill pill--triple">트리플</span>';
  return '<span class="pill pill--unset">미설정</span>';
}

function extraBedPillHtml(action: string): string {
  if (action === 'add') {
    return `<span class="pill pill--eb-add">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
  }
  if (action === 'remove') {
    return `<span class="pill pill--eb-remove">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
  }
  if (action === 'keep') {
    return `<span class="pill pill--eb-keep">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
  }
  return '';
}

function renderSummaryHtml(bedRooms: HousekeepingBedDraft[], baseline: BedRoomBaseline): string {
  const changed = getChangedBedRooms(bedRooms, baseline);
  const ebAdd = bedRooms.filter((room) => room.extra_bed_action === 'add').length;
  const ebRemove = bedRooms.filter((room) => room.extra_bed_action === 'remove').length;
  const twinCount = bedRooms.filter((room) => getEffectiveBedType(room, baseline) === 'twin').length;
  const tripleCount = bedRooms.filter((room) => getEffectiveBedType(room, baseline) === 'triple').length;

  return `
    <div class="summary-row">
      <span class="summary-chip summary-chip--twin">트윈 <strong>${twinCount}</strong></span>
      <span class="summary-chip summary-chip--triple">트리플 <strong>${tripleCount}</strong></span>
      <span class="summary-chip">오늘 변경 <strong>${changed.length}</strong>건</span>
      ${ebAdd > 0 ? `<span class="summary-chip summary-chip--add">EB 넣음 <strong>${ebAdd}</strong></span>` : ''}
      ${ebRemove > 0 ? `<span class="summary-chip summary-chip--remove">EB 뺌 <strong>${ebRemove}</strong></span>` : ''}
    </div>
  `;
}

function renderNotesHtml(report: HousekeepingReport | null): string {
  const previousNotes = report?.previous_day_notes?.trim() ?? '';
  const nextDayNotes = report?.next_day_notes?.trim() ?? '';
  if (!previousNotes && !nextDayNotes) return '';

  return `
    <div class="notes">
      <div class="notes__item">
        <span class="notes__label">지난 날 특이사항</span>
        <p class="notes__text">${previousNotes ? escapeHtml(previousNotes) : '—'}</p>
      </div>
      <div class="notes__item">
        <span class="notes__label">다음 날 특이사항</span>
        <p class="notes__text">${nextDayNotes ? escapeHtml(nextDayNotes) : '—'}</p>
      </div>
    </div>
  `;
}

function renderChangedBedRoomsHtml(bedRooms: HousekeepingBedDraft[], baseline: BedRoomBaseline): string {
  const changed = getChangedBedRooms(bedRooms, baseline);

  const body = changed.length
    ? changed
        .map((room) => {
          const effectiveType = getEffectiveBedType(room, baseline);
          const eb = extraBedPillHtml(room.extra_bed_action);
          return `
        <div class="room-card">
          <div class="room-card__no">${escapeHtml(room.room_number)}</div>
          ${bedTypePillHtml(effectiveType)}
          ${eb || '<span class="pill pill--dash">EB 변경 없음</span>'}
        </div>
      `;
        })
        .join('')
    : '<p class="empty">오늘 변경된 객실이 없습니다.</p>';

  return `
    <section class="section">
      <div class="section__head">
        <h2>오늘 변경 객실</h2>
        <p>객실번호 · 트윈/트리플 · 엑스트라베드 작업</p>
      </div>
      <div class="changed-grid">${body}</div>
    </section>
  `;
}

function renderRoomMapHtml(bedRooms: HousekeepingBedDraft[], baseline: BedRoomBaseline): string {
  const byRoom = new Map(bedRooms.map((room) => [room.room_number, room]));

  const colHeaders = HK_BED_SUFFIXES.map(
    (suffix) => `<div class="room-map__colhead">${suffix}호</div>`,
  ).join('');

  const rows = HK_FLOORS_DESC.map((floor) => {
    const rowHead = `<div class="room-map__rowhead">${floor}층</div>`;
    const cells = HK_BED_SUFFIXES.map((suffix) => {
      const roomNumber = formatHkRoomNumber(floor, suffix);
      if (!isHkBedRoomTarget(roomNumber)) {
        return '<div class="room-map__cell room-map__cell--na">—</div>';
      }

      const room = byRoom.get(roomNumber);
      if (!room) {
        return '<div class="room-map__cell">—</div>';
      }

      const effectiveType = getEffectiveBedType(room, baseline);
      const changedToday = isBedRoomChangedToday(room, baseline);
      const typeClass =
        effectiveType === 'twin'
          ? ' room-map__cell--twin'
          : effectiveType === 'triple'
            ? ' room-map__cell--triple'
            : '';
      const changedClass = changedToday ? ' room-map__cell--changed' : '';
      const typeLabel = effectiveType ? hkBedTypeLabel(effectiveType) : '—';
      const ebLabel =
        room.extra_bed_action && room.extra_bed_action !== 'keep'
          ? hkExtraBedActionLabel(room.extra_bed_action).replace('엑스트라베드 ', 'EB ')
          : '';

      return `
        <div class="room-map__cell${typeClass}${changedClass}">
          <span class="room-map__no">${escapeHtml(roomNumber)}</span>
          <span class="pill pill--${effectiveType || 'unset'}" style="font-size:9px;padding:2px 6px;">${escapeHtml(typeLabel)}</span>
          ${ebLabel ? `<span style="font-size:8px;font-weight:700;color:#166534;">${escapeHtml(ebLabel)}</span>` : ''}
        </div>
      `;
    }).join('');

    return rowHead + cells;
  }).join('');

  return `
    <section class="section">
      <div class="section__head">
        <h2>전체 객실 맵</h2>
        <p>파란=트윈 · 노란=트리플 · 테두리=오늘 변경</p>
      </div>
      <div class="room-map">
        <div class="room-map__corner"></div>
        ${colHeaders}
        ${rows}
      </div>
    </section>
  `;
}

function renderSpecialRoomsHtml(specialRooms: HousekeepingSpecialDraft[]): string {
  const rows = getFilledSpecialRooms(specialRooms);
  if (!rows.length) return '';

  const body = rows
    .map((room) => {
      const tags = [
        room.early_checkin.trim()
          ? `<span class="tag tag--early">일찍 ${escapeHtml(room.early_checkin.trim())}</span>`
          : '',
        room.is_vip ? '<span class="tag tag--vip">VIP</span>' : '',
        room.is_long_stay ? '<span class="tag tag--long">장박</span>' : '',
      ]
        .filter(Boolean)
        .join('');

      return `
        <tr>
          <td class="col-room">${escapeHtml(room.room_number || '—')}</td>
          <td>${tags || '<span class="pill pill--dash">—</span>'}</td>
          <td>${escapeHtml(room.notes || '—')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="section">
      <div class="section__head">
        <h2>특이 객실</h2>
        <p>${rows.length}건</p>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-room">객실</th>
            <th style="width:38%">구분</th>
            <th>비고</th>
          </tr>
        </thead>
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
  baseline: BedRoomBaseline = {},
): string {
  const dateLabel = formatWorkDateLabel(workDate);
  const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const changedCount = getChangedBedRooms(bedRooms, baseline).length;
  const specialCount = getFilledSpecialRooms(specialRooms).length;

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>하우스키핑 리포트 ${workDate}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="preview-toolbar">
      <span class="preview-toolbar__title">하우스키핑 리포트 · ${escapeHtml(dateLabel)}</span>
      <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
    </div>
    <div class="sheet">
      <header class="sheet__header">
        <div>
          <h1 class="sheet__title">하우스키핑 리포트</h1>
          <p class="sheet__subtitle">4~13층 02·10·16호 · 416·516·1302 제외</p>
        </div>
        <div class="sheet__meta">
          <strong>${escapeHtml(dateLabel)}</strong>
          <div>작성 ${escapeHtml(authorLabel || '미입력')}</div>
          <div>열림 ${escapeHtml(now)} · 변경 ${changedCount}건 · 특이 ${specialCount}건</div>
        </div>
      </header>
      ${renderSummaryHtml(bedRooms, baseline)}
      ${renderNotesHtml(report)}
      ${renderChangedBedRoomsHtml(bedRooms, baseline)}
      ${renderRoomMapHtml(bedRooms, baseline)}
      ${renderSpecialRoomsHtml(specialRooms)}
      <footer class="sheet__footer">hotel-handover · 하우스키핑 전달용</footer>
    </div>
  </body>
</html>`;
}

export function openHousekeepingPrintWindow(
  report: HousekeepingReport | null,
  bedRooms: HousekeepingBedDraft[],
  specialRooms: HousekeepingSpecialDraft[],
  workDate: string,
  authorLabel: string,
  baseline: BedRoomBaseline = {},
): boolean {
  const html = buildHousekeepingPrintHtml(
    report,
    bedRooms,
    specialRooms,
    workDate,
    authorLabel,
    baseline,
  );

  // noopener/noreferrer를 쓰면 브라우저가 window.open 반환값을 null로 만들어
  // 창은 뜨는데 실패로 처리되는 경우가 있습니다. 내용을 써야 하므로 제외합니다.
  const popup = window.open('about:blank', 'housekeeping-report', 'width=820,height=920');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '하우스키핑 리포트');
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
  frameWin.focus();
  frameWin.print();
  setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 1000);
  return true;
}
