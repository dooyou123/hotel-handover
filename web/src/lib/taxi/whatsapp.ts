import { formatTaxiPriceDisplay } from '@/lib/taxi/destinations';
import type { TransportBooking } from '@/lib/transport/types';

function formatPickupForWhatsApp(booking: TransportBooking): { dateLine: string; timeLine: string } {
  const time = booking.pickup_time.slice(0, 5);
  const d = new Date(`${booking.booking_date}T${time}:00`);
  if (Number.isNaN(d.getTime())) {
    return { dateLine: booking.booking_date, timeLine: time };
  }
  const dateLine = d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const timeLine = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { dateLine, timeLine };
}

/**
 * 기사·택시 회사용 WhatsApp 메시지.
 * 핵심 정보(객실·시간·목적지·차종)를 앞에 두고, 라벨+쉼표 형식 유지.
 */
export function buildWhatsAppMessage(booking: TransportBooking): string {
  const { dateLine, timeLine } = formatPickupForWhatsApp(booking);
  const room = booking.room_number || '—';
  const guest = booking.booker_name || booking.guest_name || '—';
  const vehicle = booking.vehicle_type || '일반';
  const memo = booking.memo || booking.notes || '없음';
  const lines: string[] = [];

  if (booking.status === 'cancelled') {
    lines.push('[예약 취소]');
  }

  if (vehicle === '점보') {
    lines.push('점보 요청');
  }

  lines.push(
    `${room}호, ${guest}`,
    `탑승, ${dateLine} ${timeLine}`,
    `목적지, ${booking.destination || '—'}`,
    `차종, ${vehicle}`,
    `인원, ${booking.passengers}명 / 짐, ${booking.baggage_count ?? 0}개`,
    `요금, ${formatTaxiPriceDisplay(booking.price)}`,
    `메모, ${memo}`,
  );

  if (booking.status !== 'cancelled') {
    lines.push('', '안녕하세요 프레사인 명동 프런트입니다. 예약을 부탁드립니다.');
  }

  return lines.join('\n');
}

export function openWhatsApp(recipient: string, message: string): void {
  const digits = recipient.replace(/\D/g, '');
  if (!digits) {
    throw new Error('WhatsApp 수신 번호가 설정되지 않았습니다. 설정에서 번호를 입력해 주세요.');
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
