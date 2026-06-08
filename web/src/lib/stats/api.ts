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
    endIso: `${endDate}T23:59:59.999Z`,
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

export async function fetchStatsData(period: StatsPeriod): Promise<StatsData> {
  const supabase = createClient();
  const { startDate, endDate, startIso, endIso, rangeLabel } = getDateRange(period);

  const [createsRes, urgentRes, movesRes, amenityRes] = await Promise.all([
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
      .select('created_at, total_items, amenity_id, amenities(name)')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('type', '출고')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
  ]);

  if (createsRes.error) throw createsRes.error;
  if (urgentRes.error) throw urgentRes.error;
  if (movesRes.error) throw movesRes.error;
  if (amenityRes.error) throw amenityRes.error;

  const creates = createsRes.data ?? [];
  const urgentCards = urgentRes.data ?? [];
  const doneMoves = movesRes.data ?? [];
  const amenityRows = amenityRes.data ?? [];

  const { urgentAvgMinutes, urgentResolvedCount } = calcUrgentHandlingMinutes(urgentCards, doneMoves);

  const amenityOutboundTotal = amenityRows.reduce((sum, row) => sum + row.total_items, 0);

  const summary: StatsSummary = {
    totalHandovers: creates.length,
    urgentCount: urgentCards.length,
    urgentResolvedCount,
    urgentAvgMinutes,
    amenityOutboundTotal,
    amenityTransactionCount: amenityRows.length,
  };

  return {
    period,
    rangeLabel,
    startDate,
    endDate,
    summary,
    handoversByShift: aggregateHandoversByShift(creates),
    handoversByDay: aggregateByDay(creates, startDate, endDate),
    amenityByItem: aggregateAmenityByItem(amenityRows),
    amenityByDay: aggregateAmenityByDay(amenityRows, startDate, endDate),
  };
}
