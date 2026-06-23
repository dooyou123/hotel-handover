'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardAttachment } from '@/lib/handover/types';

type ImagePreviewModalProps = {
  open: boolean;
  attachments: Pick<CardAttachment, 'url' | 'filename'>[];
  index: number;
  onClose: () => void;
  onChangeIndex?: (index: number) => void;
};

export function ImagePreviewModal({
  open,
  attachments,
  index,
  onClose,
  onChangeIndex,
}: ImagePreviewModalProps) {
  const attachment = attachments[index];
  const hasMultiple = attachments.length > 1;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!onChangeIndex || !hasMultiple) return;
      if (event.key === 'ArrowLeft') {
        onChangeIndex((index - 1 + attachments.length) % attachments.length);
      }
      if (event.key === 'ArrowRight') {
        onChangeIndex((index + 1) % attachments.length);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachments.length, hasMultiple, index, onChangeIndex, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !attachment?.url) return null;

  const dialog = (
    <div className="image-preview-lightbox" onClick={onClose} role="presentation">
      <button
        type="button"
        className="image-preview-lightbox__close"
        aria-label="닫기"
        onClick={onClose}
      >
        <span className="image-preview-lightbox__close-icon" aria-hidden="true">
          ✕
        </span>
        <span>닫기</span>
      </button>

      <div className="image-preview-lightbox__toolbar" onClick={(event) => event.stopPropagation()}>
        <span className="image-preview-lightbox__title">
          첨부 사진
          {hasMultiple ? ` ${index + 1}/${attachments.length}` : ''}
        </span>
      </div>

      <div className="image-preview-lightbox__stage" onClick={(event) => event.stopPropagation()}>
        {hasMultiple && onChangeIndex ? (
          <button
            type="button"
            className="image-preview-lightbox__nav image-preview-lightbox__nav--prev"
            aria-label="이전 사진"
            onClick={() => onChangeIndex((index - 1 + attachments.length) % attachments.length)}
          >
            ‹
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.filename || '첨부 사진'} />
        {hasMultiple && onChangeIndex ? (
          <button
            type="button"
            className="image-preview-lightbox__nav image-preview-lightbox__nav--next"
            aria-label="다음 사진"
            onClick={() => onChangeIndex((index + 1) % attachments.length)}
          >
            ›
          </button>
        ) : null}
      </div>

      {attachment.filename ? (
        <p className="image-preview-lightbox__caption" onClick={(event) => event.stopPropagation()}>
          {attachment.filename}
        </p>
      ) : null}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}
