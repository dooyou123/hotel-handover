'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { buildShiftSummaryData, getTodayLabel } from '@/lib/handover/shift-summary';
import { fetchChecklistIncomplete, logShiftHandover } from '@/lib/handover/use-activity-logs';
import type { Card, Notice, WorkSession } from '@/lib/handover/types';

type ShiftHandoverModalProps = {
  open: boolean;
  cards: Card[];
  notices: Notice[];
  session: WorkSession;
  authorLabel: string;
  onClose: () => void;
  onComplete: (message: string) => void;
};

export function ShiftHandoverModal({
  open,
  cards,
  notices,
  session,
  authorLabel,
  onClose,
  onComplete,
}: ShiftHandoverModalProps) {
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState({ total: 0, incomplete: 0 });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const data = buildShiftSummaryData(cards, notices);

  useEffect(() => {
    if (!open || !session.group) return;
    const shift = session.shift || session.group;
    fetchChecklistIncomplete(shift, session.group).then(setChecklist);
  }, [open, session.shift, session.group]);

  if (!open) return null;

  const metaLine = `${getTodayLabel()} · ${authorLabel || '근무자 미선택'} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  async function handleComplete() {
    if (!session.group || !session.name) return;
    setSaving(true);
    try {
      await logShiftHandover({
        shift: session.shift || session.group,
        staffName: session.name,
        handoverType: 'end',
        unackedUrgent: data.unackedUrgent.length,
        urgentCount: data.urgentActive.length,
        progressCount: data.progressActive.length,
        todayCount: data.todayCards.length,
        checklistIncomplete: checklist.incomplete,
        progressRemaining: data.progressActive.length,
        notes: notes.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['shift-handovers', DEFAULT_HOTEL_ID] });
      onComplete(`${authorLabel} 교대 종료가 기록되었습니다.`);
      onClose();
    } catch {
      onComplete('교대 기록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--shift" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal">
          <div className="modal__header">
            <div>
              <h2>교대 종료 — 마감 확인</h2>
              <p className="shift-modal__sub">{metaLine}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="shift-modal__stats">
            {data.unackedUrgent.length > 0 ? (
              <span className="shift-stat shift-stat--warn">
                ⚠️ 미확인 긴급 <strong>{data.unackedUrgent.length}</strong>
              </span>
            ) : null}
            <span className="shift-stat">
              🔴 긴급 <strong>{data.urgentActive.length}</strong>
            </span>
            <span className="shift-stat">
              🟡 진행중 <strong>{data.progressActive.length}</strong>
            </span>
          </div>

          <div className="shift-modal__body">
            <div className="shift-modal__checks">
              {[
                {
                  warn: data.unackedUrgent.length > 0,
                  title: '미확인 긴급',
                  value: `${data.unackedUrgent.length}건`,
                  detail: data.unackedUrgent.length > 0 ? '카드에서 ✓ 긴급 확인 필요' : '모두 확인됨',
                },
                {
                  warn: data.progressActive.length > 0,
                  title: '진행중 잔여',
                  value: `${data.progressActive.length}건`,
                  detail: data.progressActive.length > 0 ? '다음 교대에 넘김' : '진행중 없음',
                },
                {
                  warn: data.holdActive.length > 0,
                  title: '보류 잔여',
                  value: `${data.holdActive.length}건`,
                  detail: data.holdActive.length > 0 ? '대기 중 — 재개 시점 확인' : '보류 없음',
                },
                {
                  warn: checklist.incomplete > 0,
                  title: '체크리스트',
                  value: checklist.total ? `${checklist.total - checklist.incomplete}/${checklist.total} 완료` : '항목 없음',
                  detail:
                    checklist.incomplete > 0
                      ? `미완료 ${checklist.incomplete}건`
                      : checklist.total
                        ? '모두 완료'
                        : '설정에서 항목 추가 가능',
                },
                {
                  warn: data.urgentActive.length > 0,
                  title: '긴급 칸 잔여',
                  value: `${data.urgentActive.length}건`,
                  detail: '다음 교대 인수 대상',
                },
              ].map((check) => (
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
            <label className="field">
              <span>교대 종료 메모 (선택)</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="다음 교대에 전달할 내용"
              />
            </label>
          </div>

          <div className="modal__footer shift-modal__footer">
            <p className="shift-modal__note">진행중·긴급 잔여 건은 다음 교대 인수 대상입니다.</p>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="button" disabled={saving} onClick={() => void handleComplete()} className="btn btn--primary">
                {saving ? '기록 중…' : '교대 종료 기록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
