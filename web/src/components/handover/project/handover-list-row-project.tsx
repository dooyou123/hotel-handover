'use client';

import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatHoldStaleBadge,
  formatSnoozeUntil,
  formatStaleBadge,
  formatUpdatedAt,
  getHoldStaleLevel,
  getStaleLevel,
  isArchivedCard,
  isCardDueActive,
  isCardSnoozed,
  isUrgentPriorityCard,
  needsComplaintFirstResponse,
  countActiveCardComments,
  hasActiveCardComments,
} from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { ComplaintSlaBadge } from '@/components/handover/complaint-sla-badge';
import { SearchHighlight } from '@/components/handover/search-highlight';
import { HandoverCardCommentSection } from './handover-card-comment-section';

type HandoverListRowProjectProps = {
  card: Card;
  position?: { index: number; total: number };
  searchQuery?: string;
  staffNames: string[];
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
  onOpenComments: () => void;
  onAddComment: (content: string) => Promise<void>;
  staffName: string;
  commentDisabled?: boolean;
  onAcknowledge: () => void;
  onMarkDone: () => void;
  onHold: () => void;
  onResume: () => void;
  onAssignChange: (assigneeName: string) => void;
  onSnooze?: () => void;
  onUnsnooze?: () => void;
  onRecordFirstResponse?: () => void;
};

