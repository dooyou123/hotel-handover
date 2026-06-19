import type { ParcelInput } from '@/lib/parcels/types';

export type ParcelIdentityMode = 'room' | 'reservation';

export function resolveParcelIdentityMode(input: Pick<ParcelInput, 'room_number' | 'reservation_number'>): ParcelIdentityMode {
  return input.reservation_number.trim() && !input.room_number.trim() ? 'reservation' : 'room';
}

export function validateParcelInput(input: ParcelInput): string | null {
  const room = input.room_number.trim();
  const reservation = input.reservation_number.trim();

  if (!room && !reservation) {
    return '객실번호 또는 예약번호 중 하나를 입력해 주세요.';
  }
  if (room && reservation) {
    return '객실번호와 예약번호 중 하나만 입력해 주세요.';
  }
  if (!room && reservation && !input.check_in_date.trim()) {
    return '미체크인 예약은 체크인 예정일을 입력해 주세요.';
  }
  return null;
}

export function sanitizeParcelInput(input: ParcelInput, mode: ParcelIdentityMode): ParcelInput {
  if (mode === 'room') {
    return {
      ...input,
      room_number: input.room_number.trim(),
      reservation_number: '',
      check_in_date: '',
    };
  }
  return {
    ...input,
    room_number: '',
    reservation_number: input.reservation_number.trim(),
    check_in_date: input.check_in_date.trim(),
  };
}
