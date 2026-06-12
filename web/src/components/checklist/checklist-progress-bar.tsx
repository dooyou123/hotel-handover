type ChecklistProgressBarProps = {
  done: number;
  total: number;
  label?: string;
  compact?: boolean;
};

export function ChecklistProgressBar({ done, total, label, compact = false }: ChecklistProgressBarProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const ariaLabel = label ?? `체크리스트 완료 ${percent}%`;

  return (
    <div
      className={`checklist-progress${compact ? ' checklist-progress--compact' : ''}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className="checklist-progress__track">
        <div
          className={`checklist-progress__fill${percent >= 100 ? ' is-complete' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="checklist-progress__meta">
        <span className="checklist-progress__percent">{percent}%</span>
        {!compact ? <span className="checklist-progress__count">{done}/{total}</span> : null}
      </span>
    </div>
  );
}
