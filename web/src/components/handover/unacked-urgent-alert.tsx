'use client';

type UnackedUrgentAlertProps = {
  count: number;
  isFilterActive: boolean;
  onShowUnacked: () => void;
};

export function UnackedUrgentAlert({ count, isFilterActive, onShowUnacked }: UnackedUrgentAlertProps) {
  if (count <= 0) return null;

  return (
    <section
      className={`unacked-urgent-alert${isFilterActive ? ' unacked-urgent-alert--active' : ''}`}
      aria-live="polite"
      role="status"
    >
      <div className="unacked-urgent-alert__content">
        <span className="unacked-urgent-alert__pulse" aria-hidden />
        <div className="unacked-urgent-alert__text">
          <strong>미확인 긴급 {count}건</strong>
          <span className="unacked-urgent-alert__hint">긴급 칸에서 ✓ 확인 필요</span>
        </div>
      </div>
      {!isFilterActive ? (
        <button type="button" className="btn btn--ghost btn--small unacked-urgent-alert__action" onClick={onShowUnacked}>
          미확인 긴급 보기
        </button>
      ) : (
        <span className="unacked-urgent-alert__status">필터 적용 중</span>
      )}
    </section>
  );
}
