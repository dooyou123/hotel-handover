import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextBySearchQuery } from '@/lib/handover/card-utils';
import { monthDateRange } from '@/lib/schedule/month-range';
import { buildSummaryText, getExportFilename, hasSummaryContent } from '@/lib/handover/daily-summary';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { consolidateTlNotificationRows, performReconciliation } from '@/lib/rate-confirm/compare-engine';
import { isStatusEqual, normalizeDate, normalizeRate } from '@/lib/rate-confirm/normalize';
import {
  detectRateFileFormat,
  guessColumnMapping,
  TL_BOOKING_SEARCH_HEADERS,
} from '@/lib/rate-confirm/parse';

test('monthDateRange uses last day of month', () => {
  assert.deepEqual(monthDateRange('2026-06'), { start: '2026-06-01', end: '2026-06-30' });
  assert.deepEqual(monthDateRange('2026-02'), { start: '2026-02-01', end: '2026-02-28' });
});

test('getExportFilename includes date prefix', () => {
  assert.match(getExportFilename('txt'), /^인수인계_\d{4}-\d{2}-\d{2}\.txt$/);
});

test('buildSummaryText includes header and empty state', () => {
  const data = buildShiftSummaryData([], []);
  const text = buildSummaryText(data, [], '주간 · 김프런');
  assert.match(text, /^프런트 인수인계 일일 요약/);
  assert.match(text, /주간 · 김프런/);
  assert.match(text, /표시할 업무가 없습니다/);
});

test('hasSummaryContent detects urgent cards', () => {
  const card = {
    id: '1',
    column_id: 'progress',
    priority: 'urgent',
    card_acknowledgments: [],
  } as Card;
  const data = buildShiftSummaryData([card], []);
  assert.equal(hasSummaryContent(data, []), true);
});

test('hasSummaryContent detects notices', () => {
  const notice = { id: '1', type: 'announcement' } as Notice;
  const data = buildShiftSummaryData([], [notice]);
  assert.equal(hasSummaryContent(data, []), true);
});

test('hasSummaryContent false when empty', () => {
  const data = buildShiftSummaryData([], []);
  assert.equal(hasSummaryContent(data, [] as ActivityLog[]), false);
});

test('splitTextBySearchQuery highlights matching segments', () => {
  assert.deepEqual(splitTextBySearchQuery('1207 VIP 민원', 'vip'), [
    { text: '1207 ', match: false },
    { text: 'VIP', match: true },
    { text: ' 민원', match: false },
  ]);
  assert.deepEqual(splitTextBySearchQuery('민원 처리', ''), [{ text: '민원 처리', match: false }]);
});

test('parseAmount strips currency formatting', () => {
  const { parseAmount } = require('@/lib/rate-confirm/parse') as typeof import('@/lib/rate-confirm/parse');
  assert.equal(parseAmount('₩120,000'), 120000);
  assert.equal(parseAmount('95000원'), 95000);
  assert.equal(parseAmount(''), null);
});

test('detects TL booking search export columns', () => {
  const headers = [
    '통지종류(분류)별',
    'ota_코드',
    'ota명',
    '판매처_예약번호',
    '단체명_또는_대표자_성명(반각)',
    '체크인날짜',
    '이용객실합계(수)',
    '합계숙박요금(총액)',
    '전송객구분',
    '사전결제정보',
  ];
  assert.equal(detectRateFileFormat(headers), 'tl_booking_search');
  const mapping = guessColumnMapping(headers, 'tl');
  assert.equal(mapping.ota, TL_BOOKING_SEARCH_HEADERS.ota);
  assert.equal(mapping.status, TL_BOOKING_SEARCH_HEADERS.status);
  assert.equal(mapping.rate, TL_BOOKING_SEARCH_HEADERS.rate);
  assert.equal(mapping.account, TL_BOOKING_SEARCH_HEADERS.account);
  assert.notEqual(mapping.ota, 'ota_코드');
  assert.notEqual(mapping.rate, '이용객실합계(수)');
});

