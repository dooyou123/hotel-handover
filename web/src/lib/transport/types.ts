export const TRANSPORT_TYPES = [
  { value: 'taxi', label: '택시' },
  { value: 'pickup', label: '픽업' },
  { value: 'airport', label: '공항' },
  { value: 'other', label: '기타' },
] as const;

export const TRANSPORT_STATUSES = [
  { value: 'pending', label: '예약' },
  { value: 'done', label: '완료' },
  { value: 'cancelled', label: '취소' },
] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number]['value'];
export type TransportStatus = (typeof TRANSPORT_STATUSES)[number]['value'];

export type TransportBooking = {
  id: string;
  hotel_id: string;
  booking_date: string;
  pickup_time: string;
  booking_type: TransportType;
  room_number: string;
  guest_name: string;
  destination: string;
  passengers: number;
  contact_phone: string;
  notes: string;
  status: TransportStatus;
  author: string;
  created_at: string;
  updated_at: string;
};

export type TransportBookingInput = {
  booking_date: string;
  pickup_time: string;
  booking_type: TransportType;
  room_number: string;
  guest_name: string;
  destination: string;
  passengers: number;
  contact_phone: string;
  notes: string;
  status: TransportStatus;
  author: string;
};

export function transportTypeLabel(value: string): string {
  return TRANSPORT_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function transportStatusLabel(value: string): string {
  return TRANSPORT_STATUSES.find((item) => item.value === value)?.label ?? value;
}

export function formatPickupDateTime(date: string, time: string): string {
  const timeShort = time.slice(0, 5);
  const d = new Date(`${date}T${timeShort}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${timeShort}`;
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
