'use client';

type CardAckUrgentCalloutProps = {
  staffName: string;
  onAcknowledge: () => void;
  acknowledging?: boolean;
};

export function CardAckUrgentCallout({
  staffName,
  onAcknowledge,
  acknowledging = false,
}: CardAckUrgentCalloutProps) {
  const displayName = staffName.trim() || '담당자';

  return (
    <div
      className="card-ack-callout"
      role="status"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="card-ack-callout__copy">
        <p className="card-ack-callout__lead">이 카드를 먼저 확인해 주세요</p>
        <p className="card-ack-callout__who">
          <strong className="card-ack-callout__name">{displayName}</strong>
          <span className="card-ack-callout__suffix">님 확인 필요</span>
        </p>
      </div>
      <button
        type="button"
        className="card-ack-callout__btn"
        onClick={onAcknowledge}
        disabled={acknowledging}
      >
        {acknowledging ? '확인 중…' : '지금 확인'}
      </button>
    </div>
  );
}
