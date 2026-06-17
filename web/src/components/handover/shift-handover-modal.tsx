'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { isCardOverdue } from '@/lib/handover/card-utils';
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

type BlockingCheckId = 'unacked' | 'overdue' | 'checklist';

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
  const [checkedBlocking, setCheckedBlocking] = useState<Record<BlockingCheckId, boolean>>({
    unacked: false,
    overdue: false,
    checklist: false,
  });

  const data = buildShiftSummaryData(cards, notices);
  const overdueCards = useMemo(() => cards.filter(isCardOverdue), [cards]);

  const blockingChecks = useMemo(() => {
    const items: { id: BlockingCheckId; title: string; value: string; detail: string }[] = [];
    if (data.unackedUrgent.length > 0) {
      items.push({
        id: 'unacked',
        title: '미확인 긴급',
        value: `${data.unackedUrgent.length}건`,
        detail: '카드에서 ✓ 긴급 확인 필요',
      });
    }
    if (overdueCards.length > 0) {
      items.push({
        id: 'overdue',
        title: '마감 지난 인계',
        value: `${overdueCards.length}건`,
        detail: '마감이 지났습니다 — 처리 또는 보류 확인',
      });
    }
    if (checklist.incomplete > 0) {
      items.push({
        id: 'checklist',
        title: '체크리스트 미완료',
        value: `${checklist.incomplete}건`,
        detail: `미완료 ${checklist.incomplete}건`,
      });
    }
    return items;
  }, [checklist.incomplete, data.unackedUrgent.length, overdueCards.length]);

  const canSubmit = blockingChecks.every((check) => checkedBlocking[check.id]);

  useEffect(() => {
    if (!open || !session.group) return;
    const shift = session.shift || session.group;
    fetchChecklistIncomplete(shift, session.group).then(setChecklist);
  }, [open, session.shift, session.group]);

  useEffect(() => {
    if (!open) return;
    setCheckedBlocking({ unacked: false, overdue: false, checklist: false });
    setNotes('');
  }, [open]);

  if (!open) return null;

  const metaLine = `${getTodayLabel()} · ${authorLabel || '근무자 미선택'} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  async function handleComplete() {
    if (!session.group || !session.name || !canSubmit) return;
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
            {overdueCards.length > 0 ? (
              <span className="shift-stat shift-stat--warn">
                ⏰ 마감 지남 <strong>{overdueCards.length}</strong>
              </span>
            ) : null}
            {data.staleActive.length > 0 ? (
              <span className="shift-stat shift-stat--warn">
                💤 오래 방치 <strong>{data.staleActive.length}</strong>
              </span>
            ) : null}
            {data.longHoldActive.length > 0 ? (
              <span className="shift-stat shift-stat--warn">
                ⏸ 보류 오래됨 <strong>{data.longHoldActive.length}</strong>
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
            {blockingChecks.length ? (
              <div className="shift-modal__blocking">
                <p className="shift-modal__blocking-lead">아래 항목을 확인한 뒤 체크해 주세요.</p>
                <ul className="shift-modal__blocking-list">
                  {blockingChecks.map((check) => (
                    <li key={check.id}>
                      <label className="shift-modal__blocking-item">
                        <input
                          type="checkbox"
                          checked={checkedBlocking[check.id]}
                          onChange={(event) =>
                            setCheckedBlocking((prev) => ({ ...prev, [check.id]: event.target.checked }))
                          }
                        />
                        <span>
                          <strong>{check.title}</strong> · {check.value}
                          <span className="shift-modal__blocking-detail">{check.detail}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="shift-modal__checks">
              {[
                {
                  warn: data.unackedUrgent.length > 0,
                  title: '미확인 긴급',
                  value: `${data.unackedUrgent.length}건`,
                  detail: data.unackedUrgent.length > 0 ? '카드에서 ✓ 긴급 확인 필요' : '모두 확인됨',
                },
                {
                  warn: overdueCards.length > 0,
                  title: '마감 지난 인계',
                  value: `${overdueCards.length}건`,
                  detail: overdueCards.length > 0 ? '마감 경과 — 처리·보류 확인' : '없음',
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
                  warn: data.staleActive.length > 0,
                  title: '오래 방치',
                  value: `${data.staleActive.length}건`,
                  detail: '4시간 이상 업데이트 없음',
                },
                {
                  warn: data.longHoldActive.length > 0,
                  title: '보류 오래됨',
                  value: `${data.longHoldActive.length}건`,
                  detail: '24시간 이상 보류 유지',
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
            <p className="shift-modal__note">
              {blockingChecks.length
                ? '필수 확인 항목을 모두 체크해야 교대 종료를 기록할 수 있습니다.'
                : '진행중·긴급 잔여 건은 다음 교대 인수 대상입니다.'}
            </p>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button
                type="button"
                disabled={saving || !canSubmit}
                onClick={() => void handleComplete()}
                className="btn btn--primary"
              >
                {saving ? '기록 중…' : '교대 종료 기록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
