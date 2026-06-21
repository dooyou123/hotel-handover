export type ParcelStatus = 'stored' | 'delivered' | 'returned';

export type ParcelDirection = 'out_to_room' | 'room_to_out';

export type Parcel = {
  id: string;
  hotel_id: string;
  direction: ParcelDirection;
  room_number: string;
  reservation_number: string;
  guest_name: string;
  check_in_date: string;
  checkout_date: string;
  storage_slot: string;
  description: string;
  status: ParcelStatus;
  received_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  recipient_name: string;
  signature_path: string | null;
  confirmed_by_staff: string;
  contact_notes: string;
  notes: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ParcelInput = {
  direction: ParcelDirection;
  room_number: string;
  reservation_number: string;
  guest_name: string;
  check_in_date: string;
  checkout_date: string;
  storage_slot: string;
  description: string;
  status: ParcelStatus;
  contact_notes: string;
  notes: string;
  created_by: string;
  updated_by: string;
};

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  stored: '보관 중',
  delivered: '인도 완료',
  returned: '반송',
};

export const PARCEL_DIRECTION_LABELS: Record<ParcelDirection, string> = {
  out_to_room: 'OUT TO ROOM',
  room_to_out: 'ROOM TO OUT',
};

export const PARCEL_OVERDUE_DAYS = 3;

function normalizeParcelStatus(raw: unknown): ParcelStatus {
  if (raw === 'delivered' || raw === 'returned') return raw;
  return 'stored';
}

function normalizeParcelDate(raw: unknown): string {
  if (raw == null || raw === '') return '';
  return String(raw).slice(0, 10);
}

export function normalizeParcel(row: Record<string, unknown>): Parcel {
  const direction = row.direction === 'room_to_out' ? 'room_to_out' : 'out_to_room';

  return {
    id: String(row.id),
    hotel_id: String(row.hotel_id),
    direction,
    room_number: String(row.room_number ?? ''),
    reservation_number: String(row.reservation_number ?? ''),
    guest_name: String(row.guest_name ?? ''),
    check_in_date: normalizeParcelDate(row.check_in_date),
    checkout_date: normalizeParcelDate(row.checkout_date),
    storage_slot: String(row.storage_slot ?? ''),
    description: String(row.description ?? ''),
    status: normalizeParcelStatus(row.status),
    received_at: String(row.received_at),
    ready_at: row.ready_at ? String(row.ready_at) : null,
    delivered_at: row.delivered_at ? String(row.delivered_at) : null,
    recipient_name: String(row.recipient_name ?? ''),
    signature_path: row.signature_path ? String(row.signature_path) : null,
    confirmed_by_staff: String(row.confirmed_by_staff ?? ''),
    contact_notes: String(row.contact_notes ?? ''),
    notes: String(row.notes ?? ''),
    created_by: String(row.created_by ?? ''),
    updated_by: String(row.updated_by ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function emptyParcelInput(author: string, direction: ParcelDirection = 'out_to_room'): ParcelInput {
  return {
    direction,
    room_number: '',
    reservation_number: '',
    guest_name: '',
    check_in_date: '',
    checkout_date: '',
    storage_slot: '',
    description: '',
    status: 'stored',
    contact_notes: '',
    notes: '',
    created_by: author,
    updated_by: author,
  };
}

export function formatParcelCheckoutDate(value: string): string {
  if (!value.trim()) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function isParcelOverdue(parcel: Parcel, days = PARCEL_OVERDUE_DAYS, now = new Date()): boolean {
  if (parcel.status === 'delivered' || parcel.status === 'returned') return false;
  const received = new Date(parcel.received_at);
  if (Number.isNaN(received.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return received.getTime() < cutoff.getTime();
}

export type ParcelDeliveryUrgency = 'checkout_today' | 'checkin_today';

export function getParcelDeliveryUrgency(
  parcel: Pick<Parcel, 'status' | 'checkout_date' | 'check_in_date'>,
  today?: string,
): ParcelDeliveryUrgency | null {
  if (parcel.status !== 'stored') return null;
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  if (parcel.checkout_date.trim() === todayStr) return 'checkout_today';
  if (parcel.check_in_date.trim() === todayStr) return 'checkin_today';
  return null;
}

export function parcelDeliveryUrgencyMessage(urgency: ParcelDeliveryUrgency): string {
  if (urgency === 'checkout_today') return '꼭 전달해주세요.';
  return '체크인 시 꼭 전달하세요.';
}

export type ParcelSignPreview = {
  direction: ParcelDirection;
  room_number: string;
  reservation_number: string;
  guest_name: string;
  check_in_date: string;
  checkout_date: string;
  storage_slot: string;
  description: string;
};
