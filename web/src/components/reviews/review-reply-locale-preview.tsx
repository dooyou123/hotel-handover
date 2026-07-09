'use client';

import {
  REVIEW_REPLY_LOCALE_LABELS,
  REVIEW_REPLY_LOCALES,
  hasReplyLocaleBody,
  replyBodyStrictForLocale,
  type ReviewReplyBodies,
  type ReviewReplyLocale,
  type ReviewReplyTemplate,
} from '@/lib/reviews/reply-templates';

type ReviewReplyLocaleTabsProps = {
  locale: ReviewReplyLocale;
  bodies?: ReviewReplyBodies | null;
  onChange: (locale: ReviewReplyLocale) => void;
  ariaLabel: string;
};

export function ReviewReplyLocaleTabs({
  locale,
  bodies,
  onChange,
  ariaLabel,
}: ReviewReplyLocaleTabsProps) {
  return (
    <div className="review-reply-picker__locales" role="radiogroup" aria-label={ariaLabel}>
      {REVIEW_REPLY_LOCALES.map((code) => {
        const present = bodies ? hasReplyLocaleBody(bodies, code) : true;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={locale === code}
            className={`review-reply-picker__locale${locale === code ? ' is-active' : ''}${present ? '' : ' is-missing'}`}
            onClick={() => onChange(code)}
          >
            {REVIEW_REPLY_LOCALE_LABELS[code]}
            {bodies && !present ? (
              <span className="review-reply-picker__locale-missing">없음</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type ReviewReplyLocaleStatusProps = {
  template: ReviewReplyTemplate;
};

export function ReviewReplyLocaleStatus({ template }: ReviewReplyLocaleStatusProps) {
  return (
    <ul className="review-reply-locale-status" aria-label="언어별 답변 상태">
      {REVIEW_REPLY_LOCALES.map((code) => {
        const present = hasReplyLocaleBody(template, code);
        return (
          <li
            key={code}
            className={`review-reply-locale-status__item${present ? ' is-present' : ' is-missing'}`}
          >
            <span className="review-reply-locale-status__label">{REVIEW_REPLY_LOCALE_LABELS[code]}</span>
            <span className="review-reply-locale-status__value">{present ? '있음' : '없음'}</span>
          </li>
        );
      })}
    </ul>
  );
}

type ReviewReplyLocalePreviewProps = {
  template: ReviewReplyTemplate;
  locale: ReviewReplyLocale;
  bodyClassName?: string;
};

export function ReviewReplyLocalePreview({
  template,
  locale,
  bodyClassName = 'review-reply-settings__preview-body',
}: ReviewReplyLocalePreviewProps) {
  const body = replyBodyStrictForLocale(template, locale);
  const showKoRef = locale !== 'ko';

  return (
    <div className="review-reply-locale-preview">
      <pre className={`${bodyClassName}${body ? '' : ' is-missing'}`}>{body || '없음'}</pre>
      {showKoRef ? (
        <div className="review-reply-locale-preview__ko-ref">
          <p className="review-reply-locale-preview__ko-label">한국어</p>
          <pre className="review-reply-locale-preview__ko-body">
            {template.body_ko.trim() || '없음'}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
