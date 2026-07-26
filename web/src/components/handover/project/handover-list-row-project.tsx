'use client';

import { useState } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatSnoozeUntil,
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
  const needsFirstResponse = needsComplaintFirstResponse(card);
  const activeCommentCount = countActiveCardComments(card);
  const hasComments = hasActiveCardComments(card);
  const nextAction = card.next_action?.trim() || '';
  const details = card.details?.trim() || '';
  const resolution = card.resolution?.trim() || '';
  const hasDetails = Boolean(nextAction || details || resolution);
  const [expanded, setExpanded] = useState(needsMyAck);
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
  const canExpand = hasDetails || hasComments || Boolean(remedySummary) || (isUrgent && staffNames.length > 0);

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

  const metaBits = [
    assignee ? `담당 ${assignee}` : `작성 ${author}`,
    hasComments ? `댓글 ${activeCommentCount}` : null,
  ].filter(Boolean);

  return (
    <article
      id={`handover-card-${card.id}`}
      className={[
        'project-list-row',
        'project-list-row--ticket',
        expanded ? 'is-expanded' : 'is-compact',
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
          <span className={`project-list-row__stub-status project-list-row__stub-status--${statusClass}`}>
            {status}
          </span>
          <span className="project-list-row__stub-room" title={card.room ? `객실 ${card.room}` : '객실 미지정'}>
            {card.room ? <SearchHighlight text={card.room} query={searchQuery} /> : '—'}
          </span>
          {position ? (
            <span className="project-list-row__stub-pos" aria-label={`${position.index}번째, 남은 ${position.total}건`}>
              {position.index}/{position.total}
            </span>
          ) : null}
        </button>

        <div className="project-list-row__perforation" aria-hidden>
          <span />
        </div>

        <div className="project-list-row__pass" onClick={onOpen}>
          <div className="project-list-row__pass-top">
            <div className="project-list-row__pass-heading">
              <span className="project-list-row__title" title={card.title}>
                <SearchHighlight text={card.title} query={searchQuery} />
              </span>
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

          <div className="project-list-row__pass-meta">
            {metaBits.map((bit, index) => (
              <span key={`${bit}-${index}`}>
                {index > 0 ? <span className="project-list-row__pass-dot" aria-hidden>·</span> : null}
                {bit}
              </span>
            ))}
          </div>

          {needsMyAck ? (
            <div className="project-list-row__pass-ack" onClick={(event) => event.stopPropagation()}>
              <CardAckUrgentCallout staffName={staffName} onAcknowledge={() => onAcknowledge()} />
            </div>
          ) : null}

          {canExpand ? (
            <button
              type="button"
              className={[
                'project-list-row__expand-toggle',
                hasComments ? 'has-comments' : '',
                expanded ? 'is-expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-expanded={expanded}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((prev) => !prev);
              }}
            >
              {expanded
                ? '접기'
                : hasComments
                  ? `상세·댓글 ${activeCommentCount}`
                  : '상세 보기'}
            </button>
          ) : null}
        </div>

        {!bulkMode ? (
          <div className="project-list-row__gate">
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
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="project-list-row__details">
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
            collapsible={false}
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

          <HandoverCardCommentSection
            card={card}
            staffName={staffName}
            disabled={commentDisabled}
            onAddComment={onAddComment}
            onOpenComments={onOpenComments}
            showAll
          />
        </div>
      ) : null}
    </article>
  );
}
