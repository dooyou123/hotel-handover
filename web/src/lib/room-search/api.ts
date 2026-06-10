import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export type RoomSearchHit = {
  kind: 'handover' | 'review' | 'transport' | 'facility';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  at: string;
};

export async function searchByRoom(roomQuery: string): Promise<RoomSearchHit[]> {
  const room = roomQuery.trim();
  if (!room) return [];

  const supabase = createClient();
  const roomPattern = `%${room}%`;
  const today = new Date().toISOString().slice(0, 10);

  const [cardsRes, reviewsRes, transportRes] = await Promise.all([
    supabase
      .from('cards')
      .select('id, title, room, category, column_id, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .is('archived_at', null)
      .ilike('room', roomPattern)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('guest_reviews')
      .select('id, guest_name, room_number, sentiment, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('is_active', true)
      .ilike('room_number', roomPattern)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('transport_bookings')
      .select('id, guest_name, room_number, pickup_time, booking_date, status, destination')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .gte('booking_date', today)
      .ilike('room_number', roomPattern)
      .order('pickup_time')
      .limit(20),
  ]);

  const hits: RoomSearchHit[] = [];

  for (const card of cardsRes.data ?? []) {
    const isFacility = card.category === '시설' || card.category === '컴플레인';
    hits.push({
      kind: isFacility ? 'facility' : 'handover',
      id: card.id,
      title: card.title,
      subtitle: `${card.category} · ${card.column_id === 'done' ? '완료' : card.column_id === 'progress' ? '진행' : '긴급'}`,
      href: '/handover',
      at: card.updated_at || card.created_at,
    });
  }

  for (const review of reviewsRes.data ?? []) {
    hits.push({
      kind: 'review',
      id: review.id,
      title: review.guest_name || '리뷰',
      subtitle: `${review.sentiment === 'negative' ? '나쁜' : '좋은'} 리뷰 · ${review.room_number}호`,
      href: '/reviews',
      at: review.updated_at || review.created_at,
    });
  }

  for (const booking of transportRes.data ?? []) {
    hits.push({
      kind: 'transport',
      id: booking.id,
      title: `${booking.pickup_time?.slice(0, 5)} 픽업`,
      subtitle: `${booking.guest_name || '—'} → ${booking.destination || '—'} (${booking.status})`,
      href: '/transport',
      at: `${booking.booking_date}T${booking.pickup_time}`,
    });
  }

  return hits.sort((a, b) => b.at.localeCompare(a.at));
}
