'use client';

import { formatTime } from '@/lib/handover/card-utils';
import type { ShiftHandover } from '@/lib/handover/types';
import { useShiftHandovers } from '@/lib/handover/use-activity-logs';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type ShiftHandoverLogModalProps = {
  open: boolean;
  onClose: () => void;
};

function handoverTypeLabel(type: ShiftHandover['handover_type']): string {
  return type === 'start' ? '교대 시작' : '교대 종료';
}

function ShiftHandoverLogItem({ record }: { record: ShiftHandover }) {
  const isStart = record.handover_type === 'start';
  return (
    <article className="activity-item">
      <div className="activity-item__top">
        <span className={`activity-item__badge${isStart ? ' activity-item__badge--create' : ''}`}>
          {handoverTypeLabel(record.handover_type)}
        </span>
        <span className="activity-item__entity">{record.shift}</span>
        <time className="activity-item__time" dateTime={record.handover_at}>
          {formatTime(record.handover_at)}
        </time>
      </div>
      <p className="activity-item__headline">
        <strong>{record.staff_name || '—'}</strong>
        <span>
          {' '}
          · 미확인 긴급 {record.unacked_urgent} · 긴급 {record.urgent_count} · 진행 {record.progress_count}
          {record.checklist_incomplete > 0 ? ` · 체크리스트 미완료 ${record.checklist_incomplete}` : ''}
        </span>
      </p>
      {record.notes.trim() ? (
        <blockquote className="activity-item__quote">{record.notes.trim()}</blockquote>
      ) : null}
    </article>
  );
}

export function ShiftHandoverLogModal({ open, onClose }: ShiftHandoverLogModalProps) {
  const { data: records = [], isLoading } = useShiftHandovers({ limit: 80, todayOnly: false, enabled: open });

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <div className="activity-modal">
          <div className="modal__header">
            <div>
              <h2>교대 기록</h2>
              <p className="shift-modal__sub">교대 시작·종료 시 저장된 인수·마감 스냅샷입니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="activity-modal__body">
            {isLoading ? (
              <p className="shift-empty">불러오는 중…</p>
            ) : records.length ? (
              records.map((record) => <ShiftHandoverLogItem key={record.id} record={record} />)
            ) : (
              <p className="shift-empty">저장된 교대 기록이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