test('OTA channel names match TL OTA명 and PMS Account', async () => {
  const { isAccountEqual } = await import('@/lib/rate-confirm/normalize');
  assert.equal(isAccountEqual('tripla株式会社', 'FMTripla(POA)'), true);
  assert.equal(isAccountEqual('Agoda', 'FMAGODA(VCC)'), true);
  assert.equal(isAccountEqual('Booking.com', 'FMBooking.com(POA)'), true);
  assert.equal(isAccountEqual('Expedia', 'FMExpedia(VCC)'), true);
  assert.equal(isAccountEqual('Trip.com Group(new)', 'FMCTRIP(VCC)'), true);
  assert.equal(isAccountEqual('DidaTravel', 'FMDida Travel(VCC)'), true);
  assert.equal(isAccountEqual('Rakuten', 'FMRakuten(POA)'), true);
  assert.equal(isAccountEqual('Agoda', 'FMTripla(POA)'), false);
});

test('TL notification rows prefer 변경 over 예약 for rate', () => {
  const items = [
    { ota: '1', guestName: 'A', status: '예약', rate: '100', account: '', ciDate: '' },
    { ota: '1', guestName: 'A', status: '변경', rate: '200', account: '', ciDate: '' },
  ];
  const consolidated = consolidateTlNotificationRows(items);
  assert.equal(consolidated.length, 1);
  assert.equal(consolidated[0]?.rate, '200');
});

test('reconcile engine sums TL multi-room and detects rate mismatch', () => {
  const tlSheet = {
    headers: ['ota', 'status', 'rate', 'account', 'guest', 'cidate'],
    fileName: 'tl.csv',
    rows: [
      { ota: '1645822028', status: '예약', rate: '754,596', account: 'Agoda', guest: 'Rie Yoshida', cidate: '2026.05.20(수)' },
      { ota: '1645822028', status: '예약', rate: '1,307,640', account: 'Agoda', guest: 'Rie Yoshida', cidate: '2026.05.20(수)' },
      { ota: '9999999999', status: '취소', rate: '150,000', account: 'Expedia', guest: 'Cancelled', cidate: '2026.05.20(수)' },
    ],
  };
  const pmsSheet = {
    headers: ['ota', 'status', 'rate', 'account', 'guest', 'cidate'],
    fileName: 'pms.csv',
    rows: [
      { ota: '1645822028', status: '예약', rate: '1,395,768', account: '카드 결제', guest: 'Rie Yoshida', cidate: '2026-05-20' },
    ],
  };
  const mapping = {
    ota: 'ota',
    guestName: 'guest',
    status: 'status',
    rate: 'rate',
    account: 'account',
    ciDate: 'cidate',
  };
  const result = performReconciliation(tlSheet, pmsSheet, mapping, mapping);
  assert.equal(result.summary.tlCount, 1);
  assert.equal(result.summary.errorCount, 1);
  assert.equal(result.errors[0]?.errors.includes('RATE_MISMATCH'), true);
  assert.equal(normalizeRate(result.errors[0]?.tl?.rate ?? 0), 2062236);
});

test('status and date normalization', () => {
  assert.equal(isStatusEqual('예약', 'RR'), true);
  assert.equal(normalizeDate('2026.05.20(수)'), '2026-05-20');
  assert.equal(normalizeDate('2026-05-20'), '2026-05-20');
});

