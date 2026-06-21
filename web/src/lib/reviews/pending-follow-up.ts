import type { GuestReview } from '@/lib/reviews/types';

export const REVIEW_FOLLOW_UP_WINDOW_DAYS = 14;

export function isReviewPendingFollowUp(
  review: Pick<GuestReview, 'sentiment' | 'follow_up_card_id' | 'room_action_completed_at' | 'created_at'>,
  now = Date.now(),
): boolean {
  if (review.sentiment !== 'negative') return false;
  if (review.follow_up_card_id) return false;
  if (review.room_action_completed_at) return false;
  const cutoff = now - REVIEW_FOLLOW_UP_WINDOW_DAYS * 86_400_000;
  return new Date(review.created_at).getTime() >= cutoff;
}

export function filterPendingFollowUpReviews(reviews: GuestReview[], now = Date.now()): GuestReview[] {
  return reviews.filter((review) => isReviewPendingFollowUp(review, now));
}
