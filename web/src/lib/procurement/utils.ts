import type { ProcurementCategory, ProcurementOrder, ProcurementOrderLine } from '@/lib/procurement/types';

export function orderPrimaryCategoryKey(order: ProcurementOrder): string {
  return order.lines[0]?.category || 'other';
}

export function todayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayYmd(date);
}

/** 예상 입고일이 있으면 그것, 없으면 발주일+graceDays */
export function orderDueDate(order: Pick<ProcurementOrder, 'ordered_at' | 'expected_receive_at'>, graceDays = 3): string {
  return order.expected_receive_at || addDaysYmd(order.ordered_at, graceDays);
}

export function isOrderOverdue(
  order: Pick<ProcurementOrder, 'status' | 'ordered_at' | 'expected_receive_at'>,
  today = todayYmd(),
  graceDays = 3,
): boolean {
  if (order.status !== 'ordered' && order.status !== 'partial') return false;
  return orderDueDate(order, graceDays) < today;
}

/** 발주일로부터 경과 일수 (당일=0) */
export function daysSinceOrder(orderedAt: string, today = todayYmd()): number {
  const a = new Date(`${orderedAt}T12:00:00`).getTime();
  const b = new Date(`${today}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function formatOrderAge(orderedAt: string, today = todayYmd()): string {
  const days = daysSinceOrder(orderedAt, today);
  if (days <= 0) return '오늘 발주';
  if (days === 1) return '발주 1일 전';
  return `발주 ${days}일 전`;
}

export function lineReceivedQty(line: Pick<ProcurementOrderLine, 'received_qty' | 'received_at' | 'quantity'>): number {
  if (line.received_qty != null) return Math.max(0, line.received_qty);
  if (line.received_at) return line.quantity;
  return 0;
}

export function isLineFullyReceived(line: Pick<ProcurementOrderLine, 'received_qty' | 'received_at' | 'quantity'>): boolean {
  return lineReceivedQty(line) >= line.quantity;
}

export function lineRemainingQty(line: Pick<ProcurementOrderLine, 'received_qty' | 'received_at' | 'quantity'>): number {
  return Math.max(0, line.quantity - lineReceivedQty(line));
}

export function fullyReceivedLineCount(order: ProcurementOrder): number {
  return order.lines.filter(isLineFullyReceived).length;
}

export type MonthSummary = {
  month: string;
  orderCount: number;
  openCount: number;
  receivedCount: number;
  cancelledCount: number;
  overdueCount: number;
  byCategory: Array<{ key: string; label: string; lineCount: number; qty: number }>;
  byVendor: Array<{ name: string; count: number }>;
};

export function buildMonthSummary(
  orders: ProcurementOrder[],
  month: string,
  categories: ProcurementCategory[],
  today = todayYmd(),
): MonthSummary {
  const inMonth = orders.filter((order) => order.ordered_at.startsWith(month));
  const labelOf = (key: string) => categories.find((c) => c.key === key)?.label || key;

  const categoryMap = new Map<string, { key: string; label: string; lineCount: number; qty: number }>();
  const vendorMap = new Map<string, number>();

  for (const order of inMonth) {
    const vendor = order.vendor.trim() || '(발주처 미기입)';
    vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + 1);
    for (const line of order.lines) {
      const prev = categoryMap.get(line.category) ?? {
        key: line.category,
        label: line.category_label || labelOf(line.category),
        lineCount: 0,
        qty: 0,
      };
      prev.lineCount += 1;
      prev.qty += line.quantity;
      categoryMap.set(line.category, prev);
    }
  }

  return {
    month,
    orderCount: inMonth.length,
    openCount: inMonth.filter((o) => o.status === 'ordered' || o.status === 'partial').length,
    receivedCount: inMonth.filter((o) => o.status === 'received').length,
    cancelledCount: inMonth.filter((o) => o.status === 'cancelled').length,
    overdueCount: inMonth.filter((o) => isOrderOverdue(o, today)).length,
    byCategory: [...categoryMap.values()].sort((a, b) => b.qty - a.qty),
    byVendor: [...vendorMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
