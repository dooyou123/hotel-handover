import { pickupDateTime } from '@/lib/taxi/format';
import { parsePriceAsNumber } from '@/lib/taxi/destinations';
import type { TransportBooking, TransportStatus } from '@/lib/transport/types';

export type TaxiDashboardStats = {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  revenue: number;
  avgFare: number;
  completionRate: number;
  cancelRate: number;
  jumboShare: number;
  byMonth: { month: string; label: string; count: number; revenue: number }[];
  byDestination: {
    destination: string;
    count: number;
    completed: number;
    revenue: number;
  }[];
  byVehicleType: { vehicleType: string; count: number; revenue: number }[];
  byTimeSlot: { slot: string; label: string; count: number }[];
  byStaff: { name: string; count: number }[];
  today: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
  upcoming: TransportBooking[];
};

const TIME_SLOTS = [
  { slot: 'dawn', label: '새벽 (00–05)', from: 0, to: 5 },
  { slot: 'morning', label: '오전 (06–11)', from: 6, to: 11 },
  { slot: 'afternoon', label: '오후 (12–17)', from: 12, to: 17 },
  { slot: 'evening', label: '저녁 (18–23)', from: 18, to: 23 },
] as const;

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function formatMonthLabel(key: string): string {
  const [, m] = key.split('-');
  return `${Number(m)}월`;
}

function pickupHour(booking: TransportBooking): number {
  const h = Number(booking.pickup_time.slice(0, 2));
  return Number.isNaN(h) ? 12 : h;
}

function fareAmount(booking: TransportBooking): number {
  return parsePriceAsNumber(booking.price) ?? 0;
}

export function computeTaxiDashboard(
  bookings: TransportBooking[],
  today: string,
): TaxiDashboardStats {
  const completed = bookings.filter((b) => b.status === 'completed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const pending = bookings.filter((b) => b.status === 'pending');

  const revenue = completed.reduce((sum, b) => sum + fareAmount(b), 0);
  const avgFare = completed.length ? Math.round(revenue / completed.length) : 0;
  const decided = completed.length + cancelled.length;
  const completionRate = decided ? Math.round((completed.length / decided) * 100) : 0;
  const cancelRate = decided ? Math.round((cancelled.length / decided) * 100) : 0;
  const jumboCount = bookings.filter((b) => b.vehicle_type === '점보').length;
  const jumboShare = bookings.length ? Math.round((jumboCount / bookings.length) * 100) : 0;

  const monthMap = new Map<string, { count: number; revenue: number }>();
  for (const b of completed) {
    const key = monthKey(b.booking_date);
    const row = monthMap.get(key) ?? { count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += fareAmount(b);
    monthMap.set(key, row);
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, row]) => ({
      month,
      label: formatMonthLabel(month),
      count: row.count,
      revenue: row.revenue,
    }));

  const destMap = new Map<string, { count: number; completed: number; revenue: number }>();
  for (const b of bookings) {
    const dest = b.destination || '미지정';
    const row = destMap.get(dest) ?? { count: 0, completed: 0, revenue: 0 };
    row.count += 1;
    if (b.status === 'completed') {
      row.completed += 1;
      row.revenue += fareAmount(b);
    }
    destMap.set(dest, row);
  }
  const byDestination = [...destMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([destination, row]) => ({ destination, ...row }));

  const vehicleMap = new Map<string, { count: number; revenue: number }>();
  for (const b of bookings) {
    const vt = b.vehicle_type || '일반';
    const row = vehicleMap.get(vt) ?? { count: 0, revenue: 0 };
    row.count += 1;
    if (b.status === 'completed') row.revenue += fareAmount(b);
    vehicleMap.set(vt, row);
  }
  const byVehicleType = [...vehicleMap.entries()].map(([vehicleType, row]) => ({
    vehicleType,
    ...row,
  }));

  const slotMap = new Map<string, number>();
  for (const slot of TIME_SLOTS) slotMap.set(slot.slot, 0);
  for (const b of bookings) {
    const hour = pickupHour(b);
    const slot = TIME_SLOTS.find((s) => hour >= s.from && hour <= s.to);
    if (slot) slotMap.set(slot.slot, (slotMap.get(slot.slot) ?? 0) + 1);
  }
  const byTimeSlot = TIME_SLOTS.map((slot) => ({
    slot: slot.slot,
    label: slot.label,
    count: slotMap.get(slot.slot) ?? 0,
  }));

  const staffMap = new Map<string, number>();
  for (const b of bookings) {
    const name = b.created_by || b.author || '—';
    staffMap.set(name, (staffMap.get(name) ?? 0) + 1);
  }
  const byStaff = [...staffMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const todayBookings = bookings.filter((b) => b.booking_date === today);
  const todayCompleted = todayBookings.filter((b) => b.status === 'completed');
  const todayStats = {
    total: todayBookings.length,
    pending: todayBookings.filter((b) => b.status === 'pending').length,
    completed: todayCompleted.length,
    cancelled: todayBookings.filter((b) => b.status === 'cancelled').length,
    revenue: todayCompleted.reduce((sum, b) => sum + fareAmount(b), 0),
  };

  const now = Date.now();
  const upcoming = bookings
    .filter((b) => b.status === 'pending' && pickupDateTime(b).getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => pickupDateTime(a).getTime() - pickupDateTime(b).getTime())
    .slice(0, 8);

  return {
    total: bookings.length,
    completed: completed.length,
    cancelled: cancelled.length,
    pending: pending.length,
    revenue,
    avgFare,
    completionRate,
    cancelRate,
    jumboShare,
    byMonth,
    byDestination,
    byVehicleType,
    byTimeSlot,
    byStaff,
    today: todayStats,
    upcoming,
  };
}

export type TaxiDashboardPeriod = 'month' | '3m' | '6m' | 'year';

export function dashboardPeriodRange(period: TaxiDashboardPeriod, today: string): {
  from: string;
  to: string;
  label: string;
} {
  const end = today;
  const base = new Date(`${today}T12:00:00`);

  if (period === 'month') {
    const from = `${today.slice(0, 7)}-01`;
    const label = `${Number(today.slice(5, 7))}월`;
    return { from, to: end, label };
  }

  const fromDate = new Date(base);
  if (period === '3m') {
    fromDate.setMonth(fromDate.getMonth() - 2);
    fromDate.setDate(1);
    return { from: fromDate.toISOString().slice(0, 10), to: end, label: '최근 3개월' };
  }
  if (period === '6m') {
    fromDate.setMonth(fromDate.getMonth() - 5);
    fromDate.setDate(1);
    return { from: fromDate.toISOString().slice(0, 10), to: end, label: '최근 6개월' };
  }

  const year = today.slice(0, 4);
  return { from: `${year}-01-01`, to: end, label: `${year}년` };
}

export function statusLabelKo(status: TransportStatus): string {
  if (status === 'completed') return '완료';
  if (status === 'cancelled') return '취소';
  return '진행중';
}
