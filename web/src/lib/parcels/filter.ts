import { isParcelOverdue, type Parcel, type ParcelDirection } from '@/lib/parcels/types';

export type ParcelBoardTab = ParcelDirection | 'completed';

export type ParcelActiveStatusFilter = 'all' | 'stored' | 'overdue';

export const PARCEL_BOARD_TABS: { id: ParcelBoardTab; label: string }[] = [
  { id: 'out_to_room', label: 'OUT TO ROOM' },
  { id: 'room_to_out', label: 'ROOM TO OUT' },
  { id: 'completed', label: '완료' },
];

export const PARCEL_ACTIVE_STATUS_FILTERS: { id: ParcelActiveStatusFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'stored', label: '보관 중' },
  { id: 'overdue', label: '장기 미전달' },
];

/** @deprecated 완료 항목은 활성 탭에서 즉시 숨김. 완료 탭에서만 표시. */
export const PARCEL_COMPLETED_HIDE_MS = 24 * 60 * 60 * 1000;

export function isParcelCompleted(parcel: Pick<Parcel, 'status'>): boolean {
  return parcel.status === 'delivered' || parcel.status === 'returned';
}

export function getParcelCompletedAt(parcel: Parcel): Date | null {
  if (parcel.status === 'delivered' && parcel.delivered_at) {
    return new Date(parcel.delivered_at);
  }
  if (parcel.status === 'returned') {
    return new Date(parcel.updated_at);
  }
  return null;
}

function formatLocalDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getParcelCompletedDateKey(parcel: Parcel): string | null {
  const completedAt = getParcelCompletedAt(parcel);
  if (!completedAt || Number.isNaN(completedAt.getTime())) return null;
  return formatLocalDateKey(completedAt);
}

export function isParcelCompletedToday(parcel: Parcel, now = new Date()): boolean {
  const completedKey = getParcelCompletedDateKey(parcel);
  if (!completedKey) return false;
  return completedKey === formatLocalDateKey(now);
}

export function isParcelHiddenAfterCompletion(parcel: Parcel, now = new Date()): boolean {
  if (!isParcelCompleted(parcel)) return false;
  const completedAt = getParcelCompletedAt(parcel);
  if (!completedAt || Number.isNaN(completedAt.getTime())) return true;
  return now.getTime() - completedAt.getTime() > PARCEL_COMPLETED_HIDE_MS;
}

function sortCompletedNewestFirst(a: Parcel, b: Parcel): number {
  const aTime = getParcelCompletedAt(a)?.getTime() ?? 0;
  const bTime = getParcelCompletedAt(b)?.getTime() ?? 0;
  return bTime - aTime;
}

export function splitCompletedParcels(
  parcels: Parcel[],
  now = new Date(),
): { today: Parcel[]; earlier: Parcel[] } {
  const today: Parcel[] = [];
  const earlier: Parcel[] = [];
  for (const parcel of parcels) {
    if (isParcelCompletedToday(parcel, now)) today.push(parcel);
    else earlier.push(parcel);
  }
  today.sort(sortCompletedNewestFirst);
  earlier.sort(sortCompletedNewestFirst);
  return { today, earlier };
}

function matchesParcelSearch(parcel: Parcel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (parcel.room_number ?? '').toLowerCase().includes(q) ||
    (parcel.reservation_number ?? '').toLowerCase().includes(q) ||
    (parcel.guest_name ?? '').toLowerCase().includes(q) ||
    (parcel.storage_slot ?? '').toLowerCase().includes(q) ||
    (parcel.description ?? '').toLowerCase().includes(q) ||
    (parcel.contact_notes ?? '').toLowerCase().includes(q) ||
    (parcel.checkout_date ?? '').includes(q) ||
    (parcel.check_in_date ?? '').includes(q) ||
    (parcel.recipient_name ?? '').toLowerCase().includes(q) ||
    (parcel.notes ?? '').toLowerCase().includes(q)
  );
}

function matchesActiveStatus(parcel: Parcel, statusFilter: ParcelActiveStatusFilter): boolean {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'overdue') return isParcelOverdue(parcel);
  return parcel.status === statusFilter;
}

export function filterParcelsForBoard(
  parcels: Parcel[],
  tab: ParcelBoardTab,
  searchQuery: string,
  statusFilter: ParcelActiveStatusFilter = 'all',
  now = new Date(),
): Parcel[] {
  let list = parcels.filter((parcel) => {
    if (tab === 'completed') {
      return isParcelCompleted(parcel);
    }
    if (parcel.direction !== tab) return false;
    if (isParcelCompleted(parcel)) return false;
    return matchesActiveStatus(parcel, statusFilter);
  });

  if (!searchQuery.trim()) return list;
  return list.filter((parcel) => matchesParcelSearch(parcel, searchQuery));
}

export function countParcelsForBoardTab(parcels: Parcel[], tab: ParcelBoardTab, now = new Date()): number {
  if (tab === 'completed') {
    return parcels.filter((parcel) => isParcelCompleted(parcel)).length;
  }
  return parcels.filter((parcel) => {
    if (parcel.direction !== tab) return false;
    return !isParcelCompleted(parcel);
  }).length;
}
