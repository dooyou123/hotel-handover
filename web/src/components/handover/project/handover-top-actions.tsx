'use client';

type HandoverTopActionsProps = {
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onShiftHistory: () => void;
  onActivity: () => void;
  layout?: 'bar' | 'grid' | 'compact';
  showHelp?: boolean;
};

const ACTION_HINTS = [
  {
    key: 'start',
    label: '교대 시작',
    hint: '인수인계를 시작하고 「인계」 탭에서 미완료 업무를 확인합니다.',
  },
  {
    key: 'end',
    label: '교대 종료',
    hint: '근무 종료 시 잔여 업무를 정리하고 교대 종료를 기록합니다.',
  },
  {
    key: 'brief',
    label: '교대 인계',
    hint: '메인 화면 「인계」 탭으로 이동해 요약을 확인합니다.',
  },
  {
    key: 'shift-history',
    label: '교대 기록',
    hint: '교대 시작·종료 시 저장된 인수·마감 기록을 봅니다.',
  },
  {
    key: 'activity',
    label: '변경 기록',
    hint: '카드·공지 추가·수정·이동 등 업무 변경 이력을 검색합니다.',
  },
] as const;

export function HandoverTopActions({
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onShiftHistory,
  onActivity,
  layout = 'bar',
  showHelp = false,
}: HandoverTopActionsProps) {
  return (
    <section
      className={`handover-top-actions${
        layout === 'grid'
          ? ' handover-top-actions--grid'
          : layout === 'compact'
            ? ' handover-top-actions--compact'
            : ''
      }${showHelp ? ' handover-top-actions--with-help' : ''}`}
      aria-label="교대 · 기록"
    >
      <div className="handover-top-actions__buttons">
        <button
          type="button"
          className="handover-top-actions__btn"
          title={ACTION_HINTS[0].hint}
          onClick={onShiftStart}
        >
          교대 시작
        </button>
        <button
          type="button"
          className="handover-top-actions__btn"
          title={ACTION_HINTS[1].hint}
          onClick={onShiftEnd}
        >
          교대 종료
        </button>
        <button
          type="button"
          className="handover-top-actions__btn handover-top-actions__btn--accent"
          title={ACTION_HINTS[2].hint}
          onClick={onOpenShiftBrief}
        >
          교대 인계
        </button>
        <span className="handover-top-actions__sep" aria-hidden />
        <button
          type="button"
          className="handover-top-actions__btn"
          title={ACTION_HINTS[3].hint}
          onClick={onShiftHistory}
        >
          교대 기록
        </button>
        <button
          type="button"
          className="handover-top-actions__btn"
          title={ACTION_HINTS[4].hint}
          onClick={onActivity}
        >
          변경 기록
        </button>
      </div>

      {showHelp ? (
        <details className="handover-top-actions__help">
          <summary>버튼 설명</summary>
          <ul className="handover-top-actions__hints">
            {ACTION_HINTS.map((item) => (
              <li key={item.key} className="handover-top-actions__hint">
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
