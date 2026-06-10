import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextBySearchQuery } from '@/lib/handover/card-utils';
import { monthDateRange } from '@/lib/schedule/month-range';
import { buildSummaryText, getExportFilename, hasSummaryContent } from '@/lib/handover/daily-summary';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { performReconciliation } from '@/lib/rate-confirm/compare-engine';
import { isStatusEqual, normalizeDate, normalizeRate } from '@/lib/rate-confirm/normalize';

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
