export const REVIEW_SENTIMENTS = ['positive', 'negative'] as const;
export type ReviewSentiment = (typeof REVIEW_SENTIMENTS)[number];

export const REVIEW_SENTIMENT_LABELS: Record<ReviewSentiment, string> = {
  positive: '좋은 리뷰',
  negative: '나쁜 리뷰',
};

export const REVIEW_FILTER_OPTIONS = ['전체', '좋은 리뷰', '나쁜 리뷰'] as const;
export type ReviewFilter = (typeof REVIEW_FILTER_OPTIONS)[number];

export const REVIEW_ACCOUNT_PRESETS = [
  '부킹닷컴',
  '아고다',
  '익스피디아',
  '공식홈페이지(tripla)',
  'Google',
  '호텔 어카운트',
] as const;

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
  room_number: string;
  room_action_completed_at: string | null;
  room_action_completed_by: string;
  ota_source: string;
  rating: number | null;
  account: string;
  is_anonymous: boolean;
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
  room_number: string;
  author: string;
  ota_source?: string;
  rating?: number | null;
  account?: string;
  is_anonymous?: boolean;
};
