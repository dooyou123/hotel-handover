'use client';

import { useState } from 'react';
import {
  RESOLUTION_ACTION_LABELS,
  RESOLUTION_STATUS_LABELS,
  type RateConfirmItem,
  type RateConfirmResolutionAction,
  type SaveResolutionInput,
} from '@/lib/rate-confirm/history-types';

const ACTION_OPTIONS = Object.entries(RESOLUTION_ACTION_LABELS) as [RateConfirmResolutionAction, string][];

type RateConfirmResolutionFormProps = {
  item: RateConfirmItem;
  disabled?: boolean;
  onSave: (input: SaveResolutionInput) => Promise<void>;
};

export function RateConfirmResolutionForm({
  item,
  disabled = false,
  onSave,
}: RateConfirmResolutionFormProps) {
  const [action, setAction] = useState<RateConfirmResolutionAction | ''>(
    (item.resolution_action as RateConfirmResolutionAction) || '',
  );
  const [note, setNote] = useState(item.resolution_note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (item.resolution_status !== 'pending') {
    const actionLabel =
      item.resolution_action &&
      item.resolution_action in RESOLUTION_ACTION_LABELS
        ? RESOLUTION_ACTION_LABELS[item.resolution_action as RateConfirmResolutionAction]
        : item.resolution_action || '—';

    return (
      <div className="rc-resolution rc-resolution--done">
        <p className="rc-resolution__status">
          <span className={`rc-resolution__badge rc-resolution__badge--${item.resolution_status}`}>
            {RESOLUTION_STATUS_LABELS[item.resolution_status]}
          </span>
          {actionLabel !== '—' ? <span className="rc-resolution__action-label">{actionLabel}</span> : null}
        </p>
        {item.resolution_note ? (
          <p className="rc-resolution__note">{item.resolution_note}</p>
        ) : null}
        {item.resolved_by ? (
          <p className="rc-resolution__meta">
            {item.resolved_by}
            {item.resolved_at
              ? ` · ${new Date(item.resolved_at).toLocaleString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        ) : null}
      </div>
    );
  }

  async function handleSubmit(status: 'resolved' | 'skipped') {
    if (status === 'resolved' && !action) {
      setError('처리 방법을 선택해 주세요.');
      return;
    }
    if (status === 'resolved' && !note.trim()) {
      setError('어떻게 수정했는지 메모를 입력해 주세요.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        resolution_status: status,
        resolution_action: action,
        resolution_note: note,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rc-resolution">
      <p className="rc-resolution__lead">PMS·TL에서 어떻게 수정했는지 기록해 주세요.</p>
      <label className="rc-resolution__field">
        <span>처리 방법</span>
        <select
          value={action}
          disabled={disabled || saving}
          onChange={(e) => setAction(e.target.value as RateConfirmResolutionAction | '')}
        >
          <option value="">— 선택 —</option>
          {ACTION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="rc-resolution__field">
        <span>수정 내용</span>
        <textarea
          rows={3}
          value={note}
          disabled={disabled || saving}
          placeholder="예: PMS 객실료 +12,000원 조정, 예약상태 RR로 변경"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error ? <p className="rc-resolution__error">{error}</p> : null}
      <div className="rc-resolution__actions">
        <button
          type="button"
          className="btn btn--primary btn--small"
          disabled={disabled || saving}
          onClick={() => void handleSubmit('resolved')}
        >
          {saving ? '저장 중…' : '처리 완료'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          disabled={disabled || saving}
          onClick={() => void handleSubmit('skipped')}
        >
          처리 불필요
        </button>
      </div>
    </div>
  );
}
