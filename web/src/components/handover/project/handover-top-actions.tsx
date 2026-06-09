'use client';

type HandoverTopActionsProps = {
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onExport: () => void;
  onActivity: () => void;
  layout?: 'bar' | 'grid';
};

export function HandoverTopActions({
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onExport,
  onActivity,
  layout = 'bar',
}: HandoverTopActionsProps) {
  return (
    <section
      className={`handover-top-actions${layout === 'grid' ? ' handover-top-actions--grid' : ''}`}
      aria-label="교대 · 기록"
    >
      <button type="button" className="handover-top-actions__btn" onClick={onShiftStart}>
        교대 시작
      </button>
      <button type="button" className="handover-top-actions__btn" onClick={onShiftEnd}>
        교대 종료
      </button>
      <button type="button" className="handover-top-actions__btn handover-top-actions__btn--accent" onClick={onOpenShiftBrief}>
        교대 인계
      </button>
      <span className="handover-top-actions__sep" aria-hidden />
      <button type="button" className="handover-top-actions__btn" onClick={onExport}>
        일일 요약
      </button>
      <button type="button" className="handover-top-actions__btn" onClick={onActivity}>
        변경 기록
      </button>
    </section>
  );
}
