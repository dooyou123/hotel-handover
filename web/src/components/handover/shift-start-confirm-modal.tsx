'use client';

import { createPortal } from 'react-dom';
import { getTodayLabel, type ShiftSummaryData } from '@/lib/handover/shift-summary';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type ShiftStartConfirmModalProps = {
  open: boolean;
  authorLabel: string;
  summary: ShiftSummaryData;
  todayTodoCount: number;
  todayEventCount?: number;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ShiftStartConfirmModal({
  open,
  authorLabel,
  summary,
  todayTodoCount,
  todayEventCount = 0,
  saving = false,
  onClose,
  onConfirm,
}: ShiftStartConfirmModalProps) {
  if (!open) return null;

  const checks = [
    {
      warn: summary.unackedUrgent.length > 0,
      title: '미확인 긴급',
      value: `${summary.unackedUrgent.length}건`,
      detail: summary.unackedUrgent.length > 0 ? '인계 탭·카드에서 ✓ 긴급 확인' : '없음',
    },
    {
      warn: summary.urgentActive.length > 0,
      title: '긴급 처리 중',
      value: `${summary.urgentActive.length}건`,
      detail: summary.urgentActive.length > 0 ? '처리 상태 확인 필요' : '없음',
    },
    {
      warn: summary.progressActive.length > 0,
      title: '진행중 업무',
      value: `${summary.progressActive.length}건`,
      detail: summary.progressActive.length > 0 ? '잔여 업무 인수 확인' : '없음',
    },
    {
      warn: summary.holdActive.length > 0,
      title: '보류',
      value: `${summary.holdActive.length}건`,
      detail: summary.holdActive.length > 0 ? '재개 시점·담당 확인' : '없음',
    },
    {
      warn: todayTodoCount + todayEventCount > 0,
      title: '오늘 업무 일정',
      value: `${todayTodoCount + todayEventCount}건`,
      detail:
        todayTodoCount + todayEventCount > 0
          ? `할일 ${todayTodoCount} · 일정 ${todayEventCount}`
          : '없음',
    },
  ];

  const pendingCount = checks.filter((check) => check.warn).length;
  const metaLine = `${getTodayLabel()} · ${authorLabel || '근무자 미선택'}`;

  const dialog = (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--shift modal--shift-start" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal shift-modal--start">
          <div className="modal__header">
            <div>
              <h2>인수인계 시작</h2>
              <p className="shift-modal__sub">{metaLine}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="shift-modal__body shift-modal__body--compact">
            <p className="shift-start-confirm__lead">인수인계를 시작하겠습니다.</p>
            <p className="shift-start-confirm__hint">
              {pendingCount > 0
                ? `아직 확인·처리가 필요한 항목이 ${pendingCount}가지 있습니다. 인계 탭에서 한눈에 확인해 주세요.`
                : '현재 표시된 미완료 업무가 없습니다. 인계 탭에서 전체 요약을 확인해 주세요.'}
            </p>

            <div className="shift-modal__checks">
              {checks.map((check) => (
                <div
                  key={check.title}
                  className={`shift-check${check.warn ? ' shift-check--warn' : ' shift-check--ok'}`}
                >
                  <p className="shift-check__title">{check.title}</p>
                  <p className="shift-check__value">{check.value}</p>
                  <p className="shift-check__detail">{check.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="modal__footer shift-modal__footer">
            <p className="shift-modal__note">교대를 시작하고 「인계」 탭으로 이동합니다.</p>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost" disabled={saving}>
                취소
              </button>
              <button type="button" onClick={onConfirm} className="btn btn--primary" disabled={saving}>
                {saving ? '시작 중…' : '교대 시작'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}
