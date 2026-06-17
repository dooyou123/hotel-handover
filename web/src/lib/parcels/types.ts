export type ParcelStatus = 'stored' | 'ready' | 'delivered' | 'returned';

export type Parcel = {
  id: string;
  hotel_id: string;
  room_number: string;
  guest_name: string;
  carrier: string;
  tracking_number: string;
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
  room_number: string;
  guest_name: string;
  carrier: string;
  tracking_number: string;
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
  ready: '인도 대기',
  delivered: '인도 완료',
  returned: '반송',
};

export const PARCEL_OVERDUE_DAYS = 3;

export function normalizeParcel(row: Record<string, unknown>): Parcel {
  return {
    id: String(row.id),
    hotel_id: String(row.hotel_id),
    room_number: String(row.room_number ?? ''),
    guest_name: String(row.guest_name ?? ''),
    carrier: String(row.carrier ?? ''),
    tracking_number: String(row.tracking_number ?? ''),
    storage_slot: String(row.storage_slot ?? ''),
    description: String(row.description ?? ''),
    status: (row.status as ParcelStatus) ?? 'stored',
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

export function emptyParcelInput(author: string): ParcelInput {
  return {
    room_number: '',
    guest_name: '',
    carrier: '',
    tracking_number: '',
    storage_slot: '',
    description: '',
    status: 'stored',
    contact_notes: '',
    notes: '',
    created_by: author,
    updated_by: author,
  };
}

export function isParcelOverdue(parcel: Parcel, days = PARCEL_OVERDUE_DAYS, now = new Date()): boolean {
  if (parcel.status === 'delivered' || parcel.status === 'returned') return false;
  const received = new Date(parcel.received_at);
  if (Number.isNaN(received.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return received.getTime() < cutoff.getTime();
}

export type ParcelSignPreview = {
  room_number: string;
  guest_name: string;
  carrier: string;
  storage_slot: string;
  description: string;
  tracking_number: string;
};
