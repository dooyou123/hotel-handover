'use client';

import type { KeyboardEvent } from 'react';
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
  isUnackedUrgentCardForStaff,
  isUrgentPriorityCard,
  needsComplaintFirstResponse,
  countActiveCardComments,
  hasActiveCardComments,
} from '@/lib/handover/card-utils';
import { isTeamAckPending } from '@/lib/handover/card-acks';
import type { Card } from '@/lib/handover/types';
import { formatComplaintRemedies, hasComplaintRemedies } from '@/lib/handover/complaint-remedies';
import { ComplaintSlaBadge } from '@/components/handover/complaint-sla-badge';
import { SearchHighlight } from '@/components/handover/search-highlight';
import { HandoverCardBodyPreview } from './handover-card-body-preview';
import { HandoverCardCommentSection } from './handover-card-comment-section';
import { HandoverListRowMoreMenu } from './handover-list-row-more-menu';
import { CardAckReadStatus } from '@/components/handover/card-ack-read-status';
import { CardAckUrgentCallout } from '@/components/handover/card-ack-urgent-callout';

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
  const needsMyAck = isUnackedUrgentCardForStaff(card, staffName);
  const teamAckPending = isTeamAckPending(card, staffNames);
  const archived = isArchivedCard(card);
  const snoozed = isCardSnoozed(card);
  const staleLevel = getStaleLevel(card);
  const holdStaleLevel = getHoldStaleLevel(card);
  const needsFirstResponse = needsComplaintFirstResponse(card);
  const activeCommentCount = countActiveCardComments(card);
  const hasComments = hasActiveCardComments(card);
  const nextAction = card.next_action?.trim() || '';
  const details = card.details?.trim() || '';
  const resolution = card.resolution?.trim() || '';
  const remedySummary =
    card.category === '컴플레인' && hasComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      ? formatComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      : '';
  const status = archived
    ? '보관'
    : card.column_id === 'done'
      ? '완료'
      : card.column_id === 'hold'
        ? '보류'
        : teamAckPending
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

  const openHandlers = {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpen();
      }
    },
  };

  const actionBar =
    !bulkMode ? (
      <div className="project-list-row__actions">
        {needsMyAck ? null : teamAckPending ? (
          <span className="project-list-row__ack-done">내 확인 완료</span>
        ) : null}
        {canComplete && !(isUrgent && teamAckPending) ? (
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
        <HandoverListRowMoreMenu
          cardTitle={card.title}
          canHold={canHold}
          canResume={canResume}
          needsFirstResponse={needsFirstResponse}
          canSnooze={canSnooze}
          snoozed={snoozed}
          canAssign={canAssign}
          staffNames={staffNames}
          assigneeName={card.assignee_name}
          onHold={onHold}
          onResume={onResume}
          onRecordFirstResponse={onRecordFirstResponse}
          onSnooze={onSnooze}
          onUnsnooze={onUnsnooze}
          onAssignChange={onAssignChange}
        />
      </div>
    ) : null;

  return (
    <article
      id={`handover-card-${card.id}`}
      className={[
        'project-list-row',
        needsMyAck || teamAckPending ? 'is-unacked' : '',
        needsMyAck ? 'is-needs-my-ack' : '',
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
        <div className="project-list-row__head">
          <div className="project-list-row__head-main" {...openHandlers}>
            <div className="project-list-row__top">
              <span className={`project-list-row__status project-list-row__status--${statusClass}`}>
                {status}
              </span>
              <span className="project-list-row__meta">
                {isUrgent ? (
                  <span className="project-list-row__badge project-list-row__badge--urgent">
                    {PRIORITY_LABELS[card.priority]}
                  </span>
                ) : null}
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
              </span>
              <ComplaintSlaBadge card={card} />
            </div>
          </div>
          {actionBar}
        </div>
        <div className="project-list-row__main" {...openHandlers}>
          <div className="project-list-row__title-row">
            <div className="project-list-row__title-wrap">
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
            </div>
            {needsMyAck ? (
              <CardAckUrgentCallout
                staffName={staffName}
                onAcknowledge={() => onAcknowledge()}
              />
            ) : null}
          </div>

          {remedySummary ? (
            <span className="project-list-row__preview project-list-row__preview--remedy" title={remedySummary}>
              제공: <SearchHighlight text={remedySummary} query={searchQuery} />
            </span>
          ) : null}

          <HandoverCardBodyPreview
            searchQuery={searchQuery}
            nextAction={nextAction}
            details={details}
            resolution={card.column_id === 'done' || archived ? resolution : ''}
            clampLines={hasComments ? 2 : undefined}
          />

          {isUrgent && staffNames.length ? (
            <CardAckReadStatus
              card={card}
              activeStaffNames={staffNames}
              currentStaffName={staffName}
              variant="compact"
              hidePersonalCta={needsMyAck}
              onAcknowledge={needsMyAck ? onAcknowledge : undefined}
            />
          ) : null}

          <span className="project-list-row__foot">
            <span className="project-list-row__foot-meta">
              <span className="project-list-row__foot-tag">{card.category}</span>
              {hasComments ? (
                <span className="project-list-row__foot-tag project-list-row__foot-tag--comments">
                  댓글 {activeCommentCount}
                </span>
              ) : null}
            </span>
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
        </div>
        <HandoverCardCommentSection
          card={card}
          staffName={staffName}
          disabled={commentDisabled}
          onAddComment={onAddComment}
          onOpenComments={onOpenComments}
        />
      </div>
    </article>
  );
}
