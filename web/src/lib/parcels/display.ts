import { formatParcelCheckoutDate, type Parcel } from '@/lib/parcels/types';

export function formatParcelCheckInDate(value: string): string {
  if (!value.trim()) return '';
  return formatParcelCheckoutDate(value);
}

export function parcelPrimaryLabel(parcel: Pick<Parcel, 'room_number' | 'reservation_number'>): string {
  if (parcel.room_number.trim()) return `${parcel.room_number.trim()}호`;
  if (parcel.reservation_number.trim()) return `예약 ${parcel.reservation_number.trim()}`;
  return '객실·예약 미입력';
}

export function parcelDateHint(parcel: Pick<Parcel, 'room_number' | 'check_in_date' | 'checkout_date'>): string | null {
  if (!parcel.room_number.trim() && parcel.check_in_date.trim()) {
    return `체크인 ${formatParcelCheckInDate(parcel.check_in_date)}`;
  }
  if (parcel.checkout_date.trim()) {
    return `체크아웃 ${formatParcelCheckoutDate(parcel.checkout_date)}`;
  }
  return null;
}
