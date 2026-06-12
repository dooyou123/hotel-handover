'use client';

import type { ReconcileResult } from '@/lib/rate-confirm/compare-engine';

type RateConfirmSaveDialogProps = {
  open: boolean;
  saving: boolean;
  notes: string;
  tlFileName?: string;
  pmsFileName?: string;
  result: ReconcileResult | null;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function RateConfirmSaveDialog({
  open,
  saving,
  notes,
  tlFileName,
  pmsFileName,
  result,
  onNotesChange,
  onClose,
  onSave,
}: RateConfirmSaveDialogProps) {
  if (!open || !result) return null;

  const errorCount = result.summary.errorCount;
  const matchCount = result.matches.length;

  return (
    <div className="rc-save-overlay" role="presentation">
      <button type="button" className="rc-save-overlay__backdrop" aria-label="닫기" onClick={onClose} />
      <section className="rc-save-sheet" role="dialog" aria-modal="true" aria-labelledby="rc-save-title">
        <div className="rc-save-sheet__handle" aria-hidden />
        <header className="rc-save-sheet__head">
          <div>
            <p className="rc-save-sheet__eyebrow">객실료 컨펌</p>
            <h2 id="rc-save-title">대조 결과 저장</h2>
          </div>
          <button type="button" className="rc-save-sheet__close" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="rc-save-sheet__stats">
          <div className="rc-save-sheet__stat rc-save-sheet__stat--alert">
            <span>불일치</span>
            <strong>{errorCount}</strong>
          </div>
          <div className="rc-save-sheet__stat rc-save-sheet__stat--ok">
            <span>일치</span>
            <strong>{matchCount}</strong>
          </div>
        </div>

        <div className="rc-save-sheet__body">
          <p className="rc-save-sheet__lead">
            저장 후 불일치 건마다 <strong>PMS 수정 내용</strong>을 남길 수 있습니다. 이력 탭에서
            누가·언제·어떻게 고쳤는지 확인할 수 있습니다.
          </p>

          {tlFileName || pmsFileName ? (
            <dl className="rc-save-sheet__files">
              {tlFileName ? (
                <div>
                  <dt>TL</dt>
                  <dd>{tlFileName}</dd>
                </div>
              ) : null}
              {pmsFileName ? (
                <div>
                  <dt>PMS</dt>
                  <dd>{pmsFileName}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <label className="rc-save-sheet__field">
            <span>메모 (선택)</span>
            <textarea
              rows={3}
              value={notes}
              placeholder="예: 6/8 B조 오전 TL RAW vs PMS 06:30 export"
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </label>
        </div>

        <footer className="rc-save-sheet__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={onSave}>
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </footer>
      </section>
    </div>
  );
}
