import type { GuestReview, GuestReviewInput } from '@/lib/reviews/types';

export const REVIEW_ANONYMOUS_GUEST_LABEL = '익명';
export const REVIEW_ANONYMOUS_STAY_LABEL = '숙박일 미상';

export function isReviewAnonymous(
  review: Pick<
    GuestReview,
    'is_anonymous' | 'guest_name' | 'reservation_number' | 'check_in_date' | 'check_out_date'
  >,
): boolean {
  if (review.is_anonymous) return true;
  return (
    !review.guest_name.trim() &&
    !review.reservation_number.trim() &&
    !review.check_in_date &&
    !review.check_out_date
  );
}

export function formatReviewGuestLabel(
  review: Pick<GuestReview, 'is_anonymous' | 'guest_name' | 'reservation_number' | 'check_in_date' | 'check_out_date'>,
): string {
  if (isReviewAnonymous(review)) return REVIEW_ANONYMOUS_GUEST_LABEL;
  return review.guest_name.trim() || '고객명 미입력';
}

export function shouldSuggestAnonymousReview(parsed: {
  ota_source: string;
  guest_name: string;
  reservation_number: string;
  check_in_date: string | null;
  check_out_date: string | null;
}): boolean {
  if (parsed.ota_source !== 'google') return false;
  return (
    !parsed.guest_name.trim() &&
    !parsed.reservation_number.trim() &&
    !parsed.check_in_date &&
    !parsed.check_out_date
  );
}

export function normalizeReviewInput(input: GuestReviewInput): GuestReviewInput {
  if (!input.is_anonymous) return input;
  return {
    ...input,
    guest_name: '',
    reservation_number: '',
    check_in_date: null,
    check_out_date: null,
  };
}