export function HandoverListRowProject({
  card,
  position,
  searchQuery = '',
  staffNames,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  onOpen,
  onOpenComments,
  onAddComment,
  staffName,
  commentDisabled = false,
  onAcknowledge,
  onMarkDone,
  onHold,
  onResume,
  onAssignChange,
  onSnooze,
  onUnsnooze,
  onRecordFirstResponse,
}: HandoverListRowProjectProps) {
  const { confirm } = useConfirmDialog();
  const isUrgent = isUrgentPriorityCard(card);
  const isUnacked = isUrgent && card.card_acknowledgments.length === 0;
  const archived = isArchivedCard(card);
  const snoozed = isCardSnoozed(card);
  const staleLevel = getStaleLevel(card);
  const holdStaleLevel = getHoldStaleLevel(card);
  const needsFirstResponse = needsComplaintFirstResponse(card);
  const activeCommentCount = countActiveCardComments(card);
  const hasComments = hasActiveCardComments(card);
  const preview = card.next_action?.trim() || card.details?.trim() || card.resolution?.trim() || '';
  const status = archived
    ? '보관'
    : card.column_id === 'done'
      ? '완료'
      : card.column_id === 'hold'
        ? '보류'
        : isUnacked
          ? '미확인'
          : '진행';
  const canComplete = !archived && card.column_id !== 'done';
  const canHold = !archived && card.column_id !== 'done' && card.column_id !== 'hold';
  const canResume = !archived && card.column_id === 'hold';
  const canAssign = !archived && card.column_id !== 'done';
  const canSnooze = !bulkMode && isCardDueActive(card);
  const author = card.author?.trim() || '미입력';
  const assignee = formatAssigneeLabel(card);
  const updatedAt = formatUpdatedAt(card.updated_at || card.created_at);

  const statusClass =
    status === '미확인'
      ? 'warn'
      : status === '완료'
        ? 'done'
        : status === '보관'
          ? 'archive'
          : status === '보류'
            ? 'hold'
            : 'active';

  return (
    <article
      id={`handover-card-${card.id}`}
      className={[
        'project-list-row',
        isUnacked ? 'is-unacked' : '',
        archived ? 'is-archived' : '',
        card.column_id === 'done' ? 'is-done' : '',
        card.column_id === 'hold' ? 'is-hold' : '',
        isUrgent ? 'is-urgent-priority' : '',
        bulkMode ? 'is-bulk-mode' : '',
        selected ? 'is-selected' : '',
        hasComments ? 'has-comments' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {bulkMode ? (
        <label className="project-list-row__select" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`${card.title} 선택`}
            onChange={() => onToggleSelect?.()}
          />
        </label>
      ) : null}
      <div className="project-list-row__body">
        <button type="button" className="project-list-row__main" onClick={onOpen}>
          <div className="project-list-row__top">
            <span className={`project-list-row__status project-list-row__status--${statusClass}`}>
              {status}
            </span>
            <span className="project-list-row__meta">
              {hasComments ? (
                <span className="project-list-row__badge project-list-row__badge--comments">
                  댓글 {activeCommentCount}
                </span>
              ) : null}
              <span
                className={`project-list-row__badge${isUrgent ? ' project-list-row__badge--urgent' : ''}`}
              >
                {PRIORITY_LABELS[card.priority]}
              </span>
              <span className="project-list-row__badge">{card.category}</span>
              {snoozed && card.snoozed_until ? (
                <span className="project-list-row__badge project-list-row__badge--snooze">
                  알림 끔 · {formatSnoozeUntil(card.snoozed_until)}까지
                </span>
              ) : null}
              {staleLevel ? (
                <span
                  className={`project-list-row__badge project-list-row__badge--stale${staleLevel === 'high' ? ' project-list-row__badge--stale-high' : ''}`}
                >
                  {formatStaleBadge(staleLevel)}
                </span>
              ) : null}
              {holdStaleLevel ? (
                <span
                  className={`project-list-row__badge project-list-row__badge--hold-stale${holdStaleLevel === 'high' ? ' project-list-row__badge--hold-stale-high' : ''}`}
                >
                  {formatHoldStaleBadge(holdStaleLevel)}
                </span>
              ) : null}
              {archived ? (
                <span className="project-list-row__badge project-list-row__badge--archive">완료 보관</span>
              ) : null}
            </span>
            <ComplaintSlaBadge card={card} />
          </div>

          <span className="project-list-row__title" title={card.title}>
            {card.room ? (
              <span className="project-list-row__room card-room-badge" title={`객실 ${card.room}`}>
                <SearchHighlight text={card.room} query={searchQuery} />
              </span>
            ) : null}
            {position ? (
              <span className="project-list-row__position" aria-label={`${position.index}번째, 남은 ${position.total}건`}>
                {position.index}/{position.total}
              </span>
            ) : null}
            <SearchHighlight text={card.title} query={searchQuery} />
          </span>

          {preview ? (
            <span className="project-list-row__preview" title={preview}>
              <SearchHighlight text={preview} query={searchQuery} />
            </span>
          ) : null}

          <span className="project-list-row__foot">
            <span className="project-list-row__people">
              <span className="project-list-row__person">
                <span className="project-list-row__person-label">작성</span>
                <span className="project-list-row__person-value">{author}</span>
              </span>
              {assignee ? (
                <span className="project-list-row__person">
                  <span className="project-list-row__person-label">담당</span>
                  <span className="project-list-row__person-value">{assignee}</span>
                </span>
              ) : null}
            </span>
            {updatedAt.label ? (
              <time className="project-list-row__updated" dateTime={updatedAt.iso} title={updatedAt.title}>
                {updatedAt.label}
              </time>
            ) : null}
          </span>
        </button>
        <HandoverCardCommentSection
          card={card}
          staffName={staffName}
          disabled={commentDisabled}
          onAddComment={onAddComment}
          onOpenComments={onOpenComments}
        />
      </div>
      {!bulkMode ? (
        <div className="project-list-row__actions">
          {isUnacked ? (
            <button
              type="button"
              className="project-list-row__ack"
              onClick={(event) => {
                event.stopPropagation();
                onAcknowledge();
              }}
            >
              확인
            </button>
          ) : null}
          {canComplete ? (
            <button
              type="button"
              className="project-list-row__done project-list-row__done--primary"
              onClick={async (event) => {
                event.stopPropagation();
                const ok = await confirm({
                  title: '완료 처리',
                  message: '이 카드를 완료 처리할까요?',
                  detail: card.title,
                  confirmLabel: '완료',
                  tone: 'warning',
                });
                if (ok) onMarkDone();
              }}
            >
              완료
            </button>
          ) : null}
          {canHold ? (
            <button
              type="button"
              className="project-list-row__hold project-list-row__hold--outline"
              onClick={async (event) => {
                event.stopPropagation();
                const ok = await confirm({
                  title: '보류 처리',
                  message: '이 카드를 보류함으로 옮길까요?',
                  detail: card.title,
                  confirmLabel: '보류',
                  tone: 'warning',
                });
                if (ok) onHold();
              }}
            >
              보류
            </button>
          ) : null}
          {canResume ? (
            <button
              type="button"
              className="project-list-row__resume"
              onClick={(event) => {
                event.stopPropagation();
                onResume();
              }}
            >
              재개
            </button>
          ) : null}
          {needsFirstResponse ? (
            <button
              type="button"
              className="project-list-row__first-response"
              onClick={(event) => {
                event.stopPropagation();
                onRecordFirstResponse?.();
              }}
            >
              첫 응대
            </button>
          ) : null}
          {canSnooze ? (
            snoozed ? (
              <button
                type="button"
                className="project-list-row__snooze project-list-row__snooze--active"
                onClick={(event) => {
                  event.stopPropagation();
                  onUnsnooze?.();
                }}
              >
                알림 켬
              </button>
            ) : (
              <button
                type="button"
                className="project-list-row__snooze"
                onClick={(event) => {
                  event.stopPropagation();
                  onSnooze?.();
                }}
              >
                2h 알림 끔
              </button>
            )
          ) : null}
          {canAssign && staffNames.length ? (
            <select
              className="project-list-row__assign"
              aria-label="담당 변경"
              value={card.assignee_name || ''}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.stopPropagation();
                onAssignChange(event.target.value);
              }}
            >
              <option value="">담당 없음</option>
              {staffNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
