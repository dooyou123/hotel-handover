import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export type SimilarHistoryHit = {
  kind: 'card' | 'review';
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  at: string;
};

function columnLabel(columnId: string): string {
  if (columnId === 'done') return '완료';
  if (columnId === 'hold') return '보류';
  if (columnId === 'progress') return '진행';
  return '긴급';
}

export async function fetchSimilarHistory(
  roomQuery: string,
  options?: { excludeCardId?: string; limit?: number },
): Promise<SimilarHistoryHit[]> {
  const room = roomQuery.trim();
  if (room.length < 2) return [];

  const limit = options?.limit ?? 5;
  const supabase = createClient();
  const roomPattern = `%${room}%`;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const since = sixMonthsAgo.toISOString();

  const [cardsRes, reviewsRes] = await Promise.all([
    supabase
      .from('cards')
      .select('id, title, room, category, column_id, resolution, details, updated_at, created_at, archived_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .ilike('room', roomPattern)
      .gte('created_at', since)
      .order('updated_at', { ascending: false })
      .limit(limit + 3),
    supabase
      .from('guest_reviews')
      .select('id, guest_name, room_number, sentiment, content_ko, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('is_active', true)
      .ilike('room_number', roomPattern)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const hits: SimilarHistoryHit[] = [];

  for (const card of cardsRes.data ?? []) {
    if (options?.excludeCardId && card.id === options.excludeCardId) continue;
    const resolution = (card.resolution as string | null)?.trim();
    const details = (card.details as string | null)?.trim();
    hits.push({
      kind: 'card',
      id: card.id as string,
      title: card.title as string,
      subtitle: `${card.category} · ${columnLabel(card.column_id as string)} · ${card.room}호`,
      detail: resolution || details || '',
      at: (card.updated_at as string) || (card.created_at as string),
    });
    if (hits.filter((h) => h.kind === 'card').length >= limit) break;
  }

  for (const review of reviewsRes.data ?? []) {
    hits.push({
      kind: 'review',
      id: review.id as string,
      title: (review.guest_name as string) || '리뷰',
      subtitle: `${review.sentiment === 'negative' ? '부정' : '긍정'} 리뷰 · ${review.room_number}호`,
      detail: ((review.content_ko as string) || '').slice(0, 120),
      at: review.created_at as string,
    });
  }

  return hits
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit + 2);
}
