import type { ReviewSentiment } from '@/lib/reviews/types';

export const REVIEW_REPLY_LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
export type ReviewReplyLocale = (typeof REVIEW_REPLY_LOCALES)[number];

export const REVIEW_REPLY_LOCALE_LABELS: Record<ReviewReplyLocale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export const REVIEW_REPLY_SENTIMENTS = ['positive', 'negative', 'general'] as const;
export type ReviewReplySentiment = (typeof REVIEW_REPLY_SENTIMENTS)[number];

export const REVIEW_REPLY_SENTIMENT_LABELS: Record<ReviewReplySentiment, string> = {
  positive: '좋은 리뷰',
  negative: '나쁜 리뷰',
  general: '공통',
};

export const REVIEW_REPLY_CHANNELS = ['review', 'email', 'both'] as const;
export type ReviewReplyChannel = (typeof REVIEW_REPLY_CHANNELS)[number];

export const REVIEW_REPLY_CHANNEL_LABELS: Record<ReviewReplyChannel, string> = {
  review: '리뷰 답변',
  email: '메일 답변',
  both: '리뷰·메일',
};

export type ReviewReplyTemplate = {
  id: string;
  hotel_id: string;
  title: string;
  sentiment: ReviewReplySentiment;
  channel: ReviewReplyChannel;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReviewReplyTemplateInput = {
  title: string;
  sentiment: ReviewReplySentiment;
  channel: ReviewReplyChannel;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  sort_order?: number;
  is_active?: boolean;
};

export function replyBodyForLocale(template: ReviewReplyTemplate, locale: ReviewReplyLocale): string {
  if (locale === 'en') return template.body_en || template.body_ko;
  if (locale === 'zh') return template.body_zh || template.body_ko;
  if (locale === 'ja') return template.body_ja || template.body_ko;
  return template.body_ko;
}

/** 리뷰 원문에서 답변 언어 추정 */
export function detectReviewReplyLocale(text: string): ReviewReplyLocale {
  const sample = text.trim().slice(0, 800);
  if (!sample) return 'ko';
  if (/[\u3040-\u30ff]/.test(sample)) return 'ja';
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh';
  return 'en';
}

export function filterReplyTemplatesForReview(
  templates: ReviewReplyTemplate[],
  sentiment: ReviewSentiment,
  channel: 'review' | 'email' = 'review',
): ReviewReplyTemplate[] {
  return templates.filter((template) => {
    const sentimentOk = template.sentiment === 'general' || template.sentiment === sentiment;
    const channelOk = template.channel === 'both' || template.channel === channel;
    return sentimentOk && channelOk;
  });
}
