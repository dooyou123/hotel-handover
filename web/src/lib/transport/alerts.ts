import type { TransportBooking } from '@/lib/transport/types';

export const TRANSPORT_ALERT_WINDOW_MINUTES = 30;

export function minutesUntilPickup(booking: TransportBooking, now = new Date()): number {
  const time = booking.pickup_time.slice(0, 5);
  const target = new Date(`${booking.booking_date}T${time}:00`);
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

export function isUpcomingTransportAlert(
  booking: TransportBooking,
  withinMinutes = TRANSPORT_ALERT_WINDOW_MINUTES,
  now = new Date(),
): boolean {
  if (booking.status !== 'pending') return false;
  const mins = minutesUntilPickup(booking, now);
  return mins >= 0 && mins <= withinMinutes;
}

export function filterUpcomingTransportAlerts(
  bookings: TransportBooking[],
  withinMinutes = TRANSPORT_ALERT_WINDOW_MINUTES,
  now = new Date(),
): TransportBooking[] {
  return bookings
    .filter((booking) => isUpcomingTransportAlert(booking, withinMinutes, now))
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));
}

export function isPickupOverdue(booking: TransportBooking, now = new Date()): boolean {
  if (booking.status !== 'pending') return false;
  return minutesUntilPickup(booking, now) < 0;
}

export function transportGuestName(booking: TransportBooking): string {
  return (booking.booker_name || booking.guest_name || '').trim();
}

/** 픽업 전 필수 입력(객실·게스트·차량번호) 누락 */
export function transportNeedsInput(booking: TransportBooking): boolean {
  if (booking.status !== 'pending') return false;
  return !booking.room_number?.trim() || !transportGuestName(booking) || !booking.vehicle_number?.trim();
}

export function transportNeedsInputMissingLabels(booking: TransportBooking): string[] {
  const missing: string[] = [];
  if (!booking.room_number?.trim()) missing.push('객실');
  if (!transportGuestName(booking)) missing.push('게스트');
  if (!booking.vehicle_number?.trim()) missing.push('차량번호');
  return missing;
}

export function isTransportNeedsInputImminent(
  booking: TransportBooking,
  withinMinutes = TRANSPORT_ALERT_WINDOW_MINUTES,
  now = new Date(),
): boolean {
  return isUpcomingTransportAlert(booking, withinMinutes, now) && transportNeedsInput(booking);
}

export function filterTransportNeedsInput(bookings: TransportBooking[]): TransportBooking[] {
  return bookings.filter(transportNeedsInput);
}

export function filterTransportNeedsInputImminent(
  bookings: TransportBooking[],
  withinMinutes = TRANSPORT_ALERT_WINDOW_MINUTES,
  now = new Date(),
): TransportBooking[] {
  return bookings.filter((booking) => isTransportNeedsInputImminent(booking, withinMinutes, now));
}

export function formatTodayTaxiBarText(booking: TransportBooking, now = new Date()): string {
  if (isPickupOverdue(booking, now)) {
    return '시간이 지났습니다. 택시 예약을 확인해주세요.';
  }

  const parts: string[] = ['택시 예약'];
  if (booking.room_number) parts.push(`${booking.room_number}호`);
  if (booking.guest_name) parts.push(booking.guest_name);
  if (booking.destination) parts.push(`→ ${booking.destination}`);
  return parts.join(' · ');
}
