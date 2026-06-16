import test from 'node:test';
import assert from 'node:assert/strict';
import { isCardDueSoon, isCardOverdue, isCommentEdited, splitTextBySearchQuery, canDeleteCard } from '@/lib/handover/card-utils';
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
import { xpLevelProgress, xpToLevel } from '@/lib/staff/xp';
import { buildTodayAlerts } from '@/lib/today/alerts';
import type { CardComment } from '@/lib/handover/types';
import { buildAmenityOrderLines, buildAmenityOrderText } from '@/lib/amenity/order-sheet';
import { getKoreanHoliday, getKoreanHolidaysInMonth } from '@/lib/calendar/korean-holidays';
import { monthDateRange } from '@/lib/schedule/month-range';
import { buildSummaryText, getExportFilename, hasSummaryContent } from '@/lib/handover/daily-summary';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { consolidateTlNotificationRows, performReconciliation } from '@/lib/rate-confirm/compare-engine';
import { isStatusEqual, normalizeDate, normalizeRate } from '@/lib/rate-confirm/normalize';
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
});

test('today taxi bar text shows overdue message', () => {
  const {
    formatTodayTaxiBarText,
    isPickupOverdue,
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
  assert.match(formatTodayTaxiBarText(booking, before), /택시 예약 · 1207호/);
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
  assert.equal(parsed!.account, 'Booking.com');
});

test('parseOtaReviewPaste detects google stars', () => {
  const { parseOtaReviewPaste } = require('@/lib/reviews/parse-ota') as typeof import('@/lib/reviews/parse-ota');
  const parsed = parseOtaReviewPaste('Google review\n★★★★★\nGreat stay, friendly staff.');
  assert.ok(parsed);
  assert.equal(parsed!.ota_source, 'google');
  assert.equal(parsed!.rating, 5);
  assert.equal(parsed!.sentiment, 'positive');
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
  const { cardFormSnapshotsEqual } = require('@/lib/handover/card-draft') as typeof import('@/lib/handover/card-draft');
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

test('isDoneTodoHiddenFromList hides done todos older than 7 days', () => {
  const {
    DONE_TODO_HIDE_AFTER_DAYS,
    isDoneTodoHiddenFromList,
    isPastHotelEvent,
    todayDateString,
  } = require('@/lib/work-items/schedule-filters') as typeof import('@/lib/work-items/schedule-filters');

  assert.equal(DONE_TODO_HIDE_AFTER_DAYS, 7);

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
    true,
  );
  assert.equal(isPastHotelEvent({ event_date: '2026-06-07' }, todayDateString(now)), true);
  assert.equal(isPastHotelEvent({ event_date: '2026-06-08' }, todayDateString(now)), false);
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
});

test('ticker navigation hrefs', () => {
  assert.equal(getTickerItemHref('idle'), null);
  assert.equal(getTickerItemHref('notice-abc'), '/notices?id=abc');
  assert.equal(getTickerItemHref('unacked-card-1'), '/handover?card=card-1');
  assert.equal(getTickerItemHref('due-soon-x'), '/handover?card=x');
  assert.equal(isTickerItemClickable('urgent-1'), true);
  assert.equal(getTickerActionLabel('unacked-1'), '확인하기');
  assert.equal(getTickerActionLabel('notice-1'), '읽기');
  assert.equal(getTickerActionLabel('urgent-1'), '열기');
});

test('xp level progress', () => {
  assert.equal(xpToLevel(0), 1);
  assert.equal(xpToLevel(99), 1);
  assert.equal(xpToLevel(100), 2);
  const p = xpLevelProgress(150);
  assert.equal(p.level, 2);
  assert.equal(p.inLevel, 50);
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
    canDeleteCard(card, { isManager: false, userId: 'user-1', staffName: 'Lee', authorLabel: 'B조 · Lee' }),
    true,
  );
  assert.equal(
    canDeleteCard(card, { isManager: false, userId: null, staffName: 'Kim', authorLabel: 'B조 · Kim' }),
    true,
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
