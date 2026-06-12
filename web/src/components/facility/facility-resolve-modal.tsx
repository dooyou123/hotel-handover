'use client';

import { useEffect, useState } from 'react';
import type { Card } from '@/lib/handover/types';

type FacilityResolveModalProps = {
  open: boolean;
  card: Card | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: { resolution: string; leaveOnHandoverDone: boolean }) => Promise<void>;
};

export function FacilityResolveModal({ open, card, saving, onClose, onSubmit }: FacilityResolveModalProps) {
  const [resolution, setResolution] = useState('');
  const [leaveOnHandoverDone, setLeaveOnHandoverDone] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setResolution('');
    setLeaveOnHandoverDone(true);
    setError(null);
  }, [open, card?.id]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !card) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = resolution.trim();
    if (!text) {
      setError('처리 내용을 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      await onSubmit({ resolution: text, leaveOnHandoverDone });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--facility-resolve" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="facility-resolve-title">
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className="modal__form facility-resolve-modal">
          <div className="modal__header">
            <div>
              <h2 id="facility-resolve-title">시설 이슈 해결</h2>
              <p className="facility-resolve-modal__sub">
                {card.room ? `객실 ${card.room} · ` : ''}
                {card.title}
              </p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="facility-resolve-modal__body">
            <label className="field field--full">
              <span>처리 내용 *</span>
              <textarea
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="수리 완료, HK 전달, 손님 안내 등"
                autoFocus
              />
            </label>

            <label className="field field--checkbox field--full facility-resolve-modal__checkbox">
              <input
                type="checkbox"
                checked={leaveOnHandoverDone}
                onChange={(e) => setLeaveOnHandoverDone(e.target.checked)}
              />
              <span>다음 조 인계에 완료로 남기기</span>
            </label>
            <p className="facility-resolve-modal__hint">
              {leaveOnHandoverDone
                ? '인수인계 완료 칸에 남아 다음 교대가 확인할 수 있습니다.'
                : '완료 처리 후 보관함으로 옮겨 보드에서는 숨깁니다. 시설 이력에는 남습니다.'}
            </p>

            {error ? <p className="form-error">{error}</p> : null}
          </div>

          <div className="modal__footer">
            <span />
            <div className="modal__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '저장 중…' : '해결 완료'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
