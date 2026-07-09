'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ReviewReplyLocalePreview,
  ReviewReplyLocaleTabs,
} from '@/components/reviews/review-reply-locale-preview';
import {
  REVIEW_REPLY_CHANNEL_LABELS,
  detectReviewReplyLocale,
  filterReplyTemplatesForReview,
  hasReplyLocaleBody,
  replyBodyStrictForLocale,
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
  const body = selected ? replyBodyStrictForLocale(selected, locale) : '';
  const canCopy = selected ? hasReplyLocaleBody(selected, locale) : false;

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
        <ReviewReplyLocaleTabs
          locale={locale}
          bodies={selected}
          onChange={setLocale}
          ariaLabel="답변 언어"
        />
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
          <ReviewReplyLocalePreview
            template={selected}
            locale={locale}
            bodyClassName="review-reply-picker__preview"
          />
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={!canCopy}
            onClick={() => void handleCopy()}
          >
            답변 복사
          </button>
        </>
      ) : null}
    </div>
  );
}
