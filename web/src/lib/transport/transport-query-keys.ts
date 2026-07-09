import { DEFAULT_HOTEL_ID } from '@/lib/constants';

export const transportTodayPendingQueryKey = ['transport-today-pending', DEFAULT_HOTEL_ID] as const;

export function transportBookingsQueryKey(range: { from: string; to: string }) {
  return ['transport-bookings', DEFAULT_HOTEL_ID, range.from, range.to] as const;
}

export function transportBookingsTodayQueryKey(date: string) {
  return ['transport-bookings-today', DEFAULT_HOTEL_ID, date] as const;
}
