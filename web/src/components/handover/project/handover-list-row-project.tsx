'use client';

import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatRelativeTime,
  formatSnoozeUntil,
  stripShiftLabel,
  isArchivedCard,
  isCardDueActive,
  isCardSnoozed,
  isUnackedUrgentCardForStaff,
  isUrgentPriorityCard,
  needsComplaintFirstResponse,
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
  searchQuery?: string;
  staffNames: string[];
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
  onOpenComments?: () => void;
  onAddComment?: (content: string) => Promise<void>;
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
  onRestore?: () => void;
};

export function HandoverListRowProject({
  card,
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
  onRestore,
}: HandoverListRowProjectProps) {
  const isUrgent = isUrgentPriorityCard(card);
  const archived = isArchivedCard(card);
  const needsMyAck = !archived && isUnackedUrgentCardForStaff(card, staffName);
  const teamAckPending = isTeamAckPending(card, staffNames);
  const snoozed = isCardSnoozed(card);
  const needsFirstResponse = needsComplaintFirstResponse(card);
  const hasComments = hasActiveCardComments(card);
  const nextAction = card.next_action?.trim() || '';
  const details = card.details?.trim() || '';
  const resolution = card.resolution?.trim() || '';
  const hasDetails = Boolean(nextAction || details || resolution);
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
  const author = stripShiftLabel(card.author ?? '') || '미입력';
  const assignee = card.assignee_name?.trim() || stripShiftLabel(formatAssigneeLabel(card));
  const handedOver = Boolean(assignee) && assignee !== author;
  const showAckStatus = !archived && isUrgent && staffNames.length > 0;

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

  const updated = formatRelativeTime(card.updated_at || card.created_at);

  return (
    <article
      id={`handover-card-${card.id}`}
      className={[
        'project-list-row',
        'project-list-row--ticket',
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

      <div className="project-list-row__ticket">
        <button type="button" className="project-list-row__stub" onClick={onOpen}>
          {card.handover_no ? (
            <span className="project-list-row__stub-number" title={`인수인계 #${card.handover_no}`}>
              <SearchHighlight text={`#${card.handover_no}`} query={searchQuery} />
            </span>
          ) : null}
          <span className={`project-list-row__stub-status project-list-row__stub-status--${statusClass}`}>
            {status}
          </span>
          <span className="project-list-row__stub-field">
            <span className="project-list-row__stub-label">객실</span>
            <span
              className={`project-list-row__stub-room${card.room ? '' : ' project-list-row__stub-room--none'}`}
              title={card.room ? `객실 ${card.room}` : '객실 미지정'}
            >
              {card.room ? <SearchHighlight text={card.room} query={searchQuery} /> : '미지정'}
            </span>
          </span>
          {card.category ? (
            <span className="project-list-row__stub-field">
              <span className="project-list-row__stub-label">분류</span>
              <span className="project-list-row__stub-category" title={`분류 ${card.category}`}>
                <SearchHighlight text={card.category} query={searchQuery} />
              </span>
            </span>
          ) : null}
        </button>

        <div className="project-list-row__perforation" aria-hidden>
          <span />
        </div>

        <div className="project-list-row__pass">
          <div className="project-list-row__pass-top">
            <div className="project-list-row__pass-heading">
              <button
                type="button"
                className="project-list-row__title"
                title={card.title}
                onClick={onOpen}
              >
                <SearchHighlight text={card.title} query={searchQuery} />
              </button>
              <span className="project-list-row__pass-flags">
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
                <ComplaintSlaBadge card={card} />
              </span>
            </div>
            <div className="project-list-row__byline">
              <span className="project-list-row__byline-author" title={`작성 ${author}`}>
                {author}
              </span>
              {handedOver ? (
                <>
                  <span className="project-list-row__byline-arrow" aria-hidden>
                    →
                  </span>
                  <span className="project-list-row__byline-assignee" title={`담당 ${assignee}`}>
                    {assignee}
                  </span>
                </>
              ) : null}
              {updated.label ? (
                <time
                  className="project-list-row__byline-time"
                  dateTime={updated.iso}
                  title={updated.title}
                >
                  {updated.label}
                </time>
              ) : null}
            </div>
            {!bulkMode ? (
              <div
                className="project-list-row__pass-more"
                onClick={(event) => event.stopPropagation()}
              >
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
            ) : null}
          </div>

          {needsMyAck ? (
            <div className="project-list-row__pass-ack">
              <CardAckUrgentCallout staffName={staffName} onAcknowledge={() => onAcknowledge()} />
            </div>
          ) : null}

          {remedySummary ? (
            <span className="project-list-row__preview project-list-row__preview--remedy" title={remedySummary}>
              제공: <SearchHighlight text={remedySummary} query={searchQuery} />
            </span>
          ) : null}

          {hasDetails ? (
            <HandoverCardBodyPreview
              searchQuery={searchQuery}
              nextAction={nextAction}
              details={details}
              resolution={card.column_id === 'done' || archived ? resolution : ''}
              clampLines={3}
            />
          ) : remedySummary ? null : (
            <p className="project-list-row__pass-empty">적힌 상세 내용이 없습니다.</p>
          )}

          {showAckStatus ? (
            <CardAckReadStatus
              card={card}
              activeStaffNames={staffNames}
              currentStaffName={staffName}
              variant="compact"
              hidePersonalCta={needsMyAck}
              onAcknowledge={needsMyAck ? onAcknowledge : undefined}
            />
          ) : null}

          <HandoverCardCommentSection
            card={card}
            staffName={staffName}
            disabled={commentDisabled}
            onAddComment={onAddComment}
            onOpenComments={onOpenComments}
          />
        </div>

        {!bulkMode ? (
          <div className="project-list-row__gate">
            {archived && onRestore ? (
              <button
                type="button"
                className="project-list-row__restore"
                onClick={(event) => {
                  event.stopPropagation();
                  onRestore();
                }}
              >
                복원
              </button>
            ) : needsMyAck ? null : teamAckPending ? (
              <span className="project-list-row__ack-done">내 확인 완료</span>
            ) : null}
            {canComplete && !(isUrgent && teamAckPending) ? (
              <button
                type="button"
                className="project-list-row__done project-list-row__done--primary"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkDone();
                }}
              >
                완료
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
