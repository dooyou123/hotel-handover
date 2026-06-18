'use client';

import type { ShiftWorkbenchState } from '@/lib/handover/shift-ui-state';

type HandoverTopActionsProps = {
  shiftState: ShiftWorkbenchState;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  layout?: 'bar' | 'grid' | 'compact';
};

const ACTION_HINTS = {
  start: '인수인계를 시작하고 「인계」 탭에서 미완료 업무를 확인합니다.',
  end: '근무 종료 시 잔여 업무를 정리하고 교대 종료를 기록합니다.',
  brief: '교대 인계 요약 화면으로 이동합니다.',
} as const;

export function HandoverTopActions({
  shiftState,
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  layout = 'bar',
}: HandoverTopActionsProps) {
  const startPrimary = shiftState === 'needs_start';
  const onShift = shiftState === 'on_shift';
  const needsSession = shiftState === 'needs_session';

  const startBtn = (
    <button
      key="start"
      type="button"
      className={`handover-top-actions__btn handover-top-actions__btn--start${
        startPrimary ? ' is-primary' : onShift ? ' is-muted' : ''
      }`}
      title={ACTION_HINTS.start}
      disabled={needsSession || onShift}
      onClick={onShiftStart}
    >
      교대 시작
    </button>
  );

  const briefBtn = (
    <button
      key="brief"
      type="button"
      className={`handover-top-actions__btn handover-top-actions__btn--brief${
        onShift ? ' is-primary is-handover' : ''
      }`}
      title={ACTION_HINTS.brief}
      disabled={needsSession}
      onClick={onOpenShiftBrief}
    >
      <span className="handover-top-actions__icon" aria-hidden>
        🔄
      </span>
      교대 인계
    </button>
  );

  const endBtn = (
    <button
      key="end"
      type="button"
      className={`handover-top-actions__btn handover-top-actions__btn--end${
        onShift ? ' is-secondary' : ''
      }`}
      title={ACTION_HINTS.end}
      disabled={needsSession}
      onClick={onShiftEnd}
    >
      교대 종료
    </button>
  );

  const buttons = onShift ? [briefBtn, endBtn, startBtn] : [startBtn, endBtn, briefBtn];

  return (
    <section
      className={`handover-top-actions handover-top-actions--${shiftState}${
        layout === 'grid'
          ? ' handover-top-actions--grid'
          : layout === 'compact'
            ? ' handover-top-actions--compact'
            : ''
      }`}
      aria-label="교대"
    >
      <div className="handover-top-actions__buttons">{buttons}</div>
    </section>
  );
}
