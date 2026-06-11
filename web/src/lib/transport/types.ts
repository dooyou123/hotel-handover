import type { TaxiVehicleType } from '@/lib/taxi/destinations';

export const TRANSPORT_TYPES = [
  { value: 'taxi', label: '택시' },
  { value: 'pickup', label: '픽업' },
  { value: 'airport', label: '공항' },
  { value: 'other', label: '기타' },
] as const;

export const TRANSPORT_STATUSES = [
  { value: 'pending', label: '진행중' },
  { value: 'completed', label: '완료됨' },
  { value: 'cancelled', label: '취소됨' },
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
  booker_name: string;
  destination: string;
  passengers: number;
  baggage_count: number;
  vehicle_type: TaxiVehicleType;
  price: string;
  vehicle_number: string;
  contact_phone: string;
  notes: string;
  memo: string;
  status: TransportStatus;
  author: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type TransportBookingInput = {
  booking_date: string;
  pickup_time: string;
  booking_type: TransportType;
  room_number: string;
  guest_name: string;
  booker_name: string;
  destination: string;
  passengers: number;
  baggage_count: number;
  vehicle_type: TaxiVehicleType;
  price: string;
  vehicle_number: string;
  contact_phone: string;
  notes: string;
  memo: string;
  status: TransportStatus;
  author: string;
  created_by: string;
  updated_by: string;
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

export function normalizeTransportRow(row: Record<string, unknown>): TransportBooking {
  const guest = String(row.guest_name ?? '');
  return {
    id: String(row.id),
    hotel_id: String(row.hotel_id),
    booking_date: String(row.booking_date),
    pickup_time: String(row.pickup_time),
    booking_type: (row.booking_type as TransportType) ?? 'taxi',
    room_number: String(row.room_number ?? ''),
    guest_name: guest,
    booker_name: String(row.booker_name ?? guest),
    destination: String(row.destination ?? ''),
    passengers: Number(row.passengers) || 1,
    baggage_count: Number(row.baggage_count) || 0,
    vehicle_type: (row.vehicle_type as TaxiVehicleType) || '일반',
    price: String(row.price ?? ''),
    vehicle_number: String(row.vehicle_number ?? ''),
    contact_phone: String(row.contact_phone ?? ''),
    notes: String(row.notes ?? ''),
    memo: String(row.memo ?? row.notes ?? ''),
    status: (row.status as TransportStatus) ?? 'pending',
    author: String(row.author ?? ''),
    created_by: String(row.created_by ?? row.author ?? ''),
    updated_by: String(row.updated_by ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

/** Supabase transport_bookings 테이블 컬럼만 포함 (booker_name·memo는 매핑) */
export type TransportBookingDbRow = {
  hotel_id?: string;
  booking_date: string;
  pickup_time: string;
  booking_type: TransportType;
  room_number: string;
  guest_name: string;
  destination: string;
  passengers: number;
  baggage_count: number;
  vehicle_type: TaxiVehicleType;
  price: string;
  vehicle_number: string;
  contact_phone: string;
  notes: string;
  status: TransportStatus;
  author: string;
  created_by: string;
  updated_by: string;
};

export function toTransportBookingDbPayload(
  input: Partial<TransportBookingInput>,
  options?: { hotelId?: string; updatedBy?: string },
): Partial<TransportBookingDbRow> {
  const row: Partial<TransportBookingDbRow> = {};

  if (options?.hotelId) row.hotel_id = options.hotelId;
  if (input.booking_date !== undefined) row.booking_date = input.booking_date;
  if (input.pickup_time !== undefined) row.pickup_time = input.pickup_time;
  if (input.booking_type !== undefined) row.booking_type = input.booking_type;
  if (input.room_number !== undefined) row.room_number = input.room_number;
  if (input.destination !== undefined) row.destination = input.destination;
  if (input.passengers !== undefined) row.passengers = input.passengers;
  if (input.baggage_count !== undefined) row.baggage_count = input.baggage_count;
  if (input.vehicle_type !== undefined) row.vehicle_type = input.vehicle_type;
  if (input.price !== undefined) row.price = input.price;
  if (input.vehicle_number !== undefined) row.vehicle_number = input.vehicle_number;
  if (input.contact_phone !== undefined) row.contact_phone = input.contact_phone;
  if (input.status !== undefined) row.status = input.status;
  if (input.author !== undefined) row.author = input.author;
  if (input.created_by !== undefined) row.created_by = input.created_by;

  if (input.booker_name !== undefined || input.guest_name !== undefined) {
    row.guest_name = input.booker_name || input.guest_name || '';
  }
  if (input.memo !== undefined || input.notes !== undefined) {
    row.notes = input.memo ?? input.notes ?? '';
  }

  const updatedBy = options?.updatedBy ?? input.updated_by;
  if (updatedBy !== undefined) row.updated_by = updatedBy;

  return row;
}

export function emptyTaxiBookingInput(author: string, date: string): TransportBookingInput {
  return {
    booking_date: date,
    pickup_time: '09:00',
    booking_type: 'taxi',
    room_number: '',
    guest_name: '',
    booker_name: '',
    destination: '인천공항 T1',
    passengers: 1,
    baggage_count: 0,
    vehicle_type: '일반',
    price: '85000',
    vehicle_number: '',
    contact_phone: '',
    notes: '',
    memo: '',
    status: 'pending',
    author,
    created_by: author,
    updated_by: author,
  };
}
