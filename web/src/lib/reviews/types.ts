export const REVIEW_SENTIMENTS = ['positive', 'negative'] as const;
export type ReviewSentiment = (typeof REVIEW_SENTIMENTS)[number];

export const REVIEW_SENTIMENT_LABELS: Record<ReviewSentiment, string> = {
  positive: '좋은 리뷰',
  negative: '나쁜 리뷰',
};

export const REVIEW_FILTER_OPTIONS = ['전체', '좋은 리뷰', '나쁜 리뷰'] as const;
export type ReviewFilter = (typeof REVIEW_FILTER_OPTIONS)[number];

export type GuestReview = {
  id: string;
  hotel_id: string;
  sentiment: ReviewSentiment;
  content_original: string;
  content_ko: string;
  guest_name: string;
  check_in_date: string | null;
  check_out_date: string | null;
  reservation_number: string;
  author: string;
  follow_up_card_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestReviewInput = {
  sentiment: ReviewSentiment;
  content_original: string;
  content_ko: string;
  guest_name: string;
  check_in_date: string | null;
  check_out_date: string | null;
  reservation_number: string;
  author: string;
};
