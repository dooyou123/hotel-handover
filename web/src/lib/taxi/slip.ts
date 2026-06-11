import { isPickupToday } from '@/lib/taxi/format';
import {
  destinationForDriver,
  formatDriverPickup,
  formatDriverPrice,
  formatDriverRoom,
  formatSlipCount,
  formatSlipPickup,
  formatSlipPrice,
  localizeDestination,
  slipRoomHeroHtml,
  type SlipLanguage,
} from '@/lib/taxi/slip-i18n';
import type { TransportBooking } from '@/lib/transport/types';

export type { SlipLanguage } from '@/lib/taxi/slip-i18n';

const SLIP_LABELS: Record<
  SlipLanguage,
  {
    title: string;
    hotelSub: string;
    passengers: string;
    baggage: string;
    price: string;
    vehicle: string;
    vehicleNumber: string;
    memo: string;
    today: string;
    regular: string;
    jumbo: string;
    footer: string;
  }
> = {
  ko: {
    title: '택시 예약 확인증',
    hotelSub: '서울 명동',
    passengers: '인원',
    baggage: '짐',
    price: '요금',
    vehicle: '차종',
    vehicleNumber: '차량번호',
    memo: '메모',
    today: '오늘',
    regular: '일반',
    jumbo: '점보',
    footer: '문의: 프런트 데스크 · Sotetsu Fresa Inn Seoul Myeongdong',
  },
  en: {
    title: 'Taxi Reservation Slip',
    hotelSub: 'Seoul Myeongdong',
    passengers: 'Passengers',
    baggage: 'Bags',
    price: 'Fare',
    vehicle: 'Vehicle',
    vehicleNumber: 'Plate No.',
    memo: 'Note',
    today: 'Today',
    regular: 'Standard',
    jumbo: 'Jumbo',
    footer: 'Front Desk · Sotetsu Fresa Inn Seoul Myeongdong',
  },
  ja: {
    title: 'タクシー予約確認票',
    hotelSub: 'ソウル明洞',
    passengers: '人数',
    baggage: '荷物',
    price: '料金',
    vehicle: '車種',
    vehicleNumber: '車両番号',
    memo: 'メモ',
    today: '本日',
    regular: '普通車',
    jumbo: 'ジャンボ',
    footer: 'フロント · Sotetsu Fresa Inn Seoul Myeongdong',
  },
  zh: {
    title: '出租车预约确认单',
    hotelSub: '首尔明洞',
    passengers: '人数',
    baggage: '行李',
    price: '费用',
    vehicle: '车型',
    vehicleNumber: '车牌号',
    memo: '备注',
    today: '今天',
    regular: '普通',
    jumbo: '大型',
    footer: '前台 · Sotetsu Fresa Inn Seoul Myeongdong',
  },
};

const DRIVER_LABEL_KO = '기사님용 안내';

