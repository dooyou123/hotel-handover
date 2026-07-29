'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card } from '@/lib/handover/types';

type HandoverCompleteModalProps = {
  open: boolean;
  cards: Card[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (resolution: string) => Promise<void>;
};

export function HandoverCompleteModal({
  open,
  cards,
  busy = false,
  onClose,
  onConfirm,
}: HandoverCompleteModalProps) {
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const initializedSelection = useRef('');
  const selectionKey = cards.map((card) => card.id).join(',');
  const initialResolution = cards.length === 1 ? (cards[0]?.resolution ?? '') : '';

  useEffect(() => {
    if (!open) {
      initializedSelection.current = '';
      return;
    }
    if (initializedSelection.current === selectionKey) return;
    initializedSelection.current = selectionKey;
    setResolution(initialResolution);
    setError('');
  }, [open, selectionKey, initialResolution]);

  if (!open || !cards.length) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextResolution = resolution.trim();
    if (!nextResolution) {
      setError('처리 결과를 입력해 주세요.');
      return;
    }
    setError('');
    await onConfirm(nextResolution);
  }

  const multiple = cards.length > 1;

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="modal modal--review-action"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handover-complete-title"
      >
        <form noValidate onSubmit={(event) => void handleSubmit(event)} className="modal__form">
          <div className="modal__header">
            <h2 id="handover-complete-title">정말 완료하시겠습니까?</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기" disabled={busy}>
              ✕
            </button>
          </div>

          <p className="review-action-modal__guest">
            {multiple ? `선택한 인수인계 ${cards.length}건` : cards[0]?.title}
          </p>
          <p className="review-action-modal__preview">
            완료 후에는 진행 목록에서 빠집니다. 실제로 어떻게 처리했는지 결과를 남겨 주세요.
          </p>

          <label className="field field--full">
            <span>처리 결과 *</span>
            <textarea
              value={resolution}
              onChange={(event) => {
                setResolution(event.target.value);
                if (error) setError('');
              }}
              rows={5}
              placeholder="예) 고객에게 안내 완료 후 재확인했고, 이상 없음을 확인함"
              aria-label="처리 결과"
              aria-invalid={Boolean(error)}
              autoFocus
              disabled={busy}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <p className="review-action-modal__hint">
            {multiple
              ? '입력한 처리 결과가 선택한 모든 인수인계에 동일하게 저장됩니다.'
              : '작성한 내용은 완료 카드의 처리 결과로 저장되어 다음 교대에서도 확인할 수 있습니다.'}
          </p>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !resolution.trim()}>
              {busy ? '완료 처리 중…' : '처리 결과 저장 후 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
