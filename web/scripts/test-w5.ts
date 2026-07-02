import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextWithLinks } from '@/lib/text/linkify';
import { isCardDueSoon, isCardOverdue, isCommentEdited, splitTextBySearchQuery, canDeleteCard, findDuplicateCards, titlesAreSimilar, isCardSnoozed, getStaleLevel, getHoldStaleLevel, isStaleCard, isLongHoldCard, needsComplaintFirstResponse } from '@/lib/handover/card-utils';
import {
  formatComplaintRemedies,
  hasComplaintRemedies,
  sanitizeComplaintRemediesForCategory,
} from '@/lib/handover/complaint-remedies';
import { buildAttachmentPublicUrl } from '@/lib/handover/attachments';
import {
  getTickerActionLabel,
  getTickerItemHref,
  isTickerItemClickable,
} from '@/lib/handover/ticker-nav';
import {
  findScheduledGroupForStaff,
  getSessionScheduleMismatch,
} from '@/lib/schedule/session-schedule-match';
import { pinnedNotices, unreadPinnedCount } from '@/lib/notices/reads';
import { buildTodayAlerts } from '@/lib/today/alerts';
import type { CardComment } from '@/lib/handover/types';
import { buildAmenityOrderLines, buildAmenityOrderText } from '@/lib/amenity/order-sheet';
import { buildAmenityTransactionsCsv, getAmenityTransactionsExportFilename } from '@/lib/amenity/export';
import { getKoreanHoliday, getKoreanHolidaysInMonth } from '@/lib/calendar/korean-holidays';
import { monthDateRange } from '@/lib/schedule/month-range';
import { buildPrintDocumentHtml, buildSummaryText, getExportFilename, hasSummaryContent } from '@/lib/handover/daily-summary';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { consolidateTlNotificationRows, performReconciliation } from '@/lib/rate-confirm/compare-engine';
import { isDateEqual, isStatusEqual, normalizeDate, normalizeRate } from '@/lib/rate-confirm/normalize';
import {
  detectRateFileFormat,
  guessColumnMapping,
  PMS_RESERVATION_LIST_HEADERS,
  TL_BOOKING_SEARCH_HEADERS,
} from '@/lib/rate-confirm/parse';
import {
  computeNextDueDate,
  describeRecurrence,
  nextDailyDueDate,
  nextMonthlyDueDate,
  nextWeeklyDueDate,
} from '@/lib/todos/recurrence';

test('monthDateRange uses last day of month', () => {
  assert.deepEqual(monthDateRange('2026-06'), { start: '2026-06-01', end: '2026-06-30' });
  assert.deepEqual(monthDateRange('2026-02'), { start: '2026-02-01', end: '2026-02-28' });
});

test('getKoreanHoliday returns fixed and lunar holidays', () => {
  assert.equal(getKoreanHoliday('2026-06-06'), '현충일');
  assert.equal(getKoreanHoliday('2026-02-17'), '설날');
  assert.equal(getKoreanHoliday('2026-09-25'), '추석');
  assert.equal(getKoreanHoliday('2026-06-07'), null);
});

test('getKoreanHolidaysInMonth lists holidays in month', () => {
  const holidays = getKoreanHolidaysInMonth('2026-02');
  assert.equal(holidays.get('2026-02-17'), '설날');
  assert.equal(holidays.size, 3);
});

