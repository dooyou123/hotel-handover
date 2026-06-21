'use client';

import { useState } from 'react';
import { otaSourceLabel, parseOtaReviewPaste, type ParsedOtaReview } from '@/lib/reviews/parse-ota';
import type { GuestReviewInput } from '@/lib/reviews/types';
import { isReviewAnonymous, shouldSuggestAnonymousReview } from '@/lib/reviews/identity';

type OtaPastePanelProps = {
  onApply: (parsed: ParsedOtaReview) => void;
};

export function OtaPastePanel({ onApply }: OtaPastePanelProps) {
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ParsedOtaReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleParse() {
    const parsed = parseOtaReviewPaste(pasteText);
    if (!parsed) {
      setPreview(null);
      setError('리뷰 내용을 인식하지 못했습니다. Booking·Google 등에서 복사한 전체 텍스트를 붙여넣어 주세요.');
      return;
    }
    setPreview(parsed);
    setError(null);
  }

  function handleApply() {
    if (!preview) return;
    onApply(preview);
    setPasteText('');
    setPreview(null);
    setError(null);
  }

  return (
    <div className="ota-paste-panel">
      <div className="ota-paste-panel__head">
        <strong>OTA 붙여넣기</strong>
        <span>Booking·Agoda·Google 등에서 복사한 리뷰를 붙여넣으면 자동으로 채웁니다.</span>
      </div>
      <textarea
        rows={4}
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={'예)\nGuest name: John Smith\nReservation number: 1234567890\nRoom 802\nScore: 8/10\n\nThe room was clean and staff were friendly.'}
        className="ota-paste-panel__input"
      />
      <div className="ota-paste-panel__actions">
        <button type="button" className="btn btn--ghost btn--xs" onClick={handleParse} disabled={!pasteText.trim()}>
          분석
        </button>
        {preview ? (
          <button type="button" className="btn btn--primary btn--xs" onClick={handleApply}>
            폼에 적용
          </button>
        ) : null}
      </div>
      {error ? <p className="ota-paste-panel__error">{error}</p> : null}
      {preview ? (
        <div className="ota-paste-panel__preview">
          <span>{otaSourceLabel(preview.ota_source)}</span>
          {preview.rating !== null ? <span>★ {preview.rating}</span> : null}
          <span>{preview.sentiment === 'negative' ? '나쁜 리뷰' : '좋은 리뷰'}</span>
          {preview.guest_name ? <span>{preview.guest_name}</span> : null}
          {shouldSuggestAnonymousReview(preview) ? <span>익명 리뷰</span> : null}
          {preview.room_number ? <span>{preview.room_number}호</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function parsedOtaToReviewInput(parsed: ParsedOtaReview, authorLabel: string): GuestReviewInput {
  const is_anonymous = shouldSuggestAnonymousReview(parsed);
  return {
    sentiment: parsed.sentiment,
    content_original: parsed.content_original,
    content_ko: parsed.content_ko,
    guest_name: is_anonymous ? '' : parsed.guest_name,
    check_in_date: is_anonymous ? null : parsed.check_in_date,
    check_out_date: is_anonymous ? null : parsed.check_out_date,
    reservation_number: is_anonymous ? '' : parsed.reservation_number,
    room_number: parsed.room_number,
    author: authorLabel,
    ota_source: parsed.ota_source === 'unknown' ? '' : parsed.ota_source,
    rating: parsed.rating,
    account: parsed.account || (is_anonymous ? 'Google' : ''),
    is_anonymous,
  };
}
