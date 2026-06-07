'use client';

import { ACTION_LABELS } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import { formatActivityDetail } from '@/lib/handover/shift-summary';
import type { ActivityLog } from '@/lib/handover/types';

type ActivityLogModalProps = {
  open: boolean;
  logs: ActivityLog[];
  isLoading: boolean;
  onClose: () => void;
};

export function ActivityLogModal({ open, logs, isLoading, onClose }: ActivityLogModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <div className="activity-modal">
          <div className="modal__header">
            <div>
              <h2>변경 기록</h2>
              <p className="shift-modal__sub">카드·공지 추가·수정·삭제 내역</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="activity-modal__body">
            {isLoading ? (
              <p className="shift-empty">불러오는 중…</p>
            ) : logs.length ? (
              logs.map((log) => {
                const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
                const detail = formatActivityDetail(log);
                return (
                  <article key={log.id} className="activity-item">
                    <div className="activity-item__top">
                      <span
                        className={`activity-item__action${
                          log.action === 'delete' ? ' activity-item__action--delete' : ''
                        }`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span className="activity-item__time">{formatTime(log.created_at)}</span>
                    </div>
                    <p className="activity-item__summary">{log.summary}</p>
                    <p className="activity-item__meta">{actor}</p>
                    {detail ? <p className="activity-item__detail">{detail}</p> : null}
                  </article>
                );
              })
            ) : (
              <p className="shift-empty">아직 기록된 변경 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
