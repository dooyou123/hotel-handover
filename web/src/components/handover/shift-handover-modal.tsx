'use client';

import { useEffect, useState } from 'react';
import { ACTION_LABELS } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import {
  buildShiftSummaryData,
  cardStatusLabel,
  formatActivityDetail,
  getTodayLabel,
  isToday,
} from '@/lib/handover/shift-summary';
import { openShiftBriefWindow } from '@/lib/handover/open-shift-brief';
import { fetchChecklistIncomplete, logShiftHandover } from '@/lib/handover/use-activity-logs';
import type { ActivityLog, Card, Notice, ShiftHandoverType, WorkSession } from '@/lib/handover/types';

type ShiftHandoverModalProps = {
  open: boolean;
  mode: ShiftHandoverType;
  cards: Card[];
  notices: Notice[];
  activityLogs: ActivityLog[];
  session: WorkSession;
  authorLabel: string;
  onClose: () => void;
  onComplete: (message: string) => void;
  onHandoverComplete?: (mode: ShiftHandoverType) => void;
  onOpenExport?: () => void;
};

function SummarySection({
  title,
  subtitle,
  items,
  warn,
  renderItem,
}: {
  title: string;
  subtitle?: string;
  items: unknown[];
  warn?: boolean;
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section className={`shift-section${warn ? ' shift-section--warn' : ''}`}>
      <div className="shift-section__header">
        <h3>
          {title} ({items.length}건)
        </h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="shift-section__list">{items.map(renderItem)}</div>
    </section>
  );
}

function CardSummaryItem({ card, warn }: { card: Card; warn?: boolean }) {
  return (
    <div className={`shift-item${warn ? ' shift-item--warn' : ''}`}>
      <div className="shift-item__top">
        <span className="shift-item__status">{cardStatusLabel(card)}</span>
        {card.room ? <span className="shift-item__room">{card.room}</span> : null}
      </div>
      <p className="shift-item__title">{card.title}</p>
      {card.next_action ? <p className="shift-item__action">다음: {card.next_action}</p> : null}
      <p className="shift-item__meta">
        {card.author || '작성자 미입력'} · {formatTime(card.updated_at || card.created_at)}
      </p>
    </div>
  );
}

function NoticeSummaryItem({ notice }: { notice: Notice }) {
  return (
    <div className="shift-item">
      <p className="shift-item__title">{notice.content}</p>
      <p className="shift-item__meta">
        {notice.author || '작성자 미입력'} · {formatTime(notice.updated_at || notice.created_at)}
      </p>
    </div>
  );
}

function ActivitySummaryItem({ log }: { log: ActivityLog }) {
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
  const detail = formatActivityDetail(log);
  return (
    <div className="shift-item">
      <div className="shift-item__top">
        <span className="shift-item__status">{ACTION_LABELS[log.action] || log.action}</span>
        <span className="shift-item__meta">{formatTime(log.created_at)}</span>
      </div>
      <p className="shift-item__title">{log.summary}</p>
      <p className="shift-item__meta">
        {actor}
        {detail ? ` · ${detail}` : ''}
      </p>
    </div>
  );
}

