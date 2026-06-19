import {
  getEffectiveBedType,
  isBedRoomChangedToday,
  type BedTypeSource,
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
  hkGuestStatusLabel,
  isOccupiedGuestStatus,
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
  bedTypeSource: BedTypeSource = { baseline: {} },
): HousekeepingBedDraft[] {
  return bedRooms
    .filter((room) => isBedRoomChangedToday(room, bedTypeSource))
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

/** 인쇄 전용 — 외부 CSS 없이 A4에 맞게 자체 완결 */
const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 5mm; }

  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #171717;
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    font-size: 9pt;
    line-height: 1.35;
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

  .hk-dash--print-a4 {
    display: grid;
    grid-template-columns: 44% 56%;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 1.5mm;
    width: 100%;
    max-width: 200mm;
    margin: 0 auto;
    align-items: stretch;
  }

  .hk-dash__hero {
    grid-column: 1 / -1;
  }

  .hk-print-side {
    grid-column: 1;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
    min-height: 0;
  }

  .hk-dash__section--map {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    min-height: 118mm;
  }

  .hk-dash__hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    flex-wrap: wrap;
    padding: 1.5mm 2.5mm;
    border: 0.3mm solid #d4d4d4;
    border-radius: 2mm;
    background: #fafafa;
  }

  .hk-dash__eyebrow {
    margin: 0 0 0.5mm;
    font-size: 7pt;
    font-weight: 700;
    color: #166534;
    letter-spacing: 0.04em;
  }

  .hk-dash__title {
    margin: 0;
    font-size: 11pt;
    font-weight: 800;
    line-height: 1.15;
  }

  .hk-dash__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5mm;
    align-items: center;
  }

  .hk-dash__stat {
    display: inline-flex;
    align-items: center;
    gap: 1mm;
    padding: 1mm 2.5mm;
    border-radius: 999px;
    border: 0.25mm solid #d4d4d4;
    background: #f5f5f5;
    font-size: 8pt;
    color: #525252;
  }

  .hk-dash__stat strong { font-weight: 800; color: #171717; }
  .hk-dash__stat--twin { border-color: #7dd3fc; background: #e0f2fe; color: #0369a1; }
  .hk-dash__stat--triple { border-color: #fcd34d; background: #fef3c7; color: #b45309; }
  .hk-dash__stat--add { border-color: #86efac; background: #ecfdf5; color: #166534; }
  .hk-dash__stat--remove { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }

  .hk-dash__section {
    border: 0.3mm solid #d4d4d4;
    border-radius: 2mm;
    overflow: hidden;
    background: #fff;
  }

  .hk-dash__section-head {
    padding: 1.5mm 2.5mm;
    background: #f5f5f5;
    border-bottom: 0.25mm solid #e5e5e5;
  }

  .hk-dash__section-head h3 {
    margin: 0;
    font-size: 9pt;
    font-weight: 800;
    line-height: 1.2;
  }

  .hk-dash__section-head p {
    margin: 0.3mm 0 0;
    font-size: 6.5pt;
    color: #737373;
    line-height: 1.2;
  }

  .hk-dash__section--changed .hk-dash__changed-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1mm;
    padding: 1.5mm 2.5mm 2mm;
  }

  .hk-dash__empty {
    margin: 2mm 3mm 2.5mm;
    padding: 3mm;
    text-align: center;
    color: #737373;
    border: 0.25mm dashed #d4d4d4;
    border-radius: 2mm;
    font-size: 8.5pt;
  }

  .hk-room-card {
    display: flex;
    flex-direction: column;
    gap: 0.5mm;
    padding: 1.2mm 1.5mm;
    border: 0.25mm solid #e5e5e5;
    border-radius: 1.5mm;
    background: #fafafa;
  }

  .hk-room-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1mm;
    flex-wrap: wrap;
  }

  .hk-room-card__number {
    font-size: 9pt;
    font-weight: 800;
    line-height: 1.1;
  }

  .hk-room-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.5mm;
  }

  .hk-room-card__changed-at {
    margin: 0;
    font-size: 6.5pt;
    color: #737373;
  }

  .hk-type-badge {
    display: inline-flex;
    padding: 0.5mm 2mm;
    border-radius: 999px;
    font-size: 7pt;
    font-weight: 800;
    line-height: 1.2;
    white-space: nowrap;
  }

  .hk-type-badge--twin { background: #e0f2fe; color: #0369a1; border: 0.2mm solid #7dd3fc; }
  .hk-type-badge--triple { background: #fef3c7; color: #b45309; border: 0.2mm solid #fcd34d; }
  .hk-type-badge--unset { background: #f5f5f5; color: #737373; border: 0.2mm dashed #d4d4d4; }

  .hk-type-letter {
    font-size: 8pt;
    font-weight: 900;
    line-height: 1.1;
  }

  .hk-type-letter--twin { color: #0369a1; }
  .hk-type-letter--triple { color: #b45309; }
  .hk-type-letter--unset { color: #dc2626; }

  .hk-guest-badge {
    display: inline-flex;
    padding: 0.4mm 1.5mm;
    border-radius: 999px;
    font-size: 6pt;
    font-weight: 700;
  }

  .hk-guest-badge--stay { background: #dcfce7; color: #166534; }
  .hk-guest-badge--arrival { background: #dbeafe; color: #1d4ed8; }

  .hk-inhouse-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1mm;
  }

  .hk-inhouse-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5mm;
    padding: 1mm;
    border: 0.2mm solid #e5e5e5;
    border-radius: 1mm;
    background: #fafafa;
  }

  .hk-inhouse-card--twin { background: #e0f2fe; border-color: #7dd3fc; }
  .hk-inhouse-card--triple { background: #fef3c7; border-color: #fcd34d; }
  .hk-inhouse-card--alert { outline: 0.35mm solid #dc2626; }

  .hk-inhouse-card__top {
    display: flex;
    align-items: center;
    gap: 1mm;
    flex-wrap: wrap;
    justify-content: center;
  }

  .hk-inhouse-card__room {
    font-size: 8pt;
    font-weight: 800;
  }

  .hk-dash__map-cell--occupied { box-shadow: inset 0 0 0 0.35mm rgba(22, 101, 52, 0.35); }
  .hk-dash__map-cell--alert { outline: 0.35mm solid #dc2626; outline-offset: -0.35mm; }

  .hk-eb-badge {
    display: inline-flex;
    align-self: flex-start;
    padding: 0.5mm 2mm;
    border-radius: 999px;
    font-size: 6.5pt;
    font-weight: 700;
    color: #fff;
  }

  .hk-eb-badge--add { background: #166534; }
  .hk-eb-badge--remove { background: #b91c1c; }
  .hk-eb-badge--keep { background: #737373; }

  .hk-delivery-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
    font-size: 6.5pt;
    line-height: 1.3;
  }

  .hk-delivery-table th,
  .hk-delivery-table td {
    padding: 1mm 1.2mm;
    border-bottom: 0.2mm solid #e5e5e5;
    vertical-align: top;
    text-align: left;
  }

  .hk-delivery-table th {
    width: 24%;
    font-weight: 800;
    color: #404040;
    white-space: nowrap;
  }

  .hk-delivery-table td {
    word-break: break-word;
    white-space: pre-wrap;
  }

  .hk-delivery-table tr:last-child th,
  .hk-delivery-table tr:last-child td {
    border-bottom: 0;
  }

  .hk-delivery-table-wrap {
    padding: 1mm 2mm 1.5mm;
  }

  .hk-dash__special-list {
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
    padding: 2mm 3mm 2.5mm;
  }

  .hk-dash__special-card {
    padding: 2mm 2.5mm;
    border: 0.25mm solid #e5e5e5;
    border-radius: 2mm;
    background: #fafafa;
  }

  .hk-dash__special-card strong {
    display: block;
    font-size: 9.5pt;
    margin-bottom: 1mm;
  }

  .hk-dash__special-card p {
    margin: 1mm 0 0;
    font-size: 8.5pt;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .hk-dash__special-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 1mm;
  }

  .hk-dash__tag {
    padding: 0.5mm 2mm;
    border-radius: 999px;
    font-size: 6.5pt;
    font-weight: 700;
  }

  .hk-dash__tag--vip { background: #fffbeb; color: #92400e; }
  .hk-dash__tag--long { background: #eff6ff; color: #1d4ed8; }
  .hk-dash__tag--early { background: #f5f3ff; color: #6d28d9; }

  .hk-dash__section--map .hk-dash__map-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5mm 2.5mm 2mm;
    min-height: 0;
  }

  .hk-dash__section--map .hk-dash__map {
    flex: 1;
    display: grid;
    grid-template-columns: 8mm repeat(3, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 0.7mm;
    width: 100%;
    min-height: 105mm;
  }

  .hk-dash__map-corner,
  .hk-dash__map-colhead,
  .hk-dash__map-rowhead {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    font-weight: 800;
    color: #525252;
  }

  .hk-dash__map-rowhead { justify-content: flex-end; padding-right: 1mm; }

  .hk-dash__map-colhead {
    background: #f5f5f5;
    border-radius: 1mm;
  }

  .hk-dash__map-cell {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.8mm;
    padding: 0.3mm;
    border: 0.25mm solid #e5e5e5;
    border-radius: 1mm;
    background: #fafafa;
    text-align: center;
    overflow: hidden;
  }

  .hk-dash__map-cell--twin { background: #e0f2fe; border-color: #7dd3fc; }
  .hk-dash__map-cell--triple { background: #fef3c7; border-color: #fcd34d; }
  .hk-dash__map-cell--changed { outline: 0.4mm solid #166534; outline-offset: -0.4mm; }
  .hk-dash__map-cell--na { background: transparent; border-style: dashed; color: #a3a3a3; }

  .hk-dash__map-room {
    font-size: 8pt;
    font-weight: 800;
    line-height: 1;
  }

  .hk-map-type { font-size: 7pt; font-weight: 800; line-height: 1; }
  .hk-map-type--twin { color: #0369a1; }
  .hk-map-type--triple { color: #b45309; }
  .hk-map-type--unset { color: #a3a3a3; }

  @media screen {
    body { background: #f4f4f5; padding-bottom: 16px; }
    .hk-dash--print-a4 {
      background: #fff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      border-radius: 0 0 8px 8px;
      max-width: 210mm;
    }
  }

  @media print {
    .preview-toolbar { display: none !important; }
    .hk-dash--print-a4 {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .hk-dash__section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .hk-dash__section--map {
      page-break-before: avoid;
      break-before: avoid;
    }
  }
`;

function mapTypeCompactHtml(type: HkBedType): string {
  if (type === 'twin') return '<span class="hk-type-letter hk-type-letter--twin">트윈</span>';
  if (type === 'triple') return '<span class="hk-type-letter hk-type-letter--triple">트리플</span>';
  return '<span class="hk-type-letter hk-type-letter--unset">?</span>';
}

function renderInHousePanelHtml(
  bedRooms: HousekeepingBedDraft[],
  bedTypeSource: BedTypeSource,
): string {
  const occupied = bedRooms
    .filter((room) => isOccupiedGuestStatus(room.guest_status))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  if (!occupied.length) return '';

  const cards = occupied
    .map((room) => {
      const effectiveType = getEffectiveBedType(room, bedTypeSource);
      const alertClass = !effectiveType ? ' hk-inhouse-card--alert' : '';
      const typeClass =
        effectiveType === 'twin'
          ? ' hk-inhouse-card--twin'
          : effectiveType === 'triple'
            ? ' hk-inhouse-card--triple'
            : '';
      return `
        <article class="hk-inhouse-card${alertClass}${typeClass}">
          <div class="hk-inhouse-card__top">
            <span class="hk-inhouse-card__room">${escapeHtml(room.room_number)}</span>
            <span class="hk-guest-badge hk-guest-badge--md hk-guest-badge--${escapeHtml(room.guest_status)}">${escapeHtml(hkGuestStatusLabel(room.guest_status))}</span>
          </div>
          ${bedTypeBadgeHtml(effectiveType, 'lg')}
        </article>`;
    })
    .join('');

  return `
    <section class="hk-dash__section hk-dash__section--inhouse">
      <div class="hk-dash__section-head">
        <h3>재실 · 도착 객실 침대 구성</h3>
      </div>
      <div class="hk-inhouse-grid">${cards}</div>
    </section>`;
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

function renderDeliveryTableRows(
  rows: { label: string; value: string }[],
): string {
  if (!rows.length) return '';
  return rows
    .map(
      (row) => `
      <tr>
        <th>${escapeHtml(row.label)}</th>
        <td>${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('');
}

function renderStatusNotesBody(report: HousekeepingReport | null): string {
  const notes = mapStatusNotesFromReport(report);
  if (!hasAnyStatusNotes(notes)) return '';

  const rows = HK_STATUS_NOTE_FIELDS.filter((field) => notes[field.key].trim()).map((field) => ({
    label: field.label,
    value: notes[field.key],
  }));

  return `
    <div class="hk-delivery-table-wrap">
      <table class="hk-delivery-table">${renderDeliveryTableRows(rows)}</table>
    </div>`;
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
    <section class="hk-dash__section hk-dash__section--special">
      <div class="hk-dash__section-head">
        <h3>특이 객실</h3>
      </div>
      <div class="hk-dash__special-list">${cards}</div>
    </section>
  `;
}

function renderDailyNotesBody(report: HousekeepingReport | null): string {
  const previousNotes = report?.previous_day_notes?.trim() ?? '';
  const nextDayNotes = report?.next_day_notes?.trim() ?? '';
  const rows = [
    previousNotes ? { label: '지난 날 특이', value: previousNotes } : null,
    nextDayNotes ? { label: '다음 날 특이', value: nextDayNotes } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  if (!rows.length) return '';

  return `
    <div class="hk-delivery-table-wrap">
      <table class="hk-delivery-table">${renderDeliveryTableRows(rows)}</table>
    </div>`;
}

function renderStatusAndNotesHtml(report: HousekeepingReport | null): string {
  const statusBody = renderStatusNotesBody(report);
  const notesBody = renderDailyNotesBody(report);
  if (!statusBody && !notesBody) return '';

  const title = statusBody ? '객실 상태 · 전달' : '전달 메모';
  const subtitle = statusBody
    ? 'H/U · Comp · VIP · O.O · 장기 숙박 · 정비 유의 · 퇴근 후 DELIVERY'
    : '';

  return `
    <section class="hk-dash__section hk-dash__section--delivery">
      <div class="hk-dash__section-head">
        <h3>${title}</h3>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      ${statusBody}
      ${notesBody}
    </section>`;
}

function renderRoomMapHtml(bedRooms: HousekeepingBedDraft[], bedTypeSource: BedTypeSource): string {
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

      const effectiveType = getEffectiveBedType(room, bedTypeSource);
      const changedToday = isBedRoomChangedToday(room, bedTypeSource);
      const occupied = isOccupiedGuestStatus(room.guest_status);
      const typeClass =
        effectiveType === 'twin'
          ? ' hk-dash__map-cell--twin'
          : effectiveType === 'triple'
            ? ' hk-dash__map-cell--triple'
            : '';

      return `
        <div class="hk-dash__map-cell${typeClass}${changedToday ? ' hk-dash__map-cell--changed' : ''}${occupied ? ' hk-dash__map-cell--occupied' : ''}${occupied && !effectiveType ? ' hk-dash__map-cell--alert' : ''}">
          <span class="hk-dash__map-room">${escapeHtml(roomNumber)}</span>
          ${mapTypeCompactHtml(effectiveType)}
        </div>
      `;
    }).join('');

    return rowHead + cells;
  }).join('');

  return `
    <section class="hk-dash__section hk-dash__section--map">
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
  bedTypeSource: BedTypeSource = { baseline: {} },
): string {
  const workDateLabel = formatWorkDateLabel(workDate);
  const changedRooms = getChangedBedRooms(bedRooms, bedTypeSource);
  const twinCount = bedRooms.filter((room) => getEffectiveBedType(room, bedTypeSource) === 'twin').length;
  const tripleCount = bedRooms.filter((room) => getEffectiveBedType(room, bedTypeSource) === 'triple').length;
  const ebAddCount = bedRooms.filter((room) => room.extra_bed_action === 'add').length;
  const ebRemoveCount = bedRooms.filter((room) => room.extra_bed_action === 'remove').length;

  const changedSection = changedRooms.length
    ? `<div class="hk-dash__changed-grid">${changedRooms
        .map((room) => renderChangedRoomCardHtml(room, getEffectiveBedType(room, bedTypeSource)))
        .join('')}</div>`
    : '<p class="hk-dash__empty">오늘 변경된 객실이 없습니다.</p>';

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>하우스키핑 전달 ${workDate}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <style>${PRINT_STYLES}</style>
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

      <div class="hk-print-side">
        ${renderInHousePanelHtml(bedRooms, bedTypeSource)}
        <section class="hk-dash__section hk-dash__section--changed">
          <div class="hk-dash__section-head">
            <h3>오늘 변경 객실</h3>
            <p>트윈/트리플·EB 작업</p>
          </div>
          ${changedSection}
        </section>
        ${renderStatusAndNotesHtml(report)}
        ${renderSpecialRoomsHtml(specialRooms)}
      </div>

      ${renderRoomMapHtml(bedRooms, bedTypeSource)}
    </div>
  </body>
</html>`;
}

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

export function openHousekeepingPrintWindow(
  report: HousekeepingReport | null,
  bedRooms: HousekeepingBedDraft[],
  specialRooms: HousekeepingSpecialDraft[],
  workDate: string,
  authorLabel: string,
  bedTypeSource: BedTypeSource = { baseline: {} },
): boolean {
  const html = buildHousekeepingPrintHtml(
    report,
    bedRooms,
    specialRooms,
    workDate,
    authorLabel,
    bedTypeSource,
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
  printWhenReady(frameWin, () => {
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  });
  return true;
}
