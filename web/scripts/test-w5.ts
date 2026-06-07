import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDateRange } from '@/lib/schedule/month-range';
import { buildSummaryText, getExportFilename, hasSummaryContent } from '@/lib/handover/daily-summary';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import type { ActivityLog, Card, Notice } from '@/lib/handover/types';

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
    column_id: 'urgent',
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
