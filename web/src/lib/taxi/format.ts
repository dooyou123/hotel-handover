import type { TransportBooking, TransportStatus } from '@/lib/transport/types';

export function pickupDateTime(booking: TransportBooking): Date {
  const time = booking.pickup_time.slice(0, 5);
  return new Date(`${booking.booking_date}T${time}:00`);
}

export function formatPickupCardDate(booking: TransportBooking): string {
  const d = pickupDateTime(booking);
  if (Number.isNaN(d.getTime())) {
    return `${booking.booking_date} ${booking.pickup_time.slice(0, 5)}`;
  }
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntilPickup(booking: TransportBooking): number {
  const target = pickupDateTime(booking);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPickup = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfPickup.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function minutesUntilPickup(booking: TransportBooking): number {
  return Math.round((pickupDateTime(booking).getTime() - Date.now()) / 60_000);
}

export function isPickupToday(booking: TransportBooking): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return booking.booking_date === today;
}

export function isPickupImminent(booking: TransportBooking, withinMinutes = 30): boolean {
  if (booking.status !== 'pending') return false;
  const mins = minutesUntilPickup(booking);
  return mins >= 0 && mins <= withinMinutes;
}

export function isPickupOverdue(booking: TransportBooking): boolean {
  if (booking.status !== 'pending') return false;
  return minutesUntilPickup(booking) < 0;
}

export function cardStatusClass(status: TransportStatus, booking: TransportBooking): string {
  if (status === 'cancelled') return 'taxi-card--cancelled';
  if (status === 'completed') return 'taxi-card--completed';
  if (isPickupOverdue(booking)) return 'taxi-card--overdue';
  if (isPickupImminent(booking)) return 'taxi-card--imminent';
  if (isPickupToday(booking)) return 'taxi-card--today';
  return 'taxi-card--pending';
}

export function formatCountdownLabel(booking: TransportBooking): string | null {
  if (booking.status !== 'pending') return null;
  const days = daysUntilPickup(booking);
  if (days > 0) return `D-${days}`;
  if (days === 0) {
    const mins = minutesUntilPickup(booking);
    if (mins < 0) return null;
    if (mins <= 30) return `${mins}분 후`;
    return '오늘';
  }
  return null;
}
