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
  HK_STATUS_NOTE_FIELDS,
  formatBedTypeChangedAt,
  hasAnyStatusNotes,
  hkBedTypeLabel,
  hkExtraBedActionLabel,
  mapStatusNotesFromReport,
  type HousekeepingBedDraft,
  type HousekeepingReport,
  type HousekeepingSpecialDraft,
  type HkBedType,
  type HkExtraBedAction,
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
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}

export function getHousekeepingExportFilename(workDate: string, ext: string): string {
  return `하우스키핑전달_${workDate}.${ext}`;
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

const PRINT_OVERRIDES = `
  @page { size: A4 portrait; margin: 6mm 7mm; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-size: 9px;
    line-height: 1.25;
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
    background: #14532d;
    color: #fff;
  }

  .preview-toolbar__title { font-size: 13px; font-weight: 700; }

  .preview-toolbar__btn {
    padding: 7px 14px;
    border: 0;
    border-radius: 6px;
    background: #fff;
    color: #14532d;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  /* A4 1장 압축 — HK 보기 화면은 그대로, 인쇄만 축소 */
  .hk-dash--print-a4 {
    gap: 0.3rem !important;
    padding: 8px 10px 6px !important;
  }

  .hk-dash--print-a4 .hk-dash__hero {
    padding: 0.35rem 0.5rem !important;
    gap: 0.35rem !important;
  }

  .hk-dash--print-a4 .hk-dash__eyebrow {
    font-size: 0.62rem !important;
    margin-bottom: 0 !important;
  }

  .hk-dash--print-a4 .hk-dash__title {
    font-size: 1rem !important;
  }

  .hk-dash--print-a4 .hk-dash__stat {
    padding: 0.15rem 0.4rem !important;
    font-size: 0.68rem !important;
  }

  .hk-dash--print-a4 .hk-dash__section-head {
    padding: 0.25rem 0.45rem 0.2rem !important;
  }

  .hk-dash--print-a4 .hk-dash__section-head h3 {
    font-size: 0.82rem !important;
    margin-bottom: 0 !important;
  }

  .hk-dash--print-a4 .hk-dash__section-head p,
  .hk-dash--print-a4 .hk-dash__legend {
    font-size: 0.62rem !important;
  }

  .hk-dash--print-a4 .hk-dash__legend--inline {
    margin-top: 0.15rem !important;
    gap: 0.35rem 0.55rem !important;
  }

  .hk-dash--print-a4 .hk-dash__changed-grid {
    grid-template-columns: repeat(auto-fill, minmax(6.8rem, 1fr)) !important;
    gap: 0.3rem !important;
    padding: 0.35rem 0.45rem 0.4rem !important;
  }

  .hk-dash--print-a4 .hk-room-card {
    padding: 0.3rem 0.35rem !important;
    gap: 0.2rem !important;
  }

  .hk-dash--print-a4 .hk-room-card__number {
    font-size: 0.88rem !important;
  }

  .hk-dash--print-a4 .hk-type-badge--lg {
    padding: 0.1rem 0.35rem !important;
    font-size: 0.62rem !important;
  }

  .hk-dash--print-a4 .hk-eb-badge--md {
    padding: 0.08rem 0.3rem !important;
    font-size: 0.58rem !important;
  }

  .hk-dash--print-a4 .hk-room-card__changed-at {
    font-size: 0.58rem !important;
    margin-top: 0 !important;
  }

  .hk-dash--print-a4 .hk-dash__empty {
    margin: 0.35rem 0.45rem !important;
    padding: 0.45rem !important;
    font-size: 0.72rem !important;
  }

  /* 객실 맵: 셀 높이 ~45% (4.5rem → 2rem) */
  .hk-dash--print-a4 .hk-dash__map-wrap {
    padding: 0.3rem 0.4rem 0.35rem !important;
  }

  .hk-dash--print-a4 .hk-dash__map {
    grid-template-columns: 1.6rem repeat(3, minmax(0, 1fr)) !important;
    gap: 0.12rem !important;
  }

  .hk-dash--print-a4 .hk-dash__map-colhead,
  .hk-dash--print-a4 .hk-dash__map-rowhead {
    font-size: 0.58rem !important;
    padding: 0.1rem !important;
  }

  .hk-dash--print-a4 .hk-dash__map-cell {
    min-height: 0 !important;
    height: 2rem !important;
    padding: 0.08rem 0.05rem !important;
    gap: 0 !important;
    border-radius: 2px !important;
  }

  .hk-dash--print-a4 .hk-dash__map-room {
    font-size: 0.62rem !important;
    font-weight: 800;
    line-height: 1 !important;
  }

  .hk-dash--print-a4 .hk-map-type {
    font-size: 0.52rem !important;
    font-weight: 800;
    line-height: 1 !important;
  }

  .hk-dash--print-a4 .hk-map-type--twin { color: #0369a1; }
  .hk-dash--print-a4 .hk-map-type--triple { color: #b45309; }
  .hk-dash--print-a4 .hk-map-type--unset { color: #a3a3a3; }

  .hk-dash--print-a4 .hk-dash__map-cell--changed {
    outline-width: 1.5px !important;
  }

  .hk-dash--print-a4 .hk-status-notes {
    padding: 0.3rem 0.4rem 0.35rem !important;
    gap: 0.3rem 0.45rem !important;
  }

  .hk-dash--print-a4 .hk-status-notes__item {
    padding: 0.3rem 0.4rem !important;
  }

  .hk-dash--print-a4 .hk-status-notes__item h4 {
    font-size: 0.62rem !important;
    margin-bottom: 0.15rem !important;
  }

  .hk-dash--print-a4 .hk-status-notes__item p {
    font-size: 0.68rem !important;
    line-height: 1.3 !important;
  }

  .hk-dash--print-a4 .hk-dash__special-list {
    padding: 0.3rem 0.4rem 0.35rem !important;
    gap: 0.25rem !important;
  }

  .hk-dash--print-a4 .hk-dash__special-card {
    padding: 0.3rem 0.4rem !important;
  }

  .hk-dash--print-a4 .hk-dash__special-card strong {
    font-size: 0.78rem !important;
    margin-bottom: 0.15rem !important;
  }

  .hk-dash--print-a4 .hk-dash__special-card p {
    font-size: 0.68rem !important;
    margin-top: 0.2rem !important;
  }

  .hk-dash--print-a4 .hk-dash__tag {
    font-size: 0.58rem !important;
    padding: 0.05rem 0.35rem !important;
  }

  .hk-dash--print-a4 .hk-dash__notes {
    padding: 0.3rem 0.4rem 0.35rem !important;
    gap: 0.3rem !important;
  }

  .hk-dash--print-a4 .hk-dash__notes article {
    padding: 0.3rem 0.4rem !important;
  }

  .hk-dash--print-a4 .hk-dash__notes h4 {
    font-size: 0.62rem !important;
    margin-bottom: 0.15rem !important;
  }

  .hk-dash--print-a4 .hk-dash__notes p {
    font-size: 0.68rem !important;
    line-height: 1.3 !important;
  }

  @media screen {
    body { background: #f4f4f5; }
    .hk-dash--print-a4 {
      max-width: 52rem;
      margin: 0 auto 24px;
      background: #fff;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    }
  }

  @media print {
    .preview-toolbar { display: none !important; }
    .hk-dash--print-a4 { padding: 0 !important; }
  }
`;

function mapTypeCompactHtml(type: HkBedType): string {
  if (type === 'twin') return '<span class="hk-map-type hk-map-type--twin">트</span>';
  if (type === 'triple') return '<span class="hk-map-type hk-map-type--triple">삼</span>';
  return '<span class="hk-map-type hk-map-type--unset">—</span>';
}

function bedTypeBadgeHtml(type: HkBedType, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const label = type ? hkBedTypeLabel(type) : '미설정';
  const classes = [
    'hk-type-badge',
    `hk-type-badge--${size}`,
    type === 'twin' ? 'hk-type-badge--twin' : '',
    type === 'triple' ? 'hk-type-badge--triple' : '',
    !type ? 'hk-type-badge--unset' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<span class="${classes}">${escapeHtml(label)}</span>`;
}

function ebBadgeHtml(action: HkExtraBedAction, size: 'sm' | 'md' = 'sm'): string {
  if (!action) return '';
  const classes = [
    'hk-eb-badge',
    `hk-eb-badge--${size}`,
    action === 'add' ? 'hk-eb-badge--add' : '',
    action === 'remove' ? 'hk-eb-badge--remove' : '',
    action === 'keep' ? 'hk-eb-badge--keep' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<span class="${classes}">${escapeHtml(hkExtraBedActionLabel(action))}</span>`;
}

function renderChangedRoomCardHtml(
  room: HousekeepingBedDraft,
  effectiveType: HkBedType,
): string {
  const changedAt = formatBedTypeChangedAt(room.bed_type_changed_at);
  return `
    <article class="hk-room-card">
      <div class="hk-room-card__head">
        <span class="hk-room-card__number">${escapeHtml(room.room_number)}</span>
        ${bedTypeBadgeHtml(effectiveType, 'lg')}
      </div>
      <div class="hk-room-card__body">
        ${ebBadgeHtml(room.extra_bed_action, 'md')}
        ${changedAt ? `<p class="hk-room-card__changed-at">변경 요청 ${escapeHtml(changedAt)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderStatusNotesHtml(report: HousekeepingReport | null): string {
  const notes = mapStatusNotesFromReport(report);
  if (!hasAnyStatusNotes(notes)) return '';

  const items = HK_STATUS_NOTE_FIELDS.filter((field) => notes[field.key].trim())
    .map(
      (field) => `
      <article class="hk-status-notes__item">
        <h4>${escapeHtml(field.label)}</h4>
        <p>${escapeHtml(notes[field.key])}</p>
      </article>
    `,
    )
    .join('');

  return `
    <section class="hk-dash__section">
      <div class="hk-dash__section-head">
        <h3>객실 상태 · 전달</h3>
        <p>H/U · Comp · VIP · O.O · 장기 숙박 · 정비 유의 · 퇴근 후 DELIVERY</p>
      </div>
      <div class="hk-status-notes hk-status-notes--readonly">${items}</div>
    </section>
  `;
}

function renderSpecialRoomsHtml(specialRooms: HousekeepingSpecialDraft[]): string {
  const rows = getFilledSpecialRooms(specialRooms);
  if (!rows.length) return '';

  const cards = rows
    .map(
      (room) => `
      <article class="hk-dash__special-card">
        <strong>${escapeHtml(room.room_number || '객실 미입력')}</strong>
        <div class="hk-dash__special-tags">
          ${room.is_vip ? '<span class="hk-dash__tag hk-dash__tag--vip">VIP</span>' : ''}
          ${room.is_long_stay ? '<span class="hk-dash__tag hk-dash__tag--long">장박</span>' : ''}
          ${room.early_checkin ? `<span class="hk-dash__tag hk-dash__tag--early">일찍 ${escapeHtml(room.early_checkin)}</span>` : ''}
        </div>
        ${room.notes ? `<p>${escapeHtml(room.notes)}</p>` : ''}
      </article>
    `,
    )
    .join('');

  return `
    <section class="hk-dash__section">
      <div class="hk-dash__section-head">
        <h3>특이 객실</h3>
      </div>
      <div class="hk-dash__special-list">${cards}</div>
    </section>
  `;
}

function renderDailyNotesHtml(report: HousekeepingReport | null): string {
  const previousNotes = report?.previous_day_notes?.trim() ?? '';
  const nextDayNotes = report?.next_day_notes?.trim() ?? '';
  if (!previousNotes && !nextDayNotes) return '';

  return `
    <section class="hk-dash__section">
      <div class="hk-dash__section-head">
        <h3>전달 메모</h3>
      </div>
      <div class="hk-dash__notes">
        ${previousNotes ? `<article><h4>지난 날 특이사항</h4><p>${escapeHtml(previousNotes)}</p></article>` : ''}
        ${nextDayNotes ? `<article><h4>다음 날 특이사항</h4><p>${escapeHtml(nextDayNotes)}</p></article>` : ''}
      </div>
    </section>
  `;
}

function renderRoomMapHtml(bedRooms: HousekeepingBedDraft[], baseline: BedRoomBaseline): string {
  const byRoom = new Map(bedRooms.map((room) => [room.room_number, room]));

  const colHeaders = HK_BED_SUFFIXES.map(
    (suffix) => `<div class="hk-dash__map-colhead">${suffix}호</div>`,
  ).join('');

  const rows = HK_FLOORS_DESC.map((floor) => {
    const rowHead = `<div class="hk-dash__map-rowhead">${floor}층</div>`;
    const cells = HK_BED_SUFFIXES.map((suffix) => {
      const roomNumber = formatHkRoomNumber(floor, suffix);
      if (!isHkBedRoomTarget(roomNumber)) {
        return '<div class="hk-dash__map-cell hk-dash__map-cell--na">—</div>';
      }

      const room = byRoom.get(roomNumber);
      if (!room) {
        return '<div class="hk-dash__map-cell">—</div>';
      }

      const effectiveType = getEffectiveBedType(room, baseline);
      const changedToday = isBedRoomChangedToday(room, baseline);
      const typeClass =
        effectiveType === 'twin'
          ? ' hk-dash__map-cell--twin'
          : effectiveType === 'triple'
            ? ' hk-dash__map-cell--triple'
            : '';

      return `
        <div class="hk-dash__map-cell${typeClass}${changedToday ? ' hk-dash__map-cell--changed' : ''}">
          <span class="hk-dash__map-room">${escapeHtml(roomNumber)}</span>
          ${mapTypeCompactHtml(effectiveType)}
        </div>
      `;
    }).join('');

    return rowHead + cells;
  }).join('');

  return `
    <section class="hk-dash__section">
      <div class="hk-dash__section-head">
        <h3>전체 객실 맵</h3>
        <p>4~13층 02·10·16호 · 파란=트윈 · 노란=트리플 · 테두리=오늘 변경</p>
      </div>
      <div class="hk-dash__map-wrap">
        <div class="hk-dash__map">
          <div class="hk-dash__map-corner"></div>
          ${colHeaders}
          ${rows}
        </div>
      </div>
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
  stylesHref = '/handover.css',
): string {
  const workDateLabel = formatWorkDateLabel(workDate);
  const changedRooms = getChangedBedRooms(bedRooms, baseline);
  const twinCount = bedRooms.filter((room) => getEffectiveBedType(room, baseline) === 'twin').length;
  const tripleCount = bedRooms.filter((room) => getEffectiveBedType(room, baseline) === 'triple').length;
  const ebAddCount = bedRooms.filter((room) => room.extra_bed_action === 'add').length;
  const ebRemoveCount = bedRooms.filter((room) => room.extra_bed_action === 'remove').length;

  const changedSection = changedRooms.length
    ? `<div class="hk-dash__changed-grid">${changedRooms
        .map((room) => renderChangedRoomCardHtml(room, getEffectiveBedType(room, baseline)))
        .join('')}</div>`
    : '<p class="hk-dash__empty">오늘 변경된 객실이 없습니다.</p>';

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>하우스키핑 전달 ${workDate}</title>
    <link rel="stylesheet" href="${escapeHtml(stylesHref)}" />
    <style>${PRINT_OVERRIDES}</style>
  </head>
  <body>
    <div class="preview-toolbar">
      <span class="preview-toolbar__title">하우스키핑 전달 · ${escapeHtml(workDateLabel)} · A4 1장</span>
      <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
    </div>
    <div class="hk-dash hk-dash--print-a4">
      <header class="hk-dash__hero">
        <div>
          <p class="hk-dash__eyebrow">하우스키핑 전달</p>
          <h2 class="hk-dash__title">${escapeHtml(workDateLabel)}</h2>
        </div>
        <div class="hk-dash__stats">
          <span class="hk-dash__stat hk-dash__stat--twin">트윈 <strong>${twinCount}</strong></span>
          <span class="hk-dash__stat hk-dash__stat--triple">트리플 <strong>${tripleCount}</strong></span>
          <span class="hk-dash__stat">오늘 변경 <strong>${changedRooms.length}</strong></span>
          ${ebAddCount > 0 ? `<span class="hk-dash__stat hk-dash__stat--add">EB 넣음 <strong>${ebAddCount}</strong></span>` : ''}
          ${ebRemoveCount > 0 ? `<span class="hk-dash__stat hk-dash__stat--remove">EB 뺌 <strong>${ebRemoveCount}</strong></span>` : ''}
        </div>
      </header>

      <section class="hk-dash__section">
        <div class="hk-dash__section-head">
          <h3>오늘 변경 객실</h3>
          <p>트윈/트리플 전환·엑스트라베드 작업이 있는 객실</p>
        </div>
        ${changedSection}
      </section>

      ${renderStatusNotesHtml(report)}
      ${renderSpecialRoomsHtml(specialRooms)}
      ${renderDailyNotesHtml(report)}
      ${renderRoomMapHtml(bedRooms, baseline)}
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
  const stylesHref =
    typeof window !== 'undefined' ? `${window.location.origin}/handover.css` : '/handover.css';
  const html = buildHousekeepingPrintHtml(
    report,
    bedRooms,
    specialRooms,
    workDate,
    authorLabel,
    baseline,
    stylesHref,
  );

  const popup = window.open('about:blank', 'housekeeping-report', 'width=900,height=1200');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '하우스키핑 전달');
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
