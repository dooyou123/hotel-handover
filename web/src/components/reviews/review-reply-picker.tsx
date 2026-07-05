'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  REVIEW_REPLY_CHANNEL_LABELS,
  REVIEW_REPLY_LOCALE_LABELS,
  REVIEW_REPLY_LOCALES,
  detectReviewReplyLocale,
  filterReplyTemplatesForReview,
  replyBodyForLocale,
  type ReviewReplyChannel,
  type ReviewReplyLocale,
  type ReviewReplyTemplate,
} from '@/lib/reviews/reply-templates';
import type { GuestReview, ReviewSentiment } from '@/lib/reviews/types';

type ReviewReplyPickerProps = {
  review: Pick<GuestReview, 'sentiment' | 'content_original'>;
  templates: ReviewReplyTemplate[];
  compact?: boolean;
  onCopied?: (message: string) => void;
};

export function ReviewReplyPicker({ review, templates, compact, onCopied }: ReviewReplyPickerProps) {
  const [locale, setLocale] = useState<ReviewReplyLocale>('ko');
  const [channel, setChannel] = useState<'review' | 'email'>('review');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLocale(detectReviewReplyLocale(review.content_original));
    setChannel('review');
    setSelectedId(null);
  }, [review.content_original, review.sentiment]);

  const filtered = useMemo(
    () => filterReplyTemplatesForReview(templates, review.sentiment as ReviewSentiment, channel),
    [templates, review.sentiment, channel],
  );

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const body = selected ? replyBodyForLocale(selected, locale) : '';

  async function handleCopy() {
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      onCopied?.('답변을 클립보드에 복사했습니다.');
    } catch {
      onCopied?.('복사에 실패했습니다.');
    }
  }

  if (!templates.length) {
    return (
      <p className="review-reply-picker__empty">
        등록된 답변 템플릿이 없습니다. 상단 「답변 템플릿」에서 추가하세요.
      </p>
    );
  }

  return (
    <div className={`review-reply-picker${compact ? ' review-reply-picker--compact' : ''}`}>
      <div className="review-reply-picker__toolbar">
        <div className="review-reply-picker__channel" role="tablist" aria-label="답변 채널">
          {(['review', 'email'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={channel === value}
              className={`review-reply-picker__channel-btn${channel === value ? ' is-active' : ''}`}
              onClick={() => {
                setChannel(value);
                setSelectedId(null);
              }}
            >
              {REVIEW_REPLY_CHANNEL_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="review-reply-picker__locales" role="radiogroup" aria-label="답변 언어">
          {REVIEW_REPLY_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={locale === code}
              className={`review-reply-picker__locale${locale === code ? ' is-active' : ''}`}
              onClick={() => setLocale(code)}
            >
              {REVIEW_REPLY_LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="review-reply-picker__chips">
          {filtered.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`review-reply-picker__chip${selected?.id === template.id ? ' is-active' : ''}`}
              onClick={() => setSelectedId(template.id)}
            >
              {template.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="review-reply-picker__empty">
          이 구분·채널에 맞는 템플릿이 없습니다.
        </p>
      )}

      {selected ? (
        <>
          <textarea
            className="review-reply-picker__preview"
            readOnly
            rows={compact ? 5 : 7}
            value={body}
            aria-label="답변 미리보기"
          />
          <button type="button" className="btn btn--primary btn--small" onClick={() => void handleCopy()}>
            답변 복사
          </button>
        </>
      ) : null}
    </div>
  );
}