test('SOP search ranks keyword and title matches', async () => {
  const { searchSopArticles, suggestSopArticles } = await import('../src/lib/sop/search.ts');
  const articles = [
    {
      id: '1',
      hotel_id: 'h',
      title: '119 · 112 긴급 연락',
      body: '119 화재',
      category: '긴급대응' as const,
      keywords: ['119', '응급'],
      is_pinned: true,
      sort_order: 0,
      author_name: '',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      hotel_id: 'h',
      title: '환불 안내',
      body: '수수료',
      category: '결제/환불' as const,
      keywords: ['환불'],
      is_pinned: false,
      sort_order: 1,
      author_name: '',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ];
  const hits = searchSopArticles(articles, '119');
  assert.equal(hits[0]?.id, '1');
  const suggested = suggestSopArticles(articles, { title: '소음 컴플레인', details: '', category: '컴플레인' });
  assert.equal(suggested.length, 0);
});

import { calculateTaxiPrice } from '@/lib/taxi/destinations';
import { localizeDestination, formatSlipPrice, formatSlipRoom } from '@/lib/taxi/slip-i18n';
import { buildSlipHtml } from '@/lib/taxi/slip';
import { buildWhatsAppMessage } from '@/lib/taxi/whatsapp';
import { toTransportBookingDbPayload, type TransportBooking } from '@/lib/transport/types';

test('toTransportBookingDbPayload maps booker_name and memo to DB columns', () => {
  const row = toTransportBookingDbPayload({
    booker_name: 'Kim',
    memo: 'early pickup',
    room_number: '643',
  });
  assert.equal(row.guest_name, 'Kim');
  assert.equal(row.notes, 'early pickup');
  assert.equal('booker_name' in row, false);
  assert.equal('memo' in row, false);
});

test('calculateTaxiPrice for Incheon and Gimpo', () => {
  assert.equal(calculateTaxiPrice('인천공항 T1', '일반'), '85000');
  assert.equal(calculateTaxiPrice('인천공항 T2', '점보'), '105000');
  assert.equal(calculateTaxiPrice('김포공항 국제선', '일반'), '미터(약 45,000)');
});

test('slip i18n localizes destination, price, and room', () => {
  assert.equal(localizeDestination('인천공항 T1', 'en'), 'Incheon Airport Terminal 1');
  assert.equal(localizeDestination('인천공항 T1', 'zh'), '仁川国际机场 第一航站楼');
  assert.equal(localizeDestination('인천공항 T1', 'ko'), '인천공항 T1');
  assert.match(formatSlipPrice('85000', 'en'), /₩85,000/);
  assert.doesNotMatch(formatSlipPrice('85000', 'en'), /원/);
  assert.match(formatSlipPrice('85000', 'ko'), /원/);
  assert.equal(formatSlipRoom('801', 'en'), 'Room 801');
  assert.equal(formatSlipRoom('801', 'ja'), '801号室');
  assert.equal(formatSlipRoom('801', 'zh'), '801号房');
});

test('buildSlipHtml includes reservation details', () => {
  const html = buildSlipHtml(
    {
      id: '1',
      hotel_id: 'h',
      booking_date: '2026-06-11',
      pickup_time: '09:00:00',
      booking_type: 'taxi',
      room_number: '532',
      guest_name: 'Kim',
      booker_name: 'Kim',
      destination: '인천공항 T1',
      passengers: 2,
      baggage_count: 1,
      vehicle_type: '일반',
      price: '85000',
      vehicle_number: '',
      contact_phone: '',
      notes: '',
      memo: '',
      status: 'pending',
      author: '',
      created_by: '',
      updated_by: '',
      created_at: '',
      updated_at: '',
    },
    'ko',
  );
  assert.match(html, /택시 예약 확인증/);
  assert.match(html, /532/);
  assert.match(html, /slip__hero/);
  assert.match(html, /slip__driver/);
  assert.doesNotMatch(html, /<script/);

  const withPlate = buildSlipHtml(
    {
      id: '2',
      hotel_id: 'h',
      booking_date: '2026-06-11',
      pickup_time: '09:00:00',
      booking_type: 'taxi',
      room_number: '532',
      guest_name: 'Kim',
      booker_name: 'Kim',
      destination: '인천공항 T1',
      passengers: 2,
      baggage_count: 1,
      vehicle_type: '일반',
      price: '85000',
      vehicle_number: '12가3456',
      contact_phone: '',
      notes: '',
      memo: '',
      status: 'pending',
      author: '',
      created_by: '',
      updated_by: '',
      created_at: '',
      updated_at: '',
    },
    'ko',
  );
  assert.match(withPlate, /12가3456/);
  assert.match(withPlate, /차량번호/);

  const enSlip = buildSlipHtml(
    {
      id: '3',
      hotel_id: 'h',
      booking_date: '2026-06-11',
      pickup_time: '09:00:00',
      booking_type: 'taxi',
      room_number: '801',
      guest_name: 'TANAKA',
      booker_name: 'TANAKA',
      destination: '인천공항 T1',
      passengers: 1,
      baggage_count: 0,
      vehicle_type: '일반',
      price: '85000',
      vehicle_number: '',
      contact_phone: '',
      notes: '',
      memo: '',
      status: 'pending',
      author: '',
      created_by: '',
      updated_by: '',
      created_at: '',
      updated_at: '',
    },
    'en',
  );
  assert.match(enSlip, /Incheon Airport Terminal 1/);
  assert.match(enSlip, /₩85,000/);
  assert.match(enSlip, /기사님용 안내 \(For Driver\)/);
  assert.match(enSlip, /slip__driver-chip">인천공항 T1/);
  assert.match(enSlip, /slip__room-prefix">Room/);
  assert.match(enSlip, /slip__driver-chip">801호/);
});

test('buildWhatsAppMessage includes cancel prefix and closing line', () => {
  const base: TransportBooking = {
    id: '1',
    hotel_id: 'h',
    booking_date: '2026-07-07',
    pickup_time: '01:42:00',
    booking_type: 'taxi',
    room_number: '643',
    guest_name: 'Kim',
    booker_name: 'Kim',
    destination: '인천공항 T1',
    passengers: 1,
    baggage_count: 0,
    vehicle_type: '일반',
    price: '85000',
    vehicle_number: '',
    contact_phone: '',
    notes: '',
    memo: '',
    status: 'pending',
    author: '643',
    created_by: '643',
    updated_by: '643',
    created_at: '',
    updated_at: '',
  };
  const pending = buildWhatsAppMessage(base);
  assert.match(pending, /프레사인 명동/);
  assert.match(pending, /^643호, Kim/m);
  assert.doesNotMatch(pending, /^\[예약 취소\]/m);

  const jumbo = buildWhatsAppMessage({ ...base, vehicle_type: '점보', price: '105000' });
  assert.match(jumbo, /점보 요청/);

  const cancelled = buildWhatsAppMessage({ ...base, status: 'cancelled' });
  assert.match(cancelled, /^\[예약 취소\]/m);
});

test('computeTaxiDashboard aggregates revenue and rates', () => {
  const { computeTaxiDashboard, dashboardPeriodRange } = require('@/lib/taxi/dashboard') as typeof import('@/lib/taxi/dashboard');
  const today = '2026-06-08';
  const bookings = [
    {
      id: '1',
      booking_date: today,
      pickup_time: '10:00:00',
      destination: '인천공항 T1',
      vehicle_type: '일반',
      price: '80000',
      status: 'completed',
      created_by: '김직원',
      author: '김직원',
    },
    {
      id: '2',
      booking_date: today,
      pickup_time: '14:00:00',
      destination: '김포공항',
      vehicle_type: '점보',
      price: '100000',
      status: 'pending',
      created_by: '이직원',
      author: '이직원',
    },
    {
      id: '3',
      booking_date: '2026-06-01',
      pickup_time: '08:00:00',
      destination: '인천공항 T1',
      vehicle_type: '일반',
      price: '85000',
      status: 'cancelled',
      created_by: '김직원',
      author: '김직원',
    },
  ] as import('@/lib/transport/types').TransportBooking[];

  const stats = computeTaxiDashboard(bookings, today);
  assert.equal(stats.total, 3);
  assert.equal(stats.completed, 1);
  assert.equal(stats.pending, 1);
  assert.equal(stats.cancelled, 1);
  assert.equal(stats.revenue, 80000);
  assert.equal(stats.avgFare, 80000);
  assert.equal(stats.completionRate, 50);
  assert.equal(stats.cancelRate, 50);
  assert.equal(stats.jumboShare, 33);
  assert.equal(stats.today.total, 2);
  assert.equal(stats.today.revenue, 80000);
  assert.equal(stats.byDestination[0]?.destination, '인천공항 T1');
  assert.equal(stats.byStaff[0]?.name, '김직원');
  assert.equal(stats.byStaff[0]?.count, 2);

  const monthRange = dashboardPeriodRange('month', today);
  assert.equal(monthRange.from, '2026-06-01');
  assert.equal(monthRange.to, today);
});
