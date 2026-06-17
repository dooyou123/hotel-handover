import { isParcelOverdue, type Parcel, type ParcelDirection } from '@/lib/parcels/types';

export type ParcelBoardTab = ParcelDirection | 'completed';

export type ParcelActiveStatusFilter = 'all' | 'stored' | 'ready' | 'overdue';

export const PARCEL_BOARD_TABS: { id: ParcelBoardTab; label: string }[] = [
  { id: 'out_to_room', label: 'OUT TO ROOM' },
  { id: 'room_to_out', label: 'ROOM TO OUT' },
  { id: 'completed', label: '완료' },
];

export const PARCEL_ACTIVE_STATUS_FILTERS: { id: ParcelActiveStatusFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'stored', label: '보관 중' },
  { id: 'ready', label: '인도 대기' },
  { id: 'overdue', label: '장기 미인도' },
];

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

export function isParcelHiddenAfterCompletion(parcel: Parcel, now = new Date()): boolean {
  if (!isParcelCompleted(parcel)) return false;
  const completedAt = getParcelCompletedAt(parcel);
  if (!completedAt || Number.isNaN(completedAt.getTime())) return true;
  return now.getTime() - completedAt.getTime() > PARCEL_COMPLETED_HIDE_MS;
}

function matchesParcelSearch(parcel: Parcel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    parcel.room_number.toLowerCase().includes(q) ||
    parcel.guest_name.toLowerCase().includes(q) ||
    parcel.storage_slot.toLowerCase().includes(q) ||
    parcel.description.toLowerCase().includes(q) ||
    parcel.contact_notes.toLowerCase().includes(q) ||
    parcel.checkout_date.includes(q) ||
    parcel.recipient_name.toLowerCase().includes(q) ||
    parcel.notes.toLowerCase().includes(q)
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
    if (isParcelCompleted(parcel)) {
      return !isParcelHiddenAfterCompletion(parcel, now);
    }
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
    if (isParcelCompleted(parcel)) return !isParcelHiddenAfterCompletion(parcel, now);
    return true;
  }).length;
}
