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

export type ReviewReplyBodies = Pick<
  ReviewReplyTemplate,
  'body_ko' | 'body_en' | 'body_zh' | 'body_ja'
>;

export function replyBodyStrictForLocale(
  template: ReviewReplyBodies,
  locale: ReviewReplyLocale,
): string {
  if (locale === 'en') return template.body_en.trim();
  if (locale === 'zh') return template.body_zh.trim();
  if (locale === 'ja') return template.body_ja.trim();
  return template.body_ko.trim();
}

export function hasReplyLocaleBody(
  template: ReviewReplyBodies,
  locale: ReviewReplyLocale,
): boolean {
  return replyBodyStrictForLocale(template, locale).length > 0;
}

export function missingReplyLocales(template: ReviewReplyTemplate): ReviewReplyLocale[] {
  return REVIEW_REPLY_LOCALES.filter((locale) => !hasReplyLocaleBody(template, locale));
}

export function replyLocaleCompletionCount(template: ReviewReplyTemplate): number {
  return REVIEW_REPLY_LOCALES.length - missingReplyLocales(template).length;
}

/** 복사·전송용: 해당 언어가 비어 있으면 한국어로 폴백 */
export function replyBodyForLocale(template: ReviewReplyTemplate, locale: ReviewReplyLocale): string {
  const strict = replyBodyStrictForLocale(template, locale);
  if (strict) return strict;
  if (locale === 'ko') return '';
  return template.body_ko.trim();
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
