import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { logActivity } from '@/lib/handover/activity';
import { createClient } from '@/lib/supabase/client';
import type { GuestReview } from '@/lib/reviews/types';

export async function createFollowUpCardFromReview(params: {
  review: GuestReview;
  author: string;
  shift: string;
  name: string;
}): Promise<string> {
  const { review, author, shift, name } = params;
  const supabase = createClient();

  const title = review.guest_name ? `리뷰 후속 — ${review.guest_name}` : '리뷰 후속';
  const details = [
    review.content_ko,
    review.content_original ? `\n원문: ${review.content_original}` : '',
    review.reservation_number ? `\n예약: ${review.reservation_number}` : '',
    review.check_in_date ? `\n숙박: ${review.check_in_date}${review.check_out_date ? ` ~ ${review.check_out_date}` : ''}` : '',
  ]
    .join('')
    .trim();

  const { data: progressCards } = await supabase
    .from('cards')
    .select('sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('column_id', 'progress');

  const sortOrder = progressCards?.length
    ? Math.max(...progressCards.map((row) => row.sort_order as number)) + 1
    : 0;

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      column_id: 'progress',
      priority: 'today',
      category: '고객',
      room: '',
      title,
      details,
      resolution: '',
      next_action: '리뷰 내용 확인 후 조치',
      author,
      assignee_shift: shift,
      assignee_name: name,
      sort_order: sortOrder,
    })
    .select('id')
    .single();

  if (cardError) throw cardError;

  const { error: linkError } = await supabase
    .from('guest_reviews')
    .update({ follow_up_card_id: card.id })
    .eq('id', review.id);

  if (linkError) throw linkError;

  await logActivity({
    entityType: 'card',
    entityId: card.id,
    action: 'create',
    audit: { shift, staffName: name },
    summary: `추가: ${title}`,
    details: { source: 'guest_review', reviewId: review.id },
  });

  return card.id as string;
}