/** 승객이 이해할 수 있도록 한국어 라벨 + 현지어 괄호 설명 */
const DRIVER_LABEL_HINT: Record<SlipLanguage, string> = {
  ko: DRIVER_LABEL_KO,
  en: `${DRIVER_LABEL_KO} (For Driver)`,
  ja: `${DRIVER_LABEL_KO}（ドライバー用）`,
  zh: `${DRIVER_LABEL_KO}（司机用）`,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vehicleLabel(booking: TransportBooking, lang: SlipLanguage): string {
  const L = SLIP_LABELS[lang];
  return booking.vehicle_type === '점보' ? L.jumbo : L.regular;
}

function driverVehicleLabel(booking: TransportBooking): string {
  return booking.vehicle_type === '점보' ? '점보' : '일반';
}

function slipStyles(isJumbo: boolean, isToday: boolean): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 148mm 210mm; margin: 4mm; }
    html, body {
      width: 100%;
      height: auto;
      min-height: 0;
    }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', 'Hiragino Sans', 'Microsoft YaHei', sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      padding: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip {
      max-width: 400px;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .slip__head {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d4a7c 55%, #1e3a5f 100%);
      color: #fff;
      padding: 0.65rem 0.8rem 0.55rem;
      position: relative;
    }
    .slip__head::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 3px;
      background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
    }
    .slip__brand { font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.88; }
    .slip__hotel { font-size: 0.92rem; font-weight: 800; margin-top: 0.1rem; line-height: 1.2; }
    .slip__title { font-size: 0.76rem; margin-top: 0.25rem; color: #fde68a; font-weight: 600; }
    .slip__body { padding: 0.65rem 0.8rem 0.7rem; }
    .slip__hero {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.55rem;
      padding-bottom: 0.55rem;
      border-bottom: 2px dashed #e2e8f0;
    }
    .slip__room {
      font-size: 2rem;
      font-weight: 900;
      line-height: 1;
      color: #1e3a5f;
      letter-spacing: -0.03em;
    }
    .slip__room-prefix {
      display: block;
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 0.1rem;
    }
    .slip__room small { font-size: 0.85rem; font-weight: 700; margin-left: 0.08rem; }
    .slip__guest {
      font-size: 1rem;
      font-weight: 800;
      text-align: right;
      max-width: 55%;
      word-break: break-word;
      line-height: 1.2;
    }
    .slip__dest {
      font-size: 0.95rem;
      font-weight: 800;
      color: #1e3a5f;
      margin-bottom: 0.4rem;
      padding: 0.4rem 0.55rem;
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      border-radius: 0 6px 6px 0;
      line-height: 1.35;
    }
    .slip__pickup {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      font-weight: 700;
      ${isToday ? 'color: #1d4ed8;' : 'color: #334155;'}
    }
    .slip__today {
      display: inline-block;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 800;
      background: #2563eb;
      color: #fff;
    }
    .slip__badge {
      display: inline-block;
      margin-bottom: 0.5rem;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      ${isJumbo
        ? 'background: #fbbf24; color: #422006; border: 1px solid #d97706;'
        : 'background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;'}
    }
    .slip__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.5rem;
      margin-bottom: 0.5rem;
    }
    .slip__cell {
      padding: 0.35rem 0.45rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .slip__cell--wide { grid-column: 1 / -1; }
    .slip__cell dt {
      font-size: 0.62rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.03em;
      margin-bottom: 0.1rem;
    }
    .slip__cell dd { font-size: 0.84rem; font-weight: 700; color: #0f172a; }
    .slip__price dd { font-size: 0.95rem; color: #1e3a5f; }
    .slip__plate dd { font-size: 0.95rem; letter-spacing: 0.05em; }
    .slip__plate { border-color: #fbbf24; background: #fffbeb; }
    .slip__driver {
      margin-top: 0.15rem;
      padding: 0.55rem 0.65rem;
      background: #1e293b;
      color: #f8fafc;
      border-radius: 8px;
    }
    .slip__driver-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #fbbf24;
      margin-bottom: 0.35rem;
    }
    .slip__driver-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.28rem 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      line-height: 1.35;
    }
    .slip__driver-chip {
      background: rgba(255,255,255,0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 5px;
    }
    .slip__driver-chip--plate {
      background: #fbbf24;
      color: #422006;
      font-weight: 800;
    }
    .slip__footer {
      margin-top: 0.45rem;
      text-align: center;
      font-size: 0.6rem;
      color: #94a3b8;
      line-height: 1.3;
    }
    @media print {
      @page { size: 148mm 210mm; margin: 3mm; }
      html, body {
        width: 100%;
        height: auto;
        min-height: 0;
        background: #fff;
        padding: 0;
        margin: 0;
      }
      .slip {
        max-width: none;
        width: 100%;
        border: none;
        box-shadow: none;
        border-radius: 0;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .slip__head { padding: 0.5rem 0.65rem 0.45rem; }
      .slip__body { padding: 0.5rem 0.65rem 0.55rem; }
      .slip__room { font-size: 1.75rem; }
      .slip__guest { font-size: 0.92rem; }
      .slip__dest { font-size: 0.88rem; margin-bottom: 0.3rem; padding: 0.32rem 0.45rem; }
      .slip__grid { gap: 0.28rem 0.4rem; margin-bottom: 0.35rem; }
      .slip__footer { margin-top: 0.3rem; }
    }
  `;
}

export function buildSlipHtml(booking: TransportBooking, lang: SlipLanguage): string {
  const L = SLIP_LABELS[lang];
  const guest = escapeHtml(booking.booker_name || booking.guest_name || '—');
  const memo = escapeHtml(booking.memo || booking.notes || '—');
  const pickup = escapeHtml(formatSlipPickup(booking, lang));
  const price = escapeHtml(formatSlipPrice(booking.price, lang));
  const destination = escapeHtml(localizeDestination(booking.destination, lang));
  const vehicle = escapeHtml(vehicleLabel(booking, lang));
  const passengers = escapeHtml(formatSlipCount(booking.passengers, 'passengers', lang));
  const baggage = escapeHtml(formatSlipCount(booking.baggage_count ?? 0, 'baggage', lang));
  const isJumbo = booking.vehicle_type === '점보';
  const isToday = isPickupToday(booking);
  const roomNum = booking.room_number?.trim() || '—';

  const plate = booking.vehicle_number?.trim() ?? '';
  const plateHtml = escapeHtml(plate);
  const plateCell = plate
    ? `<div class="slip__cell slip__cell--wide slip__plate">
          <dt>${escapeHtml(L.vehicleNumber)}</dt>
          <dd>${plateHtml}</dd>
        </div>`
    : '';
  const plateChip = plate ? `<span class="slip__driver-chip slip__driver-chip--plate">${plateHtml}</span>` : '';
  const driverLabel = escapeHtml(DRIVER_LABEL_HINT[lang]);

  const driverRoom = escapeHtml(formatDriverRoom(booking.room_number));
  const driverGuest = escapeHtml(booking.booker_name || booking.guest_name || '—');
  const driverPickup = escapeHtml(formatDriverPickup(booking));
  const driverDest = escapeHtml(destinationForDriver(booking.destination));
  const driverVehicle = escapeHtml(driverVehicleLabel(booking));
  const driverPrice = escapeHtml(formatDriverPrice(booking.price));

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(L.title)} — ${escapeHtml(roomNum)}</title>
  <style>${slipStyles(isJumbo, isToday)}</style>
</head>
<body>
  <article class="slip">
    <header class="slip__head">
      <p class="slip__brand">Sotetsu Fresa Inn</p>
      <h1 class="slip__hotel">${escapeHtml(L.hotelSub)}</h1>
      <p class="slip__title">${escapeHtml(L.title)}</p>
    </header>

    <div class="slip__body">
      <div class="slip__hero">
        ${slipRoomHeroHtml(booking.room_number, lang)}
        <p class="slip__guest">${guest}</p>
      </div>

      <p class="slip__dest">${destination}</p>

      <p class="slip__pickup">
        ${isToday ? `<span class="slip__today">${escapeHtml(L.today)}</span>` : ''}
        <span>${pickup}</span>
      </p>

      <span class="slip__badge">${vehicle}</span>

      <dl class="slip__grid">
        <div class="slip__cell">
          <dt>${escapeHtml(L.passengers)}</dt>
          <dd>${passengers}</dd>
        </div>
        <div class="slip__cell">
          <dt>${escapeHtml(L.baggage)}</dt>
          <dd>${baggage}</dd>
        </div>
        <div class="slip__cell slip__price">
          <dt>${escapeHtml(L.price)}</dt>
          <dd>${price}</dd>
        </div>
        <div class="slip__cell">
          <dt>${escapeHtml(L.vehicle)}</dt>
          <dd>${vehicle}</dd>
        </div>
        ${plateCell}
        <div class="slip__cell slip__cell--wide">
          <dt>${escapeHtml(L.memo)}</dt>
          <dd>${memo}</dd>
        </div>
      </dl>

      <section class="slip__driver" lang="ko" aria-label="${driverLabel}">
        <p class="slip__driver-label">${driverLabel}</p>
        <div class="slip__driver-row">
          <span class="slip__driver-chip">${driverRoom}</span>
          <span class="slip__driver-chip">${driverGuest}</span>
          <span class="slip__driver-chip">${driverPickup}</span>
          <span class="slip__driver-chip">${driverDest}</span>
          <span class="slip__driver-chip">${driverVehicle}</span>
          <span class="slip__driver-chip">${driverPrice}</span>
          ${plateChip}
        </div>
      </section>

      <p class="slip__footer">${escapeHtml(L.footer)}</p>
    </div>
  </article>
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

function writeHtmlToWindow(targetWindow: Window, html: string) {
  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();
}

/** 확인증 인쇄. 팝업 차단 시 hidden iframe으로 대체. 성공 여부 반환. */
export function printReservationSlip(booking: TransportBooking, lang: SlipLanguage): boolean {
  const html = buildSlipHtml(booking, lang);
  const windowName = `taxi-slip-${booking.id}`;

  const popup = window.open('about:blank', windowName, 'width=480,height=680');
  if (popup) {
    writeHtmlToWindow(popup, html);
    printWhenReady(popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '택시 예약 확인증');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWin?.document;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return false;
  }

  writeHtmlToWindow(frameWin, html);
  printWhenReady(frameWin, () => {
    setTimeout(() => iframe.remove(), 1000);
  });
  return true;
}
