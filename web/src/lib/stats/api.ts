import { DEFAULT_HOTEL_ID, SHIFTS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type {
  AmenityDayUsage,
  AmenityItemUsage,
  DayCount,
  ShiftCount,
  StatsData,
  StatsPeriod,
  StatsSummary,
} from '@/lib/stats/types';

function getDateRange(period: StatsPeriod) {
  const end = new Date();
  const start = new Date();
  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const rangeLabel =
    period === 'week'
      ? `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)} (최근 7일)`
      : `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)} (최근 30일)`;

  return {
    startDate,
    endDate,
    startIso: `${startDate}T00:00:00`,
    endIso: `${endDate}T23:59:59`,
    rangeLabel,
  };
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatDayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function aggregateHandoversByShift(logs: { shift: string }[]): ShiftCount[] {
  const map = new Map<string, number>();
  for (const shift of SHIFTS) map.set(shift, 0);
  map.set('미지정', 0);

  for (const log of logs) {
    const key = log.shift?.trim() || '미지정';
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const ordered: ShiftCount[] = SHIFTS.map((shift) => ({ shift, count: map.get(shift) ?? 0 }));
  const other = map.get('미지정') ?? 0;
  if (other > 0) ordered.push({ shift: '미지정', count: other });
  return ordered;
}

function aggregateByDay(
  items: { created_at: string }[],
  startDate: string,
  endDate: string,
): DayCount[] {
  const dates = enumerateDates(startDate, endDate);
  const map = new Map(dates.map((date) => [date, 0]));

  for (const item of items) {
    const date = item.created_at.slice(0, 10);
    if (map.has(date)) {
      map.set(date, (map.get(date) ?? 0) + 1);
    }
  }

  return dates.map((date) => ({
    date,
    label: formatDayLabel(date),
    count: map.get(date) ?? 0,
  }));
}

function calcUrgentHandlingMinutes(
  urgentCards: {
    id: string;
    created_at: string;
    card_acknowledgments: { acknowledged_at: string }[] | null;
  }[],
  doneMoves: { entity_id: string | null; created_at: string; details: { to?: string } | null }[],
) {
  const doneMoveMap = new Map<string, number>();

  for (const log of doneMoves) {
    if (!log.entity_id || log.details?.to !== 'done') continue;
    const ts = new Date(log.created_at).getTime();
    const existing = doneMoveMap.get(log.entity_id);
    if (existing == null || ts < existing) {
      doneMoveMap.set(log.entity_id, ts);
    }
  }

  const durations: number[] = [];

  for (const card of urgentCards) {
    const created = new Date(card.created_at).getTime();
    const acks = card.card_acknowledgments ?? [];
    const ackTimes = acks.map((ack) => new Date(ack.acknowledged_at).getTime());
    const doneTime = doneMoveMap.get(card.id);
    const candidates = [...ackTimes, ...(doneTime != null ? [doneTime] : [])];
    if (!candidates.length) continue;
    const resolvedAt = Math.min(...candidates);
    if (resolvedAt >= created) {
      durations.push((resolvedAt - created) / 60_000);
    }
  }

  const urgentAvgMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  return { durations, urgentAvgMinutes, urgentResolvedCount: durations.length };
}

function aggregateAmenityByItem(
  rows: {
    amenity_id: number;
    total_items: number;
    amenities: { name: string } | { name: string }[] | null;
  }[],
): AmenityItemUsage[] {
  const map = new Map<number, AmenityItemUsage>();

  for (const row of rows) {
    const amenity = Array.isArray(row.amenities) ? row.amenities[0] : row.amenities;
    const name = amenity?.name ?? `품목 ${row.amenity_id}`;
    const existing = map.get(row.amenity_id);
    if (existing) {
      existing.totalItems += row.total_items;
      existing.transactionCount += 1;
    } else {
      map.set(row.amenity_id, {
        amenityId: row.amenity_id,
        name,
        totalItems: row.total_items,
        transactionCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalItems - a.totalItems);
}

function shiftFromAuthor(author: string): string {
  const trimmed = author.trim();
  if (!trimmed) return '미지정';
  for (const shift of SHIFTS) {
    if (trimmed.startsWith(`${shift} `) || trimmed.startsWith(`${shift}·`) || trimmed.includes(`${shift} ·`)) {
      return shift;
    }
  }
  const first = trimmed.split('·')[0]?.trim();
  if (first && (SHIFTS as readonly string[]).includes(first)) return first;
  return '미지정';
}

function aggregateHkEbByDay(
  reports: {
    work_date: string;
    housekeeping_report_rooms:
      | { row_kind: string; extra_bed_action: string }[]
      | { row_kind: string; extra_bed_action: string }
      | null;
  }[],
  startDate: string,
  endDate: string,
): DayCount[] {
  const dates = enumerateDates(startDate, endDate);
  const map = new Map(dates.map((date) => [date, 0]));

  for (const report of reports) {
    const rooms = Array.isArray(report.housekeeping_report_rooms)
      ? report.housekeeping_report_rooms
      : report.housekeeping_report_rooms
        ? [report.housekeeping_report_rooms]
        : [];
    const count = rooms.filter(
      (room) =>
        room.row_kind === 'bed' &&
        (room.extra_bed_action === 'add' || room.extra_bed_action === 'remove'),
    ).length;
    if (map.has(report.work_date)) {
      map.set(report.work_date, (map.get(report.work_date) ?? 0) + count);
    }
  }

  return dates.map((date) => ({
    date,
    label: formatDayLabel(date),
    count: map.get(date) ?? 0,
  }));
}

function aggregateAmenityByDay(
  rows: { created_at: string; total_items: number }[],
  startDate: string,
  endDate: string,
): AmenityDayUsage[] {
  const dates = enumerateDates(startDate, endDate);
  const map = new Map(dates.map((date) => [date, 0]));

  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    if (map.has(date)) {
      map.set(date, (map.get(date) ?? 0) + row.total_items);
    }
  }

  return dates.map((date) => ({
    date,
    label: formatDayLabel(date),
    totalItems: map.get(date) ?? 0,
  }));
}

export function formatDurationMinutes(minutes: number | null) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function formatPercent(value: number | null) {
  if (value == null) return '—';
  return `${value}%`;
}

function calcPercent(completed: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((completed / total) * 100);
}

function todoInPeriod(
  todo: { due_date: string | null; created_at: string },
  startDate: string,
  endDate: string,
): boolean {
  if (todo.due_date) {
    return todo.due_date >= startDate && todo.due_date <= endDate;
  }
  const created = todo.created_at.slice(0, 10);
  return created >= startDate && created <= endDate;
}

type ReviewStatsRow = {
  id: string;
  created_at: string;
  follow_up_card_id: string | null;
};

/** follow_up_card_id 컬럼(013) 미적용 DB 호환 — 기본 조회는 id·created_at 만 */
async function fetchReviewsInPeriod(startIso: string, endIso: string): Promise<ReviewStatsRow[]> {
  const supabase = createClient();

  const basic = await supabase
    .from('guest_reviews')
    .select('id, created_at')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (basic.error) {
    console.warn('guest_reviews stats skipped:', basic.error.message);
    return [];
  }

  return (basic.data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    follow_up_card_id: null,
  }));
}

export async function fetchStatsData(period: StatsPeriod): Promise<StatsData> {
  const supabase = createClient();
  const { startDate, endDate, startIso, endIso, rangeLabel } = getDateRange(period);
  const dayCount = enumerateDates(startDate, endDate).length;

  const [
    createsRes,
    urgentRes,
    movesRes,
    amenityRes,
    urgentAcksRes,
    hkRes,
    checklistItemsRes,
    checklistCompletionsRes,
    todosRes,
  ] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('shift, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('entity_type', 'card')
      .eq('action', 'create')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('cards')
      .select('id, created_at, card_acknowledgments(acknowledged_at)')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('priority', 'urgent')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('activity_logs')
      .select('entity_id, created_at, details')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('entity_type', 'card')
      .eq('action', 'move')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('amenity_transactions')
      .select('created_at, total_items, amenity_id, author, amenities(name)')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('type', '출고')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('card_acknowledgments')
      .select('shift, acknowledged_at, cards!inner(priority, hotel_id)')
      .eq('cards.hotel_id', DEFAULT_HOTEL_ID)
      .eq('cards.priority', 'urgent')
      .gte('acknowledged_at', startIso)
      .lte('acknowledged_at', endIso),
    supabase
      .from('housekeeping_reports')
      .select('work_date, housekeeping_report_rooms(row_kind, extra_bed_action)')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .gte('work_date', startDate)
      .lte('work_date', endDate),
    supabase
      .from('checklist_items')
      .select('id')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('is_active', true),
    supabase
      .from('checklist_completions')
      .select('id, work_date, checklist_items!inner(hotel_id)')
      .eq('checklist_items.hotel_id', DEFAULT_HOTEL_ID)
      .gte('work_date', startDate)
      .lte('work_date', endDate),
    supabase
      .from('todos')
      .select('id, due_date, status, created_at, completed_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID),
  ]);

  if (createsRes.error) throw createsRes.error;
  if (urgentRes.error) throw urgentRes.error;
  if (movesRes.error) throw movesRes.error;
  if (amenityRes.error) throw amenityRes.error;
  if (urgentAcksRes.error) throw urgentAcksRes.error;
  if (hkRes.error) throw hkRes.error;
  if (checklistItemsRes.error) throw checklistItemsRes.error;
  if (checklistCompletionsRes.error) {
    console.warn('checklist_completions stats fallback:', checklistCompletionsRes.error.message);
  }
  if (todosRes.error) throw todosRes.error;

  const reviews = await fetchReviewsInPeriod(startIso, endIso);

  const creates = createsRes.data ?? [];
  const urgentCards = urgentRes.data ?? [];
  const doneMoves = movesRes.data ?? [];
  const amenityRows = amenityRes.data ?? [];
  const urgentAcks = urgentAcksRes.data ?? [];
  const hkReports = hkRes.data ?? [];

  const { urgentAvgMinutes, urgentResolvedCount } = calcUrgentHandlingMinutes(urgentCards, doneMoves);

  const amenityOutboundTotal = amenityRows.reduce((sum, row) => sum + row.total_items, 0);

  const activeChecklistItems = checklistItemsRes.data?.length ?? 0;
  const checklistCompletions = checklistCompletionsRes.data?.length ?? 0;
  const checklistExpected = activeChecklistItems * dayCount * SHIFTS.length;
  const checklistCompletionRate = calcPercent(checklistCompletions, checklistExpected);

  const todos = todosRes.data ?? [];
  const todosInPeriod = todos.filter((todo) => todoInPeriod(todo, startDate, endDate));
  const todoDueCount = todosInPeriod.length;
  const todoCompletedCount = todosInPeriod.filter(
    (todo) =>
      todo.status === 'done' &&
      todo.completed_at &&
      todo.completed_at >= startIso &&
      todo.completed_at <= endIso,
  ).length;
  const todoCompletionRate = calcPercent(todoCompletedCount, todoDueCount);

  const reviewCount = reviews.length;
  const reviewFollowUpCount = reviews.filter((review) => review.follow_up_card_id).length;
  const reviewFollowUpRate = calcPercent(reviewFollowUpCount, reviewCount);

  const summary: StatsSummary = {
    totalHandovers: creates.length,
    urgentCount: urgentCards.length,
    urgentResolvedCount,
    urgentAvgMinutes,
    amenityOutboundTotal,
    amenityTransactionCount: amenityRows.length,
    checklistCompletions,
    checklistCompletionRate,
    todoDueCount,
    todoCompletedCount,
    todoCompletionRate,
    reviewCount,
    reviewFollowUpCount,
    reviewFollowUpRate,
  };

  const amenityShiftRows = amenityRows.map((row) => ({ shift: shiftFromAuthor(row.author ?? '') }));
  const urgentAckShiftRows = urgentAcks.map((row) => ({ shift: row.shift?.trim() || '미지정' }));

  return {
    period,
    rangeLabel,
    startDate,
    endDate,
    summary,
    handoversByShift: aggregateHandoversByShift(creates),
    handoversByDay: aggregateByDay(creates, startDate, endDate),
    urgentAcksByShift: aggregateHandoversByShift(urgentAckShiftRows),
    amenityOutboundByShift: aggregateHandoversByShift(amenityShiftRows),
    hkEbByDay: aggregateHkEbByDay(hkReports, startDate, endDate),
    amenityByItem: aggregateAmenityByItem(amenityRows),
    amenityByDay: aggregateAmenityByDay(amenityRows, startDate, endDate),
  };
}
