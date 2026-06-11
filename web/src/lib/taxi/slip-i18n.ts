import { pickupDateTime } from '@/lib/taxi/format';
import type { TransportBooking } from '@/lib/transport/types';

export type SlipLanguage = 'ko' | 'en' | 'ja' | 'zh';

const LOCALE: Record<SlipLanguage, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

/** DB 저장값(한국어) → 승객용 현지어. 기사용은 항상 한국어 원문. */
const DESTINATION_I18N: Record<string, Partial<Record<SlipLanguage, string>>> = {
  '인천공항 T1': {
    en: 'Incheon Airport Terminal 1',
    ja: '仁川国際空港 第1ターミナル',
    zh: '仁川国际机场 第一航站楼',
  },
  '인천공항 T2': {
    en: 'Incheon Airport Terminal 2',
    ja: '仁川国際空港 第2ターミナル',
    zh: '仁川国际机场 第二航站楼',
  },
  '김포공항 국제선': {
    en: 'Gimpo Airport (International)',
    ja: '金浦国際空港 国際線',
    zh: '金浦国际机场 国际航线',
  },
  '김포공항 국내선': {
    en: 'Gimpo Airport (Domestic)',
    ja: '金浦国際空港 国内線',
    zh: '金浦国际机场 国内航线',
  },
};

const METER_PRICE_I18N: Record<SlipLanguage, string> = {
  ko: '미터(약 45,000원)',
  en: 'Meter (approx. ₩45,000)',
  ja: 'メーター（約₩45,000）',
  zh: '打表（约 ₩45,000）',
};

export function localizeDestination(destination: string, lang: SlipLanguage): string {
  if (!destination) return '—';
  if (lang === 'ko') return destination;
  return DESTINATION_I18N[destination]?.[lang] ?? destination;
}

/** 기사용 — 항상 한국어 목적지 */
export function destinationForDriver(destination: string): string {
  return destination || '—';
}

export function formatSlipRoom(roomNumber: string, lang: SlipLanguage): string {
  const room = roomNumber?.trim() || '—';
  if (room === '—') return room;
  switch (lang) {
    case 'en':
      return `Room ${room}`;
    case 'ja':
      return `${room}号室`;
    case 'zh':
      return `${room}号房`;
    default:
      return `${room}호`;
  }
}

/** 기사용 객실 — 항상 N호 */
export function formatDriverRoom(roomNumber: string): string {
  const room = roomNumber?.trim() || '—';
  return room === '—' ? room : `${room}호`;
}

export function formatSlipPrice(price: string, lang: SlipLanguage): string {
  if (!price) return '—';
  if (price.includes('미터')) {
    return METER_PRICE_I18N[lang];
  }
  const digits = price.replace(/[^\d]/g, '');
  if (!digits) return price;
  const num = Number(digits);
  if (Number.isNaN(num)) return price;
  switch (lang) {
    case 'en':
      return `₩${num.toLocaleString('en-US')}`;
    case 'ja':
      return `₩${num.toLocaleString('ja-JP')}`;
    case 'zh':
      return `₩${num.toLocaleString('zh-CN')}`;
    default:
      return `${num.toLocaleString('ko-KR')}원`;
  }
}

/** 기사용 요금 — 항상 한국어 */
export function formatDriverPrice(price: string): string {
  if (!price) return '—';
  if (price.includes('미터')) return '미터(약 45,000원)';
  const digits = price.replace(/[^\d]/g, '');
  if (!digits) return price;
  const num = Number(digits);
  if (Number.isNaN(num)) return price;
  return `${num.toLocaleString('ko-KR')}원`;
}

export function formatSlipPickup(booking: TransportBooking, lang: SlipLanguage): string {
  const d = pickupDateTime(booking);
  if (Number.isNaN(d.getTime())) {
    return `${booking.booking_date} ${booking.pickup_time.slice(0, 5)}`;
  }
  return d.toLocaleString(LOCALE[lang], {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: lang === 'en',
  });
}

/** 기사용 일시 — 항상 한국어 */
export function formatDriverPickup(booking: TransportBooking): string {
  const d = pickupDateTime(booking);
  if (Number.isNaN(d.getTime())) {
    return `${booking.booking_date} ${booking.pickup_time.slice(0, 5)}`;
  }
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSlipCount(value: number, kind: 'passengers' | 'baggage', lang: SlipLanguage): string {
  switch (lang) {
    case 'en':
      return String(value);
    case 'ja':
      return kind === 'passengers' ? `${value}名` : `${value}個`;
    case 'zh':
      return kind === 'passengers' ? `${value}人` : `${value}件`;
    default:
      return kind === 'passengers' ? `${value}명` : `${value}개`;
  }
}

export function slipRoomHeroHtml(roomNumber: string, lang: SlipLanguage): string {
  const room = roomNumber?.trim() || '—';
  const escaped = room.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (lang === 'en') {
    return `<p class="slip__room"><span class="slip__room-prefix">Room</span>${escaped}</p>`;
  }
  if (lang === 'ja') {
    return `<p class="slip__room">${escaped}<small>号室</small></p>`;
  }
  if (lang === 'zh') {
    return `<p class="slip__room">${escaped}<small>号房</small></p>`;
  }
  return `<p class="slip__room">${escaped}<small>호</small></p>`;
}