export function ShiftHandoverModal({
  open,
  mode,
  cards,
  notices,
  activityLogs,
  session,
  authorLabel,
  onClose,
  onComplete,
  onHandoverComplete,
  onOpenExport,
}: ShiftHandoverModalProps) {
  const [checklist, setChecklist] = useState({ total: 0, incomplete: 0 });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const data = buildShiftSummaryData(cards, notices);
  const todayLogs = activityLogs.filter((log) => isToday(log.created_at));

  useEffect(() => {
    if (!open || mode !== 'end' || !session.group) return;
    const shift = session.shift || session.group;
    fetchChecklistIncomplete(shift, session.group).then(setChecklist);
  }, [open, mode, session.shift, session.group]);

  if (!open) return null;

  const metaLine = `${getTodayLabel()} · ${authorLabel || '근무자 미선택'} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  async function handleComplete() {
    if (!session.group || !session.name) return;
    setSaving(true);
    try {
      await logShiftHandover({
        shift: session.shift || session.group,
        staffName: session.name,
        handoverType: mode,
        unackedUrgent: data.unackedUrgent.length,
        urgentCount: data.urgentActive.length,
        progressCount: data.progressActive.length,
        todayCount: data.todayCards.length,
        checklistIncomplete: checklist.incomplete,
        progressRemaining: data.progressActive.length,
        notes: mode === 'end' ? notes.trim() : '',
      });
      onComplete(
        mode === 'start'
          ? `${authorLabel} 교대 인수가 기록되었습니다.`
          : `${authorLabel} 교대 종료가 기록되었습니다.`,
      );
      onHandoverComplete?.(mode);
      onClose();
    } catch {
      onComplete('교대 기록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const startSections = (
    <>
      <SummarySection
        title="⚠️ 미확인 긴급"
        subtitle="교대 시작 후 카드에서 ✓ 긴급 확인을 눌러 주세요."
        items={data.unackedUrgent}
        warn
        renderItem={(item) => <CardSummaryItem key={(item as Card).id} card={item as Card} warn />}
      />
      <SummarySection
        title="🔴 현재 긴급"
        items={data.urgentActive}
        renderItem={(item) => <CardSummaryItem key={(item as Card).id} card={item as Card} />}
      />
      <SummarySection
        title="🟡 현재 진행중"
        items={data.progressActive}
        renderItem={(item) => <CardSummaryItem key={(item as Card).id} card={item as Card} />}
      />
      <SummarySection
        title="📢 업무 공지"
        items={data.announcements}
        renderItem={(item) => <NoticeSummaryItem key={(item as Notice).id} notice={item as Notice} />}
      />
      <SummarySection
        title="🔄 업무 변경"
        items={data.changes}
        renderItem={(item) => <NoticeSummaryItem key={(item as Notice).id} notice={item as Notice} />}
      />
      <SummarySection
        title="✅ 오늘 완료"
        items={data.doneToday}
        renderItem={(item) => <CardSummaryItem key={(item as Card).id} card={item as Card} />}
      />
    </>
  );

  const endSections = (
    <>
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
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--shift" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal">
          <div className="modal__header">
            <div>
              <h2>{mode === 'start' ? '교대 시작 — 오늘 업무 요약' : '교대 종료 — 마감 확인'}</h2>
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
            {mode === 'start' ? startSections : endSections}

            {mode === 'start' && todayLogs.length > 0 ? (
              <SummarySection
                title="📝 오늘 변경 기록"
                items={todayLogs.slice(0, 10)}
                renderItem={(item) => (
                  <ActivitySummaryItem key={(item as ActivityLog).id} log={item as ActivityLog} />
                )}
              />
            ) : null}

            {mode === 'start' &&
            !data.unackedUrgent.length &&
            !data.urgentActive.length &&
            !data.progressActive.length ? (
              <p className="shift-empty">오늘 표시할 업무가 없습니다.</p>
            ) : null}
          </div>

          <div className="modal__footer shift-modal__footer">
            <p className="shift-modal__note">
              {mode === 'start'
                ? '미확인 긴급 건은 본 화면 확인 후 카드에서 ✓ 긴급 확인을 눌러 주세요.'
                : '진행중·긴급 잔여 건은 다음 교대 인수 대상입니다.'}
            </p>
            <div className="modal__footer-right">
              {mode === 'start' ? (
                <button type="button" onClick={() => openShiftBriefWindow()} className="btn btn--outline">
                  전용 화면으로 보기
                </button>
              ) : null}
              {onOpenExport ? (
                <button type="button" onClick={onOpenExport} className="btn btn--ghost">
                  일일 요약 내보내기
                </button>
              ) : null}
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="button" disabled={saving} onClick={handleComplete} className="btn btn--primary">
                {mode === 'start' ? '인수 완료' : '교대 종료 기록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