test('buildAmenityOrderLines includes only items needing reorder', () => {
  const lines = buildAmenityOrderLines([
    {
      id: 1,
      hotel_id: 'h',
      name: '샴푸',
      box_size: 50,
      unit_size: 10,
      sort_order: 0,
      quantity: 20,
      minQuantity: 10,
      monthlyUsage: 80,
      remainingBoxes: 2,
      orderBoxes: 2,
    },
    {
      id: 2,
      hotel_id: 'h',
      name: '비누',
      box_size: 40,
      unit_size: 8,
      sort_order: 1,
      quantity: 200,
      minQuantity: 10,
      monthlyUsage: 30,
      remainingBoxes: 25,
      orderBoxes: 0,
    },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.name, '샴푸');
  assert.match(buildAmenityOrderText(lines), /샴푸/);
});

test('buildAmenityTransactionsCsv includes headers and escaped memo', () => {
  const csv = buildAmenityTransactionsCsv([
    {
      id: 'tx-1',
      hotel_id: 'h',
      created_at: '2026-06-08T09:30:00.000Z',
      type: '출고',
      amenity_id: 1,
      box_count: 2,
      total_items: 20,
      author: 'A조 · 홍길동',
      memo: '3층, "비치"',
      amenities: { name: '샴푸' },
    },
  ]);

  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /"일시","구분","품목","수량\(개\)","박스수","작성자","메모"/);
  assert.match(csv, /"출고","샴푸","20","2"/);
  assert.match(csv, /3층, ""비치"""/);
});

test('getAmenityTransactionsExportFilename uses amenity prefix', () => {
  const name = getAmenityTransactionsExportFilename(new Date('2026-06-08T12:00:00'));
  assert.equal(name, '어메니티_입출고_20260608.csv');
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

test('buildPrintDocumentHtml uses compact A4 layout', () => {
  const card = {
    id: '1',
    column_id: 'progress',
    title: '테스트 카드',
    priority: 'normal',
    card_acknowledgments: [],
    author: '김프런',
    created_at: '2026-06-08T10:00:00',
    updated_at: '2026-06-08T10:00:00',
  } as Card;
  const data = buildShiftSummaryData([card], []);
  const html = buildPrintDocumentHtml(data, [], '주간 · 김프런');
  assert.match(html, /@page \{ size: A4 portrait/);
  assert.match(html, /sections-grid/);
  assert.match(html, /교대 인계 요약/);
  assert.match(html, /현재 진행중/);
});

test('splitTextBySearchQuery highlights matching segments', () => {
  assert.deepEqual(splitTextBySearchQuery('1207 VIP 민원', 'vip'), [
    { text: '1207 ', match: false },
    { text: 'VIP', match: true },
    { text: ' 민원', match: false },
  ]);
  assert.deepEqual(splitTextBySearchQuery('민원 처리', ''), [{ text: '민원 처리', match: false }]);
});

test('leave validation blocks holidays and enforces daily cap', () => {
  const {
    isDateBlocked,
    resolveLeaveStatus,
    getTargetMonth,
  } = require('@/lib/leave/validation') as typeof import('@/lib/leave/validation');
  const policy = {
    max_days_per_month: 4,
    max_staff_per_day: 2,
    apply_month_offset: 1,
    application_open_day: 1,
    application_close_day: 20,
  };
  const blocked = [{ id: '1', hotel_id: 'h', block_month: 12, block_day: 25, label: '크리스마스' }];
  assert.equal(isDateBlocked('2026-12-25', blocked), true);
  assert.equal(isDateBlocked('2026-12-24', blocked), false);

  const blockedResult = resolveLeaveStatus('2026-12-25', '김', false, [], policy, blocked);
  assert.equal(blockedResult.ok, false);

  const requests = [
    {
      id: 'a',
      hotel_id: 'h',
      staff_name: '이',
      work_group: 'A',
      leave_date: '2026-07-10',
      status: 'approved' as const,
      is_exception: false,
      reason: '',
      reviewed_by: null,
      reviewed_at: null,
      created_at: '',
    },
    {
      id: 'b',
      hotel_id: 'h',
      staff_name: '박',
      work_group: 'B',
      leave_date: '2026-07-10',
      status: 'approved' as const,
      is_exception: false,
      reason: '',
      reviewed_by: null,
      reviewed_at: null,
      created_at: '',
    },
  ];
  const fullDay = resolveLeaveStatus('2026-07-10', '김', false, requests, policy, blocked);
  assert.equal(fullDay.ok, false);
  if (!fullDay.ok) assert.match(fullDay.error, /마감/);

  const exception = resolveLeaveStatus('2026-07-11', '김', true, requests, policy, blocked);
  assert.equal(exception.ok, true);
  if (exception.ok) assert.equal(exception.status, 'pending_review');

  const nextMonth = getTargetMonth(new Date(2026, 5, 8), 1);
  assert.equal(nextMonth, '2026-07');

  const { requestsForDateOrdered } = require('@/lib/leave/validation') as typeof import('@/lib/leave/validation');
  const ordered = requestsForDateOrdered(
    [
      { ...requests[0]!, created_at: '2026-06-15T00:02:00.000Z' },
      { ...requests[1]!, created_at: '2026-06-15T00:01:00.000Z' },
    ],
    '2026-07-10',
  );
  assert.equal(ordered[0]?.staff_name, '박');
  assert.equal(ordered[1]?.staff_name, '이');
});

test('isCommentEdited when updated_at differs from created_at', () => {
  const base: CardComment = {
    id: '1',
    card_id: 'c1',
    shift: 'A',
    staff_name: '홍길동',
    content: '도착',
    created_at: '2026-06-08T10:00:00.000Z',
  };
  assert.equal(isCommentEdited(base), false);
  assert.equal(isCommentEdited({ ...base, updated_at: base.created_at }), false);
  assert.equal(isCommentEdited({ ...base, updated_at: '2026-06-08T11:00:00.000Z' }), true);
});

test('comment audit labels for edit and delete', () => {
  const { formatDeletedCommentLabel, formatEditedCommentLabel, isCommentDeleted } =
    require('@/lib/handover/card-utils') as typeof import('@/lib/handover/card-utils');
  const comment: CardComment = {
    id: '1',
    card_id: 'c1',
    shift: 'A',
    staff_name: '홍길동',
    content: '도착',
    created_at: '2026-06-08T10:00:00.000Z',
    updated_at: '2026-06-08T11:00:00.000Z',
    edited_by_shift: 'B',
    edited_by_name: '김두',
    deleted_at: '2026-06-08T12:00:00.000Z',
    deleted_by_shift: 'C',
    deleted_by_name: '이삼',
  };
  assert.equal(isCommentDeleted(comment), true);
  assert.equal(formatEditedCommentLabel(comment), '수정됨 · B · 김두');
  assert.equal(formatDeletedCommentLabel(comment), '삭제된 댓글 (C · 이삼)');
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

test('detects PMS reservation list export columns', () => {
  const headers = ['ota_no', 'guest_name', 'sts', 'room_rate', 'total_amount', 'account', 'arr_date'];
  assert.equal(detectRateFileFormat(headers), 'pms_reservation_list');
  const mapping = guessColumnMapping(headers, 'pms');
  assert.equal(mapping.rate, PMS_RESERVATION_LIST_HEADERS.rate);
  assert.equal(mapping.rate, 'total_amount');
  assert.notEqual(mapping.rate, 'room_rate');
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
  assert.equal(normalizeDate('2026/06/19'), '2026-06-19');
  assert.equal(normalizeDate('06/19/2026'), '2026-06-19');
  assert.equal(normalizeDate('06-19-2026'), '2026-06-19');
  assert.equal(isDateEqual('2026-05-20', '06/19/2026'), false);
  assert.equal(isDateEqual('2026-06-19', '06/19/2026'), true);
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

test('nextDailyDueDate adds days', () => {
  assert.equal(nextDailyDueDate('2026-06-11'), '2026-06-12');
  assert.equal(nextDailyDueDate('2026-06-11', 3), '2026-06-14');
});

test('nextWeeklyDueDate adds 7 days', () => {
  assert.equal(nextWeeklyDueDate('2026-06-11'), '2026-06-18');
  assert.equal(nextWeeklyDueDate('2026-06-11', 2), '2026-06-25');
});

test('nextMonthlyDueDate keeps day and clamps month end', () => {
  assert.equal(nextMonthlyDueDate('2026-01-31'), '2026-02-28');
  assert.equal(nextMonthlyDueDate('2026-03-15'), '2026-04-15');
  assert.equal(nextMonthlyDueDate('2026-03-15', 2), '2026-05-15');
});

test('describeRecurrence labels daily weekly and monthly', () => {
  assert.equal(describeRecurrence({ recurrence_kind: 'daily', recurrence_interval: 1, due_date: '2026-06-11' }), '매일');
  assert.equal(
    describeRecurrence({ recurrence_kind: 'weekly', recurrence_interval: 1, due_date: '2026-06-11' }),
    '매주 목요일',
  );
  assert.equal(
    describeRecurrence({ recurrence_kind: 'weekly', recurrence_interval: 2, due_date: '2026-06-11' }),
    '2주마다 목요일',
  );
  assert.equal(
    describeRecurrence({ recurrence_kind: 'monthly', recurrence_interval: 1, due_date: '2026-06-15' }),
    '매월 15일',
  );
  assert.equal(computeNextDueDate('2026-06-11', 'weekly', 1), '2026-06-18');
});

test('transport alerts within 30 minutes', () => {
  const {
    filterUpcomingTransportAlerts,
    isUpcomingTransportAlert,
    minutesUntilPickup,
  } = require('@/lib/transport/alerts') as typeof import('@/lib/transport/alerts');

  const now = new Date('2026-06-08T09:40:00');
  const soon = {
    id: '1',
    status: 'pending',
    booking_date: '2026-06-08',
    pickup_time: '10:00:00',
  } as import('@/lib/transport/types').TransportBooking;
  const later = {
    id: '2',
    status: 'pending',
    booking_date: '2026-06-08',
    pickup_time: '11:30:00',
  } as import('@/lib/transport/types').TransportBooking;
  const done = { ...soon, id: '3', status: 'completed' } as import('@/lib/transport/types').TransportBooking;

  assert.equal(minutesUntilPickup(soon, now), 20);
  assert.equal(isUpcomingTransportAlert(soon, 30, now), true);
  assert.equal(isUpcomingTransportAlert(later, 30, now), false);
  assert.equal(isUpcomingTransportAlert(done, 30, now), false);
  assert.deepEqual(filterUpcomingTransportAlerts([soon, later, done], 30, now).map((b) => b.id), ['1']);
});

test('mergeWorkScheduleItems combines todos and events by date', () => {
  const { mergeWorkScheduleItems } = require('@/lib/work-items/merge') as typeof import('@/lib/work-items/merge');

  const todos = [
    {
      id: 't1',
      due_date: '2026-06-17',
      status: 'open',
    },
    {
      id: 't2',
      due_date: null,
      status: 'open',
    },
  ] as import('@/lib/todos/types').Todo[];

  const events = [
    {
      id: 'e1',
      event_date: '2026-06-17',
      end_date: null,
      start_time: '14:00:00',
      end_time: '18:00:00',
      category: '교육',
      title: 'CPR',
    },
  ] as import('@/lib/events/types').HotelEvent[];

  const merged = mergeWorkScheduleItems({ todos, events, month: '2026-06' });
  assert.equal(merged.length, 3);
  assert.equal(merged[0].kind, 'event');
  assert.equal(merged[1].kind, 'todo');

  const spanning = mergeWorkScheduleItems({
    todos: [],
    events: [
      {
        id: 'e2',
        event_date: '2026-05-28',
        end_date: '2026-06-05',
        start_time: null,
        end_time: null,
        category: '점검',
        title: '장기 점검',
      },
    ] as import('@/lib/events/types').HotelEvent[],
    month: '2026-06',
  });
  assert.equal(spanning.length, 1);
});

test('hotel event date range helpers', () => {
  const {
    getEventEndDate,
    isDateInEventRange,
    eventOverlapsMonth,
    eachEventDateInMonth,
    normalizeEventEndDate,
    formatEventDateRange,
  } = require('@/lib/events/event-dates') as typeof import('@/lib/events/event-dates');

  const event = { event_date: '2026-06-10', end_date: '2026-06-14' };
  assert.equal(getEventEndDate(event), '2026-06-14');
  assert.equal(isDateInEventRange('2026-06-12', event), true);
  assert.equal(isDateInEventRange('2026-06-15', event), false);
  assert.equal(eventOverlapsMonth(event, '2026-06'), true);
  assert.equal(eventOverlapsMonth(event, '2026-07'), false);
  assert.deepEqual(eachEventDateInMonth(event, '2026-06'), [
    '2026-06-10',
    '2026-06-11',
    '2026-06-12',
    '2026-06-13',
    '2026-06-14',
  ]);
  assert.equal(normalizeEventEndDate('2026-06-10', '2026-06-10'), null);
  assert.equal(normalizeEventEndDate('2026-06-10', '2026-06-12'), '2026-06-12');
  assert.match(formatEventDateRange('2026-06-10', '2026-06-14'), /6\. 10\./);
});

test('today taxi bar text shows overdue message', () => {
  const {
    formatTodayTaxiBarText,
    isPickupOverdue,
    isUpcomingTransportAlert,
  } = require('@/lib/transport/alerts') as typeof import('@/lib/transport/alerts');

  const booking = {
    id: '1',
    status: 'pending',
    booking_date: '2026-06-08',
    pickup_time: '10:00:00',
    room_number: '1207',
    guest_name: '홍길동',
    destination: '공항',
  } as import('@/lib/transport/types').TransportBooking;

  const before = new Date('2026-06-08T09:40:00');
  const after = new Date('2026-06-08T10:05:00');

  assert.equal(isPickupOverdue(booking, before), false);
  assert.equal(isPickupOverdue(booking, after), true);
  assert.equal(isUpcomingTransportAlert(booking, 30, before), true);
  assert.match(formatTodayTaxiBarText(booking, before), /20분 후 픽업 · 1207호/);
  assert.equal(formatTodayTaxiBarText(booking, after), '시간이 지났습니다. 택시 예약을 확인해주세요.');
});

test('parseOtaReviewPaste extracts booking fields and sentiment', () => {
  const { parseOtaReviewPaste } = require('@/lib/reviews/parse-ota') as typeof import('@/lib/reviews/parse-ota');
  const text = [
    'Booking.com',
    'Guest name: Jane Doe',
    'Reservation number: 9876543210',
    'Room number: 1207',
    'Check-in: 2026-06-01',
    'Check-out: 2026-06-03',
    'Score: 2/10',
    'The room was dirty and very noisy.',
  ].join('\n');

  const parsed = parseOtaReviewPaste(text);
  assert.ok(parsed);
  assert.equal(parsed!.ota_source, 'booking');
  assert.equal(parsed!.guest_name, 'Jane Doe');
  assert.equal(parsed!.reservation_number, '9876543210');
  assert.equal(parsed!.room_number, '1207');
  assert.equal(parsed!.check_in_date, '2026-06-01');
  assert.equal(parsed!.check_out_date, '2026-06-03');
  assert.equal(parsed!.sentiment, 'negative');
  assert.equal(parsed!.account, '부킹닷컴');
});

test('parseOtaReviewPaste detects google stars', () => {
  const { parseOtaReviewPaste } = require('@/lib/reviews/parse-ota') as typeof import('@/lib/reviews/parse-ota');
  const parsed = parseOtaReviewPaste('Google review\n★★★★★\nGreat stay, friendly staff.');
  assert.ok(parsed);
  assert.equal(parsed!.ota_source, 'google');
  assert.equal(parsed!.rating, 5);
  assert.equal(parsed!.sentiment, 'positive');
});

test('buildReviewPrintHtml includes recipient and review body', () => {
  const { buildReviewPrintHtml } = require('@/lib/reviews/print') as typeof import('@/lib/reviews/print');
  const html = buildReviewPrintHtml(
    {
      id: 'r1',
      hotel_id: 'h1',
      sentiment: 'negative',
      content_original: 'Room was dirty',
      content_ko: '객실이 더러웠습니다.',
      guest_name: 'Jane Doe',
      check_in_date: '2026-06-01',
      check_out_date: '2026-06-03',
      reservation_number: 'BK-1',
      author: '홍길동',
      follow_up_card_id: null,
      room_number: '1207',
      room_action_completed_at: null,
      room_action_completed_by: '',
      ota_source: 'booking',
      rating: 2,
      account: '부킹닷컴',
      is_anonymous: false,
      is_active: true,
      created_at: '2026-06-08T10:00:00',
      updated_at: '2026-06-08T10:00:00',
    },
    'housekeeping',
    new Date('2026-06-08T12:00:00'),
  );

  assert.match(html, /하우스키핑 전달/);
  assert.match(html, /1207호/);
  assert.match(html, /객실이 더러웠습니다\./);
  assert.match(html, /Room was dirty/);
});

test('review identity helpers treat anonymous google reviews', () => {
  const {
    formatReviewGuestLabel,
    isReviewAnonymous,
    normalizeReviewInput,
    shouldSuggestAnonymousReview,
  } = require('@/lib/reviews/identity') as typeof import('@/lib/reviews/identity');

  const anonymousReview = {
    is_anonymous: true,
    guest_name: '',
    reservation_number: '',
    check_in_date: null,
    check_out_date: null,
  };

  assert.equal(isReviewAnonymous(anonymousReview), true);
  assert.equal(formatReviewGuestLabel(anonymousReview), '익명');
  assert.equal(
    shouldSuggestAnonymousReview({
      ota_source: 'google',
      guest_name: '',
      reservation_number: '',
      check_in_date: null,
      check_out_date: null,
    }),
    true,
  );

  const normalized = normalizeReviewInput({
    sentiment: 'negative',
    content_original: 'Bad',
    content_ko: '나쁨',
    guest_name: 'Kim',
    reservation_number: '123',
    check_in_date: '2026-06-01',
    check_out_date: '2026-06-02',
    room_number: '',
    author: '홍길동',
    is_anonymous: true,
  });

  assert.equal(normalized.guest_name, '');
  assert.equal(normalized.reservation_number, '');
  assert.equal(normalized.check_in_date, null);
});

test('facility stats include archived cards in room history', () => {
  const {
    buildFacilitySummaries,
    getRoomFacilityIssues,
    getOpenFacilityIssues,
    mergeFacilityCardSources,
  } = require('@/lib/facility/facility-stats') as typeof import('@/lib/facility/facility-stats');

  const active = {
    id: '1',
    category: '시설',
    room: '1207',
    title: '에어컨 고장',
    column_id: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  } as import('@/lib/handover/types').Card;

  const archived = {
    ...active,
    id: '2',
    title: '누수 발생',
    archived_at: new Date().toISOString(),
  };

  const merged = mergeFacilityCardSources([active], [archived]);
  const history = getRoomFacilityIssues(merged, '1207');
  assert.equal(history.length, 2);
  assert.equal(getOpenFacilityIssues(merged).length, 0);

  const summaries = buildFacilitySummaries(merged);
  assert.equal(summaries[0]?.totalCount, 2);
  assert.equal(summaries[0]?.openCount, 0);
});

test('cardFormSnapshotsEqual detects unsaved edits', () => {
  const { cardFormSnapshotsEqual, normalizeCardInput } = require('@/lib/handover/card-draft') as typeof import('@/lib/handover/card-draft');
  const base = {
    form: {
      column_id: 'progress' as const,
      priority: 'today' as const,
      category: '기타',
      room: '',
      title: '제목',
      details: '상세',
      resolution: '',
      next_action: '',
      author: 'A',
      assignee_shift: 'A',
      assignee_name: 'Kim',
      due_at: null,
    },
    dueDate: '',
    dueTime: '',
  };
  assert.equal(cardFormSnapshotsEqual(base, base), true);
  assert.equal(
    cardFormSnapshotsEqual(base, {
      ...base,
      form: { ...base.form, details: '수정됨' },
    }),
    false,
  );
  const legacy = normalizeCardInput({
    column_id: 'progress',
    priority: 'today',
    category: '기타',
    room: '',
    title: '제목',
    details: '',
    resolution: '',
    next_action: '',
    author: '',
    assignee_shift: '',
    assignee_name: '',
    due_at: null,
  });
  assert.deepEqual(legacy.complaint_remedies, []);
  assert.equal(legacy.complaint_remedy_other, '');
});

test('sessionProgressLabel summarizes rate confirm item status', () => {
  const { sessionProgressLabel } = require('@/lib/rate-confirm/session-payload') as typeof import('@/lib/rate-confirm/session-payload');
  assert.equal(sessionProgressLabel([]), '불일치 없음');
  assert.equal(
    sessionProgressLabel([
      { resolution_status: 'pending' },
      { resolution_status: 'resolved' },
    ]),
    '처리 1/2 · 미처리 1',
  );
  assert.equal(
    sessionProgressLabel([
      { resolution_status: 'resolved' },
      { resolution_status: 'skipped' },
    ]),
    '전체 처리 (2/2)',
  );
});

test('isLongPreviewText detects multiline and long single-line card bodies', () => {
  const { CARD_BODY_PREVIEW_MAX_LINES, isLongPreviewText } =
    require('@/lib/handover/card-body-preview') as typeof import('@/lib/handover/card-body-preview');

  assert.equal(CARD_BODY_PREVIEW_MAX_LINES, 4);
  assert.equal(isLongPreviewText('짧은 메모'), false);
  assert.equal(isLongPreviewText('1\n2\n3\n4'), false);
  assert.equal(isLongPreviewText('1\n2\n3\n4\n5'), true);
  assert.equal(isLongPreviewText('a'.repeat(241)), true);
});

test('isDoneTodoHiddenFromList hides done todos older than 30 days', () => {
  const {
    DONE_TODO_HIDE_AFTER_DAYS,
    isDoneTodoHiddenFromList,
    matchesTodoOpenFilter,
    matchesEventOpenFilter,
    isPastHotelEvent,
    isCompletedHotelEvent,
    isPastOrCompletedHotelEvent,
    todayDateString,
  } = require('@/lib/work-items/schedule-filters') as typeof import('@/lib/work-items/schedule-filters');

  assert.equal(DONE_TODO_HIDE_AFTER_DAYS, 30);

  const now = new Date('2026-06-08T12:00:00');
  assert.equal(
    isDoneTodoHiddenFromList({ status: 'open', completed_at: null }, now),
    false,
  );
  assert.equal(
    isDoneTodoHiddenFromList({ status: 'done', completed_at: '2026-06-08T09:00:00Z' }, now),
    false,
  );
  assert.equal(
    isDoneTodoHiddenFromList({ status: 'done', completed_at: '2026-05-31T09:00:00Z' }, now),
    false,
  );
  assert.equal(
    isDoneTodoHiddenFromList({ status: 'done', completed_at: '2026-05-01T09:00:00Z' }, now),
    true,
  );
  assert.equal(
    matchesTodoOpenFilter({ status: 'done', completed_at: '2026-05-31T09:00:00Z' }, now),
    true,
  );
  assert.equal(
    matchesTodoOpenFilter({ status: 'done', completed_at: '2026-05-01T09:00:00Z' }, now),
    false,
  );
  assert.equal(matchesEventOpenFilter({ completed_at: null }, now), true);
  assert.equal(matchesEventOpenFilter({ completed_at: '2026-06-01T09:00:00Z' }, now), true);
  assert.equal(matchesEventOpenFilter({ completed_at: '2026-04-01T09:00:00Z' }, now), false);
  assert.equal(isPastHotelEvent({ event_date: '2026-06-07', end_date: null }, todayDateString(now)), true);
  assert.equal(isPastHotelEvent({ event_date: '2026-06-08', end_date: null }, todayDateString(now)), false);
  assert.equal(
    isPastHotelEvent({ event_date: '2026-06-05', end_date: '2026-06-07' }, todayDateString(now)),
    true,
  );
  assert.equal(
    isPastHotelEvent({ event_date: '2026-06-05', end_date: '2026-06-10' }, todayDateString(now)),
    false,
  );
  assert.equal(isCompletedHotelEvent({ completed_at: null }), false);
  assert.equal(isCompletedHotelEvent({ completed_at: '2026-06-08T09:00:00Z' }), true);
  assert.equal(
    isPastOrCompletedHotelEvent({ event_date: '2026-06-08', completed_at: '2026-06-08T09:00:00Z' }, todayDateString(now)),
    true,
  );
  assert.equal(
    isPastOrCompletedHotelEvent({ event_date: '2026-06-09', completed_at: null }, todayDateString(now)),
    false,
  );
});

test('notice completed status helpers', () => {
  const {
    isNoticeCompleted,
    isNoticeExpired,
    isNoticeActiveForFeed,
    filterNoticesForFeed,
  } = require('@/lib/notices/status') as typeof import('@/lib/notices/status');
  const {
    filterNoticesForBoard,
    countNoticesForBoardTab,
  } = require('@/lib/notices/filter') as typeof import('@/lib/notices/filter');

  const today = '2026-06-08';
  const active = {
    id: '1',
    type: 'announcement',
    content: 'active',
    completed_at: null,
    expires_at: '2026-06-30',
    is_pinned: false,
    author: '주간',
    hotel_id: 'h',
    created_at: '2026-06-08T00:00:00Z',
    updated_at: '2026-06-08T00:00:00Z',
  } as import('@/lib/handover/types').Notice;
  const done = { ...active, id: '2', completed_at: '2026-06-08T09:00:00Z' };
  const expired = { ...active, id: '3', expires_at: '2026-06-01' };

  assert.equal(isNoticeCompleted(done), true);
  assert.equal(isNoticeCompleted(active), false);
  assert.equal(isNoticeExpired(expired, today), true);
  assert.equal(isNoticeActiveForFeed(done, today), false);
  assert.equal(isNoticeActiveForFeed(active, today), true);
  assert.equal(isNoticeActiveForFeed(expired, today), false);
  assert.deepEqual(filterNoticesForFeed([active, done], today).map((n) => n.id), ['1']);
  assert.deepEqual(
    filterNoticesForBoard([active, done], {
      tab: 'completed',
      searchQuery: '',
    }).map((n) => n.id),
    ['2'],
  );
  assert.equal(countNoticesForBoardTab([active, done], 'announcement'), 1);
  assert.equal(countNoticesForBoardTab([active, done], 'completed'), 1);
});

test('card due soon and overdue helpers', () => {
  const now = Date.now();
  const base = {
    column_id: 'progress' as const,
    due_at: null,
    hotel_id: 'h',
    priority: 'today' as const,
    category: '기타',
    room: '',
    title: 't',
    details: '',
    resolution: '',
    next_action: '',
    author: '',
    assignee_shift: '',
    assignee_name: '',
    sort_order: 0,
    archived_at: null,
    linked_todo_id: null,
    created_at: '',
    updated_at: '',
    card_acknowledgments: [],
    card_comments: [],
    card_attachments: [],
    id: 'c1',
  };

  assert.equal(isCardOverdue({ ...base, due_at: new Date(now - 60_000).toISOString() }), true);
  assert.equal(isCardDueSoon({ ...base, due_at: new Date(now + 30 * 60_000).toISOString() }), true);
  assert.equal(isCardDueSoon({ ...base, due_at: new Date(now + 2 * 3600_000).toISOString() }), false);
  assert.equal(isCardOverdue({ ...base, column_id: 'done', due_at: new Date(now - 60_000).toISOString() }), false);
  assert.equal(
    isCardOverdue({
      ...base,
      due_at: new Date(now - 60_000).toISOString(),
      snoozed_until: new Date(now + 60_000).toISOString(),
    }),
    false,
  );
  assert.equal(isCardSnoozed({ ...base, snoozed_until: new Date(now + 60_000).toISOString() }, now), true);
  assert.equal(isCardSnoozed({ ...base, snoozed_until: new Date(now - 60_000).toISOString() }, now), false);
});

test('titlesAreSimilar and findDuplicateCards', () => {
  assert.equal(titlesAreSimilar('301 냉장고 고장', '301 냉장고 고장'), true);
  assert.equal(titlesAreSimilar('냉장고 소음', '냉장고 소음 확인'), true);
  assert.equal(titlesAreSimilar('조식 추가', '체크아웃 연장'), false);

  const cards = [
    {
      id: 'a',
      column_id: 'progress' as const,
      archived_at: null,
      room: '301',
      title: '냉장고 소음',
      hotel_id: 'h',
      priority: 'today' as const,
      category: '기타',
      details: '',
      resolution: '',
      next_action: '',
      author: '',
      assignee_shift: '',
      assignee_name: '',
      sort_order: 0,
      linked_todo_id: null,
      created_at: '',
      updated_at: '',
      due_at: null,
      card_acknowledgments: [],
      card_comments: [],
      card_attachments: [],
    },
    {
      id: 'b',
      column_id: 'done' as const,
      archived_at: null,
      room: '301',
      title: '냉장고 소음 완료',
      hotel_id: 'h',
      priority: 'today' as const,
      category: '기타',
      details: '',
      resolution: '',
      next_action: '',
      author: '',
      assignee_shift: '',
      assignee_name: '',
      sort_order: 0,
      linked_todo_id: null,
      created_at: '',
      updated_at: '',
      due_at: null,
      card_acknowledgments: [],
      card_comments: [],
      card_attachments: [],
    },
  ];

  const dupes = findDuplicateCards(cards, { room: '301', title: '냉장고 소음 확인' });
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0]?.id, 'a');
  assert.equal(findDuplicateCards(cards, { room: '301', title: '냉장고 소음 확인', excludeCardId: 'a' }).length, 0);
});

test('stale and long hold helpers', () => {
  const now = Date.now();
  const progressBase = {
    column_id: 'progress' as const,
    hotel_id: 'h',
    priority: 'today' as const,
    category: '기타',
    room: '',
    title: 't',
    details: '',
    resolution: '',
    next_action: '',
    author: '',
    assignee_shift: '',
    assignee_name: '',
    sort_order: 0,
    archived_at: null,
    linked_todo_id: null,
    created_at: new Date(now - 5 * 3_600_000).toISOString(),
    updated_at: new Date(now - 5 * 3_600_000).toISOString(),
    due_at: null,
    card_acknowledgments: [],
    card_comments: [],
    card_attachments: [],
    id: 'stale-1',
  };

  assert.equal(getStaleLevel(progressBase, now), 'mid');
  assert.equal(getStaleLevel({ ...progressBase, updated_at: new Date(now - 13 * 3_600_000).toISOString() }, now), 'high');
  assert.equal(getStaleLevel({ ...progressBase, column_id: 'hold' }, now), '');
  assert.equal(isStaleCard(progressBase, now), true);

  const holdBase = {
    ...progressBase,
    id: 'hold-1',
    column_id: 'hold' as const,
    updated_at: new Date(now - 25 * 3_600_000).toISOString(),
  };
  assert.equal(getHoldStaleLevel(holdBase, now), 'mid');
  assert.equal(getHoldStaleLevel({ ...holdBase, updated_at: new Date(now - 50 * 3_600_000).toISOString() }, now), 'high');
  assert.equal(isLongHoldCard(holdBase, now), true);

  assert.equal(
    needsComplaintFirstResponse({
      ...progressBase,
      category: '컴플레인',
      first_response_at: null,
    }),
    true,
  );
  assert.equal(
    needsComplaintFirstResponse({
      ...progressBase,
      category: '컴플레인',
      first_response_at: new Date(now).toISOString(),
    }),
    false,
  );
});

test('complaint remedy helpers', () => {
  assert.equal(
    formatComplaintRemedies(['breakfast', 'gift_card'], ''),
    '조식권 · 기프트 카드 보상 (약 1만원 상당)',
  );
  assert.equal(formatComplaintRemedies(['amenity'], '와인 1병'), '어메니티 · 기타: 와인 1병');
  assert.equal(hasComplaintRemedies([], ''), false);
  assert.equal(hasComplaintRemedies(['snacks'], ''), true);

  assert.deepEqual(sanitizeComplaintRemediesForCategory('기타', ['breakfast'], 'x'), {
    complaint_remedies: [],
    complaint_remedy_other: '',
  });
  assert.deepEqual(sanitizeComplaintRemediesForCategory('컴플레인', ['breakfast', 'invalid'], '  쿠폰 '), {
    complaint_remedies: ['breakfast'],
    complaint_remedy_other: '쿠폰',
  });
  assert.equal(formatComplaintRemedies(['none_provided'], ''), '제공하지 않음');
});

test('splitTextWithLinks detects http(s) URLs and preserves trailing punctuation', () => {
  const parts = splitTextWithLinks('안내: https://docs.google.com/edit?usp=sharing 참고');
  assert.equal(parts.length, 3);
  assert.deepEqual(parts[0], { type: 'text', value: '안내: ' });
  assert.equal(parts[1]?.type, 'link');
  if (parts[1]?.type === 'link') {
    assert.equal(parts[1].href, 'https://docs.google.com/edit?usp=sharing');
  }
  assert.deepEqual(parts[2], { type: 'text', value: ' 참고' });
});

test('ticker navigation hrefs', () => {
  assert.equal(getTickerItemHref('idle'), null);
  assert.equal(getTickerItemHref('notice-abc'), '/work?tab=notices&id=abc');
  assert.equal(getTickerItemHref('unacked-card-1'), '/handover?card=card-1');
  assert.equal(getTickerItemHref('due-soon-x'), '/handover?card=x');
  assert.equal(isTickerItemClickable('urgent-1'), true);
  assert.equal(getTickerActionLabel('unacked-1'), '확인하기');
  assert.equal(getTickerActionLabel('notice-1'), '읽기');
  assert.equal(getTickerActionLabel('urgent-1'), '열기');
});

test('buildTodayAlerts includes card due alerts', () => {
  const now = Date.now();
  const card = {
    id: '1',
    column_id: 'progress' as const,
    due_at: new Date(now - 1000).toISOString(),
    hotel_id: 'h',
    priority: 'today' as const,
    category: '기타',
    room: '',
    title: 'late',
    details: '',
    resolution: '',
    next_action: '',
    author: '',
    assignee_shift: '',
    assignee_name: '',
    sort_order: 0,
    archived_at: null,
    linked_todo_id: null,
    created_at: '',
    updated_at: '',
    card_acknowledgments: [],
    card_comments: [],
    card_attachments: [],
  };
  const alerts = buildTodayAlerts({ unackedUrgent: [], cards: [card], todos: [], events: [] });
  assert.ok(alerts.some((a) => a.id === 'due-overdue-cards'));
});

test('parseSchedulePaste reads excel-style monthly matrix', () => {
  const { parseSchedulePaste } = require('@/lib/schedule/parse-csv') as typeof import('@/lib/schedule/parse-csv');
  const text = [
    '날짜\tA조\tB조\tC조',
    '1\t김프런\t이데스크\t최야간',
    '2\t박체크, 김프런\t이데스크\t-',
    '3\t최야간\t박체크\t김프런',
  ].join('\n');

  const parsed = parseSchedulePaste(text, '2026-06');
  assert.ok(!('error' in parsed));
  assert.equal(parsed.format, 'matrix');
  assert.equal(parsed.entries.length, 9);
  assert.deepEqual(
    parsed.entries.filter((entry) => entry.work_date === '2026-06-02' && entry.shift === 'A').map((entry) => entry.staff_name),
    ['박체크', '김프런'],
  );
});

test('parseSchedulePaste still supports long csv rows', () => {
  const { parseSchedulePaste } = require('@/lib/schedule/parse-csv') as typeof import('@/lib/schedule/parse-csv');
  const text = [
    '날짜,조,이름',
    '2026-06-01,A조,김프런',
    '2026-06-01,B조,이데스크',
  ].join('\n');

  const parsed = parseSchedulePaste(text, '2026-06');
  assert.ok(!('error' in parsed));
  assert.equal(parsed.format, 'long');
  assert.equal(parsed.entries.length, 2);
});

test('session schedule mismatch detection', () => {
  const schedule = {
    work_date: '2026-06-12',
    groups: { A: ['Kim'], B: [], C: [], D: [], E: [] },
  };
  assert.equal(findScheduledGroupForStaff(schedule as never, 'Kim'), 'A');
  assert.equal(
    getSessionScheduleMismatch({ shift: 'B', group: 'B', name: 'Kim' }, schedule as never)?.scheduledGroup,
    'A',
  );
  assert.equal(getSessionScheduleMismatch({ shift: 'A', group: 'A', name: 'Kim' }, schedule as never), null);
});

test('canDeleteCard allows manager, author account, and legacy author label', () => {
  const card = {
    author: 'B조 · Kim',
    created_by: 'user-1',
  } as Parameters<typeof canDeleteCard>[0];

  assert.equal(canDeleteCard(card, { isManager: true, userId: null, staffName: '', authorLabel: '' }), true);
  assert.equal(
    canDeleteCard(card, { isManager: false, userId: 'user-1', staffName: 'Kim', authorLabel: 'B조 · Kim' }),
    true,
  );
  assert.equal(
    canDeleteCard(card, { isManager: false, userId: null, staffName: 'Kim', authorLabel: 'B조 · Kim' }),
    true,
  );
  assert.equal(
    canDeleteCard(card, { isManager: false, userId: 'user-2', staffName: 'Kim', authorLabel: 'B조 · Kim' }),
    false,
  );
  assert.equal(
    canDeleteCard(card, { isManager: false, userId: null, staffName: 'Lee', authorLabel: 'B조 · Lee' }),
    false,
  );
});

test('unread pinned notice count', () => {
  const notices = [
    { id: 'n1', is_pinned: true } as { id: string; is_pinned: boolean },
    { id: 'n2', is_pinned: false } as { id: string; is_pinned: boolean },
  ];
  const reads = [{ notice_id: 'n1', staff_name: 'Kim' } as { notice_id: string; staff_name: string }];
  assert.equal(unreadPinnedCount(pinnedNotices(notices as never), reads as never, 'Kim'), 0);
  assert.equal(unreadPinnedCount(pinnedNotices(notices as never), reads as never, 'Lee'), 1);
});

test('notice expiry urgency within 7 days', () => {
  const {
    daysUntilNoticeExpiry,
    getNoticeExpiryUrgency,
    filterNoticesExpiringSoon,
    formatNoticeExpiryAlertDetail,
  } = require('@/lib/notices/expiry') as typeof import('@/lib/notices/expiry');

  const today = '2026-06-08';
  assert.equal(daysUntilNoticeExpiry('2026-06-08', today), 0);
  assert.equal(getNoticeExpiryUrgency({ expires_at: '2026-06-08' }, today), 'today');
  assert.equal(getNoticeExpiryUrgency({ expires_at: '2026-06-11' }, today), 'soon');
  assert.equal(getNoticeExpiryUrgency({ expires_at: '2026-06-15' }, today), 'week');
  assert.equal(getNoticeExpiryUrgency({ expires_at: '2026-06-20' }, today), null);
  assert.equal(
    filterNoticesExpiringSoon(
      [
        { expires_at: '2026-06-10' },
        { expires_at: '2026-06-20' },
        { expires_at: null },
      ] as import('@/lib/handover/types').Notice[],
      7,
      today,
    ).length,
    1,
  );
  assert.equal(
    formatNoticeExpiryAlertDetail({ expires_at: '2026-06-09' } as import('@/lib/handover/types').Notice, today),
    '내일 만료',
  );
});

test('hk handover draft card input', () => {
  const {
    canCreateHandoverFromStatusNote,
    cardInputFromHkStatusNote,
    cardInputFromHkSpecialRoom,
  } = require('@/lib/housekeeping/handover-draft') as typeof import('@/lib/housekeeping/handover-draft');

  assert.equal(canCreateHandoverFromStatusNote('hk_out_of_order'), true);
  assert.equal(canCreateHandoverFromStatusNote('hk_house_use'), false);

  const fromNote = cardInputFromHkStatusNote('hk_out_of_order', '1502 O.O', 'A조 · Kim');
  assert.match(fromNote.title ?? '', /1502/);
  assert.match(fromNote.details ?? '', /하우스키핑/);

  const fromRoom = cardInputFromHkSpecialRoom(
    {
      room_number: '1207',
      is_vip: true,
      is_long_stay: false,
      early_checkin: '07:00',
      notes: '조용한 객실 요청',
    },
    'A조 · Kim',
  );
  assert.match(fromRoom.title ?? '', /1207/);
  assert.match(fromRoom.title ?? '', /VIP/);
});

test('transport needs input within 30 minutes', () => {
  const {
    transportNeedsInput,
    transportNeedsInputMissingLabels,
    isTransportNeedsInputImminent,
    filterTransportNeedsInput,
  } = require('@/lib/transport/alerts') as typeof import('@/lib/transport/alerts');

  const now = new Date('2026-06-08T09:40:00');
  const incomplete = {
    id: '1',
    status: 'pending',
    booking_date: '2026-06-08',
    pickup_time: '10:00:00',
    room_number: '',
    guest_name: '',
    vehicle_number: '',
  } as import('@/lib/transport/types').TransportBooking;
  const complete = {
    ...incomplete,
    id: '2',
    room_number: '1207',
    guest_name: '홍길동',
    vehicle_number: '12가3456',
  } as import('@/lib/transport/types').TransportBooking;

  assert.equal(transportNeedsInput(incomplete), true);
  assert.deepEqual(transportNeedsInputMissingLabels(incomplete), ['객실', '게스트', '차량번호']);
  assert.equal(transportNeedsInput(complete), false);
  assert.equal(isTransportNeedsInputImminent(incomplete, 30, now), true);
  assert.equal(isTransportNeedsInputImminent(complete, 30, now), false);
  assert.equal(filterTransportNeedsInput([incomplete, complete]).length, 1);
});

test('room search recent stores up to 5 unique terms', () => {
  const { rememberRoomSearch, loadRecentRoomSearches } =
    require('@/lib/room-search/recent') as typeof import('@/lib/room-search/recent');

  const storage = new Map<string, string>();
  const original = globalThis.sessionStorage;
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
  });
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
  });

  try {
    rememberRoomSearch('1502');
    rememberRoomSearch('키오스크');
    rememberRoomSearch('1502');
    rememberRoomSearch('홍길동');
    rememberRoomSearch('세프로');
    rememberRoomSearch('공항');
    rememberRoomSearch('VIP');
    const recent = loadRecentRoomSearches();
    assert.equal(recent[0], 'VIP');
    assert.equal(recent.length, 5);
    assert.ok(!recent.includes('1502') || recent.indexOf('1502') > 0);
  } finally {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: original });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});

test('parcel delivery token hash is stable', () => {
  const { generateDeliveryToken, hashDeliveryToken, buildParcelSignUrl } =
    require('@/lib/parcels/tokens') as typeof import('@/lib/parcels/tokens');

  const token = 'test-token-value';
  assert.equal(hashDeliveryToken(token), hashDeliveryToken(token));
  assert.notEqual(hashDeliveryToken('a'), hashDeliveryToken('b'));

  const generated = generateDeliveryToken();
  assert.ok(generated.length >= 32);
  assert.match(buildParcelSignUrl('https://hotel.example.com', generated), /^https:\/\/hotel\.example\.com\/parcels\/sign\//);
});

test('parcel input validation requires room or reservation', () => {
  const { validateParcelInput } = require('@/lib/parcels/validate') as typeof import('@/lib/parcels/validate');
  const { emptyParcelInput } = require('@/lib/parcels/types') as typeof import('@/lib/parcels/types');

  const base = emptyParcelInput('staff');
  assert.match(validateParcelInput(base), /객실번호 또는 예약번호/);

  assert.equal(validateParcelInput({ ...base, room_number: '1207' }), null);

  assert.match(validateParcelInput({ ...base, reservation_number: 'RSV-100' }), /체크인 예정일/);

  assert.equal(
    validateParcelInput({
      ...base,
      reservation_number: 'RSV-100',
      check_in_date: '2026-06-10',
    }),
    null,
  );

  assert.match(
    validateParcelInput({ ...base, room_number: '1207', reservation_number: 'RSV-100' }),
    /하나만/,
  );
});

test('parcel overdue helper', () => {
  const { isParcelOverdue } = require('@/lib/parcels/types') as typeof import('@/lib/parcels/types');

  const now = new Date('2026-06-08T12:00:00');
  const recent = {
    status: 'stored',
    received_at: '2026-06-07T10:00:00Z',
  } as import('@/lib/parcels/types').Parcel;
  const old = {
    status: 'stored',
    received_at: '2026-06-01T10:00:00Z',
  } as import('@/lib/parcels/types').Parcel;
  const done = {
    status: 'delivered',
    received_at: '2026-06-01T10:00:00Z',
  } as import('@/lib/parcels/types').Parcel;

  assert.equal(isParcelOverdue(recent, 3, now), false);
  assert.equal(isParcelOverdue(old, 3, now), true);
  assert.equal(isParcelOverdue(done, 3, now), false);
});

test('parcel delivery urgency warns for stored items due today', () => {
  const {
    getParcelDeliveryUrgency,
    parcelDeliveryUrgencyMessage,
  } = require('@/lib/parcels/types') as typeof import('@/lib/parcels/types');

  const today = '2026-06-08';
  const checkoutToday = {
    status: 'stored',
    checkout_date: today,
    check_in_date: '',
  } as import('@/lib/parcels/types').Parcel;
  const checkinToday = {
    status: 'stored',
    checkout_date: '',
    check_in_date: today,
  } as import('@/lib/parcels/types').Parcel;
  const delivered = {
    status: 'delivered',
    checkout_date: today,
    check_in_date: '',
  } as import('@/lib/parcels/types').Parcel;

  assert.equal(getParcelDeliveryUrgency(checkoutToday, today), 'checkout_today');
  assert.equal(parcelDeliveryUrgencyMessage('checkout_today'), '꼭 전달해주세요.');
  assert.equal(getParcelDeliveryUrgency(checkinToday, today), 'checkin_today');
  assert.equal(parcelDeliveryUrgencyMessage('checkin_today'), '체크인 시 꼭 전달하세요.');
  assert.equal(getParcelDeliveryUrgency(delivered, today), null);
  assert.equal(getParcelDeliveryUrgency(checkoutToday, '2026-06-09'), null);
});

test('review pending follow-up hides completed and linked reviews', () => {
  const {
    filterPendingFollowUpReviews,
    isReviewPendingFollowUp,
  } = require('@/lib/reviews/pending-follow-up') as typeof import('@/lib/reviews/pending-follow-up');

  const now = new Date('2026-06-08T12:00:00').getTime();
  const pending = {
    sentiment: 'negative',
    follow_up_card_id: null,
    room_action_completed_at: null,
    created_at: '2026-06-07T10:00:00Z',
  } as import('@/lib/reviews/types').GuestReview;
  const completed = {
    ...pending,
    room_action_completed_at: '2026-06-07T12:00:00Z',
  } as import('@/lib/reviews/types').GuestReview;
  const linked = {
    ...pending,
    follow_up_card_id: 'card-1',
  } as import('@/lib/reviews/types').GuestReview;

  assert.equal(isReviewPendingFollowUp(pending, now), true);
  assert.equal(isReviewPendingFollowUp(completed, now), false);
  assert.equal(isReviewPendingFollowUp(linked, now), false);
  assert.equal(filterPendingFollowUpReviews([pending, completed, linked], now).length, 1);
});

test('brief memo converts to today todo input', () => {
  const { briefMemoToTodoInput } = require('@/lib/todos/brief-memo') as typeof import('@/lib/todos/brief-memo');
  const { todayDateString } = require('@/lib/handover/shift-summary') as typeof import('@/lib/handover/shift-summary');

  const input = briefMemoToTodoInput('1207호 수건 확인\nVIP 도착 전 점검', {
    author: 'B조 · 강두훈',
    assigneeName: '강두훈',
    assigneeShift: 'B',
  });

  assert.equal(input.title, '1207호 수건 확인');
  assert.equal(input.description, 'VIP 도착 전 점검');
  assert.equal(input.due_date, todayDateString());
  assert.equal(input.assignee_name, '강두훈');
});

test('parcel board filter hides completed from active tabs and supports completed tab sections', () => {
  const {
    filterParcelsForBoard,
    isParcelHiddenAfterCompletion,
    isParcelCompletedToday,
    splitCompletedParcels,
  } = require('@/lib/parcels/filter') as typeof import('@/lib/parcels/filter');

  const now = new Date('2026-06-08T12:00:00');
  const active = {
    id: '1',
    direction: 'out_to_room',
    status: 'stored',
    room_number: '1207',
    guest_name: 'Kim',
    checkout_date: '2026-06-09',
    storage_slot: '',
    description: '박스',
    received_at: '2026-06-08T08:00:00Z',
    delivered_at: null,
    updated_at: '2026-06-08T08:00:00Z',
    recipient_name: '',
    notes: '',
  } as import('@/lib/parcels/types').Parcel;

  const recentDone = {
    ...active,
    id: '2',
    status: 'delivered',
    delivered_at: '2026-06-08T10:00:00Z',
  } as import('@/lib/parcels/types').Parcel;

  const oldDone = {
    ...active,
    id: '3',
    status: 'delivered',
    delivered_at: '2026-06-06T10:00:00Z',
  } as import('@/lib/parcels/types').Parcel;

  assert.equal(isParcelHiddenAfterCompletion(oldDone, now), true);
  assert.equal(isParcelHiddenAfterCompletion(recentDone, now), false);
  assert.equal(isParcelCompletedToday(recentDone, now), true);
  assert.equal(isParcelCompletedToday(oldDone, now), false);

  const outTab = filterParcelsForBoard([active, recentDone, oldDone], 'out_to_room', '', 'all', now);
  assert.deepEqual(outTab.map((p) => p.id), ['1']);

  const completedTab = filterParcelsForBoard([active, recentDone, oldDone], 'completed', '', 'all', now);
  assert.equal(completedTab.length, 2);

  const sections = splitCompletedParcels(completedTab, now);
  assert.deepEqual(sections.today.map((p) => p.id), ['2']);
  assert.deepEqual(sections.earlier.map((p) => p.id), ['3']);

  const completedSearch = filterParcelsForBoard(
    [{ ...oldDone, guest_name: 'Park' }, recentDone],
    'completed',
    'Kim',
    'all',
    now,
  );
  assert.equal(completedSearch.length, 1);
  assert.equal(completedSearch[0]?.id, '2');
});

test('parseRoomFloor extracts hotel floors', () => {
  const { parseRoomFloor } = require('@/lib/insights/room-floor') as typeof import('@/lib/insights/room-floor');

  assert.equal(parseRoomFloor('1202'), 12);
  assert.equal(parseRoomFloor('416'), 4);
  assert.equal(parseRoomFloor('1302'), 13);
  assert.equal(parseRoomFloor(''), null);
});

test('buildFloorHeatmap aggregates by floor', () => {
  const { buildFloorHeatmap } = require('@/lib/insights/floor-heatmap') as typeof import('@/lib/insights/floor-heatmap');

  const now = new Date('2026-06-08T12:00:00').getTime();
  const result = buildFloorHeatmap({
    lookbackDays: 7,
    now,
    cards: [
      {
        id: 'c-complaint',
        room: '1207',
        category: '컴플레인',
        title: '에어컨 소음',
        details: '',
        created_at: '2026-06-07T10:00:00Z',
      },
      {
        id: 'c-facility',
        room: '1202',
        category: '시설',
        title: '샤워기 수압',
        details: '',
        created_at: '2026-06-06T10:00:00Z',
      },
    ] as import('@/lib/handover/types').Card[],
    reviews: [
      {
        id: 'r1',
        room_number: '1207',
        sentiment: 'negative',
        content_ko: '방이 너무 시끄러웠습니다',
        content_original: '',
        is_active: true,
        created_at: '2026-06-07T11:00:00Z',
      },
    ] as import('@/lib/reviews/types').GuestReview[],
  });

  const floor12 = result.cells.find((cell) => cell.floor === 12);
  assert.ok(floor12);
  assert.ok((floor12?.totalScore ?? 0) > 0);
  assert.equal(floor12?.complaintCount, 1);
  assert.equal(floor12?.negativeReviewCount, 1);
  assert.equal(floor12?.recentEvents.length, 3);
  assert.ok(floor12?.recentEvents.some((event) => event.title.includes('에어컨')));
});

test('isStaleRefreshError detects invalid refresh token', () => {
  const { isStaleRefreshError } =
    require('@/lib/supabase/auth-session') as typeof import('@/lib/supabase/auth-session');

  assert.equal(isStaleRefreshError('refresh_token_not_found'), true);
  assert.equal(isStaleRefreshError('invalid_refresh_token'), true);
  assert.equal(isStaleRefreshError(undefined, 'Invalid Refresh Token: Refresh Token Not Found'), true);
  assert.equal(isStaleRefreshError('other'), false);
});

test('parcel sign i18n formats room labels', () => {
  const { formatParcelSignRoom, translateParcelSignApiError } =
    require('@/lib/parcels/sign-i18n') as typeof import('@/lib/parcels/sign-i18n');

  assert.equal(formatParcelSignRoom('1207', 'ko'), '1207호');
  assert.equal(formatParcelSignRoom('1207', 'en'), 'Room 1207');
  assert.equal(formatParcelSignRoom('1207', 'ja'), '1207号室');
  assert.ok(
    translateParcelSignApiError('만료되었거나 이미 사용된 링크입니다.', 'en').includes('expired'),
  );
});

test('buildLiveBoardFeed groups urgent and warn items', () => {
  const { buildLiveBoardFeed } = require('@/lib/live-board/build-feed') as typeof import('@/lib/live-board/build-feed');

  const feed = buildLiveBoardFeed({
    notices: [],
    cards: [
      {
        id: 'c1',
        priority: 'urgent',
        column_id: 'progress',
        room: '1207',
        title: '키오스크 이상',
        card_acknowledgments: [],
      },
    ] as import('@/lib/handover/types').Card[],
  });

  assert.ok(feed.summaries.length > 0);
  assert.ok(feed.items.some((item) => item.id.startsWith('unacked-')));
});

test('office supply batch picks bi-weekly Wednesday', () => {
  const { getNextOrderDate, resolveActiveBatchKey, addOrderCycle } =
    require('@/lib/office-supplies/batch') as typeof import('@/lib/office-supplies/batch');

  assert.equal(getNextOrderDate(new Date('2026-01-07')), '2026-01-07');
  assert.equal(getNextOrderDate(new Date('2026-01-08')), '2026-01-21');
  assert.equal(getNextOrderDate(new Date('2026-06-22')), '2026-06-24');
  assert.equal(resolveActiveBatchKey(['2026-06-24'], new Date('2026-06-22')), addOrderCycle('2026-06-24'));
});

test('office supply order export aggregates duplicate product codes', () => {
  const { aggregateOfficeSupplyOrderLines, buildOfficeSupplyOrderText } =
    require('@/lib/office-supplies/order-export') as typeof import('@/lib/office-supplies/order-export');

  const lines = aggregateOfficeSupplyOrderLines([
    {
      id: '1',
      hotel_id: 'h',
      batch_id: 'b',
      product_code: '313890',
      product_name: '3M 포스트잇 알뜰팩 653-5A',
      image_url: '',
      unit: '개',
      quantity: 2,
      note: '',
      requested_by: 'A',
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      hotel_id: 'h',
      batch_id: 'b',
      product_code: '313890',
      product_name: '3M 포스트잇 알뜰팩 653-5A',
      image_url: '',
      unit: '개',
      quantity: 1,
      note: '회의실',
      requested_by: 'B',
      created_at: '',
      updated_at: '',
    },
  ]);

  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 3);
  assert.match(buildOfficeSupplyOrderText(lines, '2026-06-24'), /\[313890\]/);
});

test('parseOfficetownListHtml extracts product code and image', () => {
  const { parseOfficetownListHtml } =
    require('@/lib/office-supplies/officetown') as typeof import('@/lib/office-supplies/officetown');

  const html = `
    <td width="20%" valign="top">
      <p><a href="m_mall_detail.php?ps_ctid=04080100&ps_goid=34549"><img src="/mall/shop_image/test.jpg" /></a></p>
      <p class="goods_grid_bookcode">[313890]</p>
      <p class="goods_grid_name"><a href="m_mall_detail.php?ps_ctid=04080100&ps_goid=34549">3M 포스트잇 알뜰팩 653-5A</a></p>
    </td>`;

  const products = parseOfficetownListHtml(html);
  assert.equal(products.length, 1);
  assert.equal(products[0].productCode, '313890');
  assert.equal(products[0].name, '3M 포스트잇 알뜰팩 653-5A');
  assert.match(products[0].imageUrl, /shop_image\/test\.jpg$/);
});

test('evaluateOfficetownCrawlHealth detects layout marker loss', () => {
  const { evaluateOfficetownCrawlHealth, buildOfficetownLayoutFingerprint } =
    require('@/lib/office-supplies/officetown-health') as typeof import('@/lib/office-supplies/officetown-health');

  const healthyHtml = `
    <td width="20%" valign="top">
      <p><a href="m_mall_detail.php?ps_ctid=04080100&ps_goid=34549"><img src="/mall/shop_image/test.jpg" /></a></p>
      <p class="goods_grid_bookcode">[313890]</p>
      <p class="goods_grid_name"><a href="#">3M 포스트잇 알뜰팩 653-5A</a></p>
    </td>`;

  const healthy = evaluateOfficetownCrawlHealth({
    probeSearchHtml: healthyHtml,
    probeCategoryHtml: healthyHtml,
    probeProductCode: '313890',
  });
  assert.equal(healthy.status, 'healthy');
  assert.equal(healthy.probeOk, true);

  const broken = evaluateOfficetownCrawlHealth({
    probeSearchHtml: "<script>document.location.href = 'index.php'</script>",
    probeCategoryHtml: healthyHtml,
    probeProductCode: '313890',
  });
  assert.equal(broken.status, 'broken');

  const previousFingerprint = buildOfficetownLayoutFingerprint(
    require('@/lib/office-supplies/officetown-health').analyzeOfficetownListHtml(healthyHtml),
    require('@/lib/office-supplies/officetown-health').analyzeOfficetownListHtml(healthyHtml),
  );
  const changedHtml = healthyHtml.replace('goods_grid_bookcode', 'goods_grid_code');
  const degraded = evaluateOfficetownCrawlHealth({
    probeSearchHtml: changedHtml,
    probeCategoryHtml: healthyHtml,
    probeProductCode: '313890',
    previousFingerprint,
    previousStatus: 'healthy',
  });
  assert.equal(degraded.fingerprintChanged, true);
  assert.equal(degraded.status, 'degraded');
});

test('buildAttachmentPublicUrl composes public storage path without API call', () => {
  const url = buildAttachmentPublicUrl(
    'hotel-1/card-1/photo 1.jpg',
    'https://example.supabase.co/',
  );
  assert.equal(
    url,
    'https://example.supabase.co/storage/v1/object/public/card-attachments/hotel-1/card-1/photo%201.jpg',
  );
});
