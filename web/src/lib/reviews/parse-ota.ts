import type { ReviewSentiment } from '@/lib/reviews/types';

export type OtaSource = 'booking' | 'agoda' | 'google' | 'expedia' | 'tripadvisor' | 'unknown';

export type ParsedOtaReview = {
  ota_source: OtaSource;
  account: string;
  sentiment: ReviewSentiment;
  guest_name: string;
  reservation_number: string;
  room_number: string;
  check_in_date: string | null;
  check_out_date: string | null;
  rating: number | null;
  content_original: string;
  content_ko: string;
};

const NEGATIVE_HINTS = [
  'dirty',
  'noise',
  'rude',
  'worst',
  'bad',
  'terrible',
  'disappoint',
  '불친절',
  '더럽',
  '소음',
  '최악',
  '실망',
  '불만',
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function detectSource(text: string): OtaSource {
  const lower = text.toLowerCase();
  if (lower.includes('booking.com') || lower.includes('reservation number')) return 'booking';
  if (lower.includes('agoda') || lower.includes('booking id')) return 'agoda';
  if (lower.includes('expedia') || lower.includes('itinerary')) return 'expedia';
  if (lower.includes('tripadvisor') || lower.includes('trip advisor')) return 'tripadvisor';
  if (lower.includes('google') || /★/.test(text)) return 'google';
  return 'unknown';
}

function extractRating(text: string): number | null {
  const starMatch = text.match(/([1-5])\s*\/\s*5|([1-5])\s*stars?|★{1,5}/i);
  if (starMatch) {
    if (starMatch[0].includes('★')) {
      const stars = (starMatch[0].match(/★/g) ?? []).length;
      return stars > 0 ? stars : null;
    }
    return Number(starMatch[1] ?? starMatch[2]);
  }

  const bookingScore = text.match(/(?:score|rating)[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i);
  if (bookingScore) {
    const value = Number(bookingScore[1]);
    if (value <= 10) return Math.round((value / 10) * 5 * 10) / 10;
    return value;
  }

  const numeric = text.match(/\b([1-5])\s*\/\s*5\b/);
  if (numeric) return Number(numeric[1]);

  return null;
}

function inferSentiment(text: string, rating: number | null): ReviewSentiment {
  if (rating !== null) {
    if (rating <= 2.5) return 'negative';
    if (rating >= 4) return 'positive';
  }
  const lower = text.toLowerCase();
  if (NEGATIVE_HINTS.some((hint) => lower.includes(hint))) return 'negative';
  return 'positive';
}

function pickLineValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, 'im');
    const match = text.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractDates(text: string): { check_in: string | null; check_out: string | null } {
  const isoRange = text.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:~|–|-|to)\s*(\d{4}-\d{2}-\d{2})/i,
  );
  if (isoRange) {
    return { check_in: isoRange[1], check_out: isoRange[2] };
  }

  const checkIn = pickLineValue(text, ['Check[- ]in', '체크인', 'Arrival']);
  const checkOut = pickLineValue(text, ['Check[- ]out', '체크아웃', 'Departure']);
  const toIso = (value: string) => {
    const m = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (!m) return null;
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  };

  return {
    check_in: checkIn ? toIso(checkIn) : null,
    check_out: checkOut ? toIso(checkOut) : null,
  };
}

function extractReviewBody(text: string): string {
  const lines = normalizeWhitespace(text).split('\n').map((line) => line.trim()).filter(Boolean);
  const skipPatterns = [
    /^guest name/i,
    /^reservation/i,
    /^booking/i,
    /^check[- ]in/i,
    /^check[- ]out/i,
    /^room/i,
    /^score/i,
    /^rating/i,
    /^객실/i,
    /^예약/i,
    /^고객/i,
    /^booking\.com/i,
    /^agoda/i,
  ];
  const bodyLines = lines.filter((line) => !skipPatterns.some((re) => re.test(line)));
  return bodyLines.slice(-8).join('\n').trim() || text.trim();
}

export function parseOtaReviewPaste(raw: string): ParsedOtaReview | null {
  const text = normalizeWhitespace(raw);
  if (!text || text.length < 8) return null;

  const ota_source = detectSource(text);
  const rating = extractRating(text);
  const sentiment = inferSentiment(text, rating);
  const account = otaSourceLabel(ota_source);

  const guest_name =
    pickLineValue(text, ['Guest name', 'Guest Name', '고객명', '투숙객', 'Name']) ||
    pickLineValue(text, ['Reviewer', 'Posted by']);

  const reservation_number = pickLineValue(text, [
    'Booking.com reservation number',
    'Reservation number',
    'Booking ID',
    'Confirmation number',
    '예약 번호',
    '예약번호',
  ]);

  let room_number = pickLineValue(text, ['Room number', 'Room', '객실', 'Room no']);
  if (!room_number) {
    const roomMatch = text.match(/\b(\d{3,4})\s*호\b|\bRoom\s*#?\s*(\d{3,4})\b/i);
    room_number = roomMatch?.[1] ?? roomMatch?.[2] ?? '';
  }

  const { check_in, check_out } = extractDates(text);
  const content_original = extractReviewBody(text);

  return {
    ota_source,
    account: ota_source === 'unknown' ? '' : account,
    sentiment,
    guest_name,
    reservation_number,
    room_number,
    check_in_date: check_in,
    check_out_date: check_out,
    rating,
    content_original,
    content_ko: content_original,
  };
}

export function otaSourceLabel(source: OtaSource): string {
  switch (source) {
    case 'booking':
      return 'Booking.com';
    case 'agoda':
      return 'Agoda';
    case 'google':
      return 'Google';
    case 'expedia':
      return 'Expedia';
    case 'tripadvisor':
      return 'TripAdvisor';
    default:
      return 'OTA';
  }
}
