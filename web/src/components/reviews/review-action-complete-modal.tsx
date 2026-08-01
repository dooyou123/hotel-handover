'use client';

import { useEffect, useState } from 'react';
import { formatReviewGuestLabel } from '@/lib/reviews/identity';
import type { GuestReview } from '@/lib/reviews/types';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type ReviewActionCompleteModalProps = {
  open: boolean;
  review: GuestReview | null;
  mode?: 'complete' | 'edit';
  busy?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
};

export function ReviewActionCompleteModal({
  open,
  review,
  mode = 'complete',
  busy = false,
  onClose,
  onConfirm,
}: ReviewActionCompleteModalProps) {
  const [note, setNote] = useState('');
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    setNote(isEdit ? (review?.room_action_note ?? '') : '');
  }, [open, review?.id, review?.room_action_note, isEdit]);

  if (!open || !review) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onConfirm(note.trim());
  }

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--review-action" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className="modal__form">
          <div className="modal__header">
            <h2>{isEdit ? '조치 내용 수정' : '객실 조치 완료'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <p className="review-action-modal__guest">{formatReviewGuestLabel(review)}</p>
          <p className="review-action-modal__preview">{review.content_ko}</p>

          <label className="field field--full">
            <span>조치 내용</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              placeholder="예) 냉장고 청소·수건 교체 후 재점검 완료"
              aria-label="조치 내용"
              autoFocus
            />
          </label>
          <p className="review-action-modal__hint">
            {isEdit
              ? '여러 줄로 적어도 됩니다. 줄바꿈이 그대로 저장됩니다.'
              : '어떻게 조치했는지 남겨 두면 다음 교대·리뷰 목록에서 참고할 수 있습니다.'}
          </p>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? '저장 중…' : isEdit ? '저장' : '조치 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
