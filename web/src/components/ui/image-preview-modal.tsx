'use client';

import { useEffect } from 'react';
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

  if (!open || !attachment?.url) return null;

  return (
    <div className="modal-overlay image-preview-overlay" onClick={onClose}>
      <div
        className="modal modal--image-preview"
        role="dialog"
        aria-modal="true"
        aria-label="첨부 사진"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="image-preview-modal__head">
          <span className="image-preview-modal__title">
            첨부 사진
            {hasMultiple ? ` ${index + 1}/${attachments.length}` : ''}
          </span>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="image-preview-modal__body">
          {hasMultiple && onChangeIndex ? (
            <button
              type="button"
              className="image-preview-modal__nav image-preview-modal__nav--prev"
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
              className="image-preview-modal__nav image-preview-modal__nav--next"
              aria-label="다음 사진"
              onClick={() => onChangeIndex((index + 1) % attachments.length)}
            >
              ›
            </button>
          ) : null}
        </div>
        {attachment.filename ? (
          <p className="image-preview-modal__caption">{attachment.filename}</p>
        ) : null}
      </div>
    </div>
  );
}
