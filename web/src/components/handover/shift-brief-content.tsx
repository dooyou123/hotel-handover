'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { formatTime } from '@/lib/handover/card-utils';
import { hasStaffAckedCard } from '@/lib/handover/card-acks';
import { formatComplaintRemedies, hasComplaintRemedies } from '@/lib/handover/complaint-remedies';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import { cardStatusLabel, getTodayLabel, type ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, Notice, ShiftHandover } from '@/lib/handover/types';
import type { GuestReview } from '@/lib/reviews/types';
import { formatReviewGuestLabel, isReviewAnonymous } from '@/lib/reviews/identity';
import type { HotelEvent } from '@/lib/events/types';
import { isPickupImminent } from '@/lib/taxi/format';
import { isTodoOverdue } from '@/lib/today/alerts';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { transportStatusLabel, type TransportBooking } from '@/lib/transport/types';
import { formatEventTimeRange, mergeWorkScheduleItems, type WorkScheduleItem } from '@/lib/work-items/merge';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { formatAmenityQty, isBagAmenityUnit } from '@/lib/amenity/units';
import { ReviewActionCompleteModal } from '@/components/reviews/review-action-complete-modal';
import { briefChipJumpTarget, type BriefListJump } from '@/lib/handover/brief-navigate';

export type AmenityBriefAlert = {
  id: number;
  name: string;
  quantity: number;
  monthlyUsage: number;
  orderBoxes: number;
  orderQty: number;
  unit: string;
};

export type ShiftBriefContentProps = {
  summary: ShiftSummaryData;
  authorLabel: string;
  sessionReady: boolean;
  checklist: { total: number; incomplete: number };
  pendingNegativeReviews: GuestReview[];
  amenityAlerts: AmenityBriefAlert[];
  isLoading?: boolean;
  ackBusyId: string | null;
  followUpBusyId: string | null;
  reviewActionBusyId?: string | null;
  savingHandover: boolean;
  briefMemoSaving?: boolean;
  onAcknowledge: (cardId: string) => void;
  currentStaffName?: string;
  onFollowUp: (review: GuestReview) => void;
  onCompleteReviewAction?: (review: GuestReview, note: string) => Promise<void>;
  onSaveBriefMemo?: (text: string) => Promise<void>;
  onLogShiftStart: () => void;
  onOpenCard?: (card: Card) => void;
  todayTodos?: Todo[];
  todayEvents?: HotelEvent[];
  pendingTaxi?: TransportBooking[];
  taxiLoading?: boolean;
  onOpenTodo?: (todo: Todo) => void;
  onOpenEvent?: (event: HotelEvent) => void;
  todayShiftLogs?: ShiftHandover[];
  shiftLogsLoading?: boolean;
  onOpenShiftHistory?: () => void;
  onExportText?: () => void;
  onExportPrint?: () => void;
  onExportImage?: () => void;
  onNavigateToList?: (target: BriefListJump) => void;
  exportingImage?: boolean;
  showFooter?: boolean;
  showPrint?: boolean;
  className?: string;
  hkDayNotes?: { previous: string; next: string } | null;
};

function BriefExpandableBody({
  children,
  preview,
}: {
  children: ReactNode;
  preview?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!children) return preview ? <>{preview}</> : null;

  return (
    <div className={`brief-item__fold${open ? ' is-open' : ''}`}>
      {open ? <div className="brief-item__fold-body">{children}</div> : preview}
      <button
        type="button"
        className="brief-item__fold-toggle"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {open ? '접기' : '더 보기'}
      </button>
    </div>
  );
}

function BriefCardItem({
  card,
  warn,
  currentStaffName = '',
  onAcknowledge,
  ackBusy,
  onOpenCard,
}: {
  card: Card;
  warn?: boolean;
  currentStaffName?: string;
  onAcknowledge?: () => void;
  ackBusy?: boolean;
  onOpenCard?: (card: Card) => void;
}) {
  const unacked =
    warn &&
    (currentStaffName.trim()
      ? !hasStaffAckedCard(card, currentStaffName)
      : card.card_acknowledgments.length === 0);
  const remedySummary =
    card.category === '컴플레인' && hasComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      ? formatComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      : '';
  const hasExtra = Boolean(remedySummary || card.details);

  const ackButton =
    unacked && onAcknowledge ? (
      <button
        type="button"
        className="btn btn--danger btn--xs"
        disabled={ackBusy}
        onClick={(event) => {
          event.stopPropagation();
          onAcknowledge();
        }}
      >
        {ackBusy ? '…' : '긴급 확인'}
      </button>
    ) : null;

  const topBar = (
    <div className={`brief-item__top${onOpenCard ? ' brief-item__top--clickable' : ''}`}>
      <span className="brief-item__status">{cardStatusLabel(card)}</span>
      {card.room ? <span className="brief-item__room card-room-badge">{card.room}</span> : null}
      {ackButton}
    </div>
  );

  const content = (
    <>
      <p className="brief-item__title">{card.title}</p>
      <p className="brief-item__meta">
        {card.author || '—'} · {formatTime(card.updated_at || card.created_at)}
      </p>
      {card.next_action ? (
        <p className="brief-item__sub brief-item__sub--clamp">
          다음: <LinkifiedText text={card.next_action} as="span" />
        </p>
      ) : null}
      {remedySummary || card.details ? (
        <BriefExpandableBody>
          {remedySummary ? <p className="brief-item__sub">제공: {remedySummary}</p> : null}
          {card.details ? (
            <p className="brief-item__detail">
              <LinkifiedText text={card.details} as="span" />
            </p>
          ) : null}
        </BriefExpandableBody>
      ) : null}
    </>
  );

  if (onOpenCard) {
    return (
      <article className={`brief-item brief-item--clickable${warn ? ' brief-item--warn' : ''}`}>
        {topBar}
        <div
          role="button"
          tabIndex={0}
          className="brief-item__open brief-item__open--stacked"
          onClick={() => onOpenCard(card)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenCard(card);
            }
          }}
        >
          {content}
        </div>
      </article>
    );
  }

  return (
    <article className={`brief-item${warn ? ' brief-item--warn' : ''}`}>
      {topBar}
      {content}
    </article>
  );
}

function BriefNoticeItem({ notice }: { notice: Notice }) {
  const lines = notice.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] ?? '(내용 없음)';
  const body = lines.slice(1).join('\n');
  const singleBlock = lines.length <= 1;

  return (
    <article className="brief-item brief-item--notice">
      <div className="brief-item__top">
        <span className="brief-item__status">{noticeTypeShort(notice.type)}</span>
      </div>
      {singleBlock ? (
        title.length > 72 ? (
          <BriefExpandableBody
            preview={
              <p className="brief-item__title brief-item__title--clamp">
                <LinkifiedText text={title} as="span" />
              </p>
            }
          >
            <p className="brief-item__detail brief-item__detail--pre">
              <LinkifiedText text={title} as="span" />
            </p>
          </BriefExpandableBody>
        ) : (
          <p className="brief-item__detail brief-item__detail--pre brief-item__detail--lead">
            <LinkifiedText text={title} as="span" />
          </p>
        )
      ) : (
        <>
          <p className="brief-item__title">{title}</p>
          {body ? (
            <BriefExpandableBody>
              <p className="brief-item__detail brief-item__detail--pre">
                <LinkifiedText text={body} as="span" />
              </p>
            </BriefExpandableBody>
          ) : null}
        </>
      )}
      <p className="brief-item__meta">
        {notice.author || '—'} · {formatTime(notice.updated_at || notice.created_at)}
      </p>
    </article>
  );
}

function BriefFoldSection({
  title,
  count,
  lead,
  preview,
  tone,
  children,
  defaultOpen = false,
  onJump,
}: {
  title: string;
  count: number;
  lead?: string;
  preview?: string;
  tone?: 'alert' | 'warn';
  children: ReactNode;
  defaultOpen?: boolean;
  onJump?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={`brief-section brief-section--fold${tone ? ` brief-section--${tone}` : ''}`}
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="brief-section__summary">
        <span className="brief-section__summary-main">
          <span className="brief-section__summary-title">{title}</span>
          {preview ? <span className="brief-section__summary-preview">{preview}</span> : null}
        </span>
        <span className="brief-section__summary-count">{count}</span>
      </summary>
      {lead ? <p className="brief-section__lead">{lead}</p> : null}
      {onJump ? (
        <div className="brief-section__fold-actions">
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={(event) => {
              event.preventDefault();
              onJump();
            }}
          >
            목록에서 보기
          </button>
        </div>
      ) : null}
      <div className="brief-section__list">{children}</div>
    </details>
  );
}

function handoverTypeLabel(type: ShiftHandover['handover_type']): string {
  return type === 'start' ? '교대 시작' : '교대 종료';
}

function BriefShiftHandoverItem({ record }: { record: ShiftHandover }) {
  const isStart = record.handover_type === 'start';
  return (
    <article className={`brief-item${isStart ? '' : ' brief-item--muted'}`}>
      <div className="brief-item__top">
        <span className="brief-item__status">{handoverTypeLabel(record.handover_type)}</span>
        <span className="brief-item__room">{record.shift}</span>
      </div>
      <p className="brief-item__title">
        {record.staff_name || '—'} · 미확인 긴급 {record.unacked_urgent} · 긴급 {record.urgent_count} · 진행{' '}
        {record.progress_count}
      </p>
      {record.checklist_incomplete > 0 ? (
        <p className="brief-item__sub">체크리스트 미완료 {record.checklist_incomplete}건</p>
      ) : null}
      {record.notes.trim() ? (
        <p className="brief-item__detail">
          <LinkifiedText text={record.notes.trim()} as="span" />
        </p>
      ) : null}
      <p className="brief-item__meta">{formatTime(record.handover_at)}</p>
    </article>
  );
}

function formatTodoDue(todo: Todo): string {
  if (!todo.due_date) return '마감 없음';
  const date = new Date(`${todo.due_date}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function BriefTodoItem({ todo, onOpenTodo }: { todo: Todo; onOpenTodo?: (todo: Todo) => void }) {
  const overdue = isTodoOverdue(todo);
  const body = (
    <>
      <div className="brief-item__top">
        <span className="brief-item__status">{TODO_PRIORITY_LABELS[todo.priority]}</span>
        {overdue ? <span className="brief-item__room">마감 지남</span> : null}
      </div>
      <p className="brief-item__title">{todo.title}</p>
      {todo.description ? (
        <p className="brief-item__detail">
          <LinkifiedText text={todo.description} as="span" />
        </p>
      ) : null}
      <p className="brief-item__meta">
        {formatTodoDue(todo)}
        {todo.linked_card_id ? ' · 인수인계 연동' : ''}
        {todo.assignee_name ? ` · ${todo.assignee_name}` : ''}
      </p>
    </>
  );

  if (onOpenTodo) {
    return (
      <article className={`brief-item brief-item--clickable${overdue ? ' brief-item--warn' : ''}`}>
        <button type="button" className="brief-item__open" onClick={() => onOpenTodo(todo)}>
          {body}
        </button>
      </article>
    );
  }

  return (
    <article className={`brief-item${overdue ? ' brief-item--warn' : ''}`}>
      <Link href={buildWorkHubHref('schedule')} className="brief-item__open">
        {body}
      </Link>
    </article>
  );
}

function BriefTaxiItem({ booking }: { booking: TransportBooking }) {
  const guest = booking.booker_name || booking.guest_name;
  const imminent = isPickupImminent(booking);
  return (
    <article className={`brief-item brief-item--clickable${imminent ? ' brief-item--warn' : ''}`}>
      <Link href="/transport" className="brief-item__open">
        <div className="brief-item__top">
          <span className="brief-item__status">{transportStatusLabel(booking.status)}</span>
          <span className="brief-item__room">{booking.pickup_time.slice(0, 5)}</span>
        </div>
        <p className="brief-item__title">
          {booking.destination || '목적지 미입력'}
          {booking.vehicle_type === '점보' ? ' · 점보' : ''}
          {booking.vehicle_number ? ` · ${booking.vehicle_number}` : ''}
        </p>
        <p className="brief-item__meta">
          {booking.room_number ? `${booking.room_number}호` : '객실 미입력'}
          {guest ? ` · ${guest}` : ''}
          {booking.passengers > 0 ? ` · ${booking.passengers}명` : ''}
        </p>
      </Link>
    </article>
  );
}

function BriefEventItem({ event, onOpenEvent }: { event: HotelEvent; onOpenEvent?: (event: HotelEvent) => void }) {
  const body = (
    <>
      <div className="brief-item__top">
        <span className="brief-item__status">일정 · {event.category}</span>
        <span className="brief-item__room">{formatEventTimeRange(event.start_time, event.end_time)}</span>
      </div>
      <p className="brief-item__title">{event.title}</p>
      {event.description ? (
        <p className="brief-item__detail">
          <LinkifiedText text={event.description} as="span" />
        </p>
      ) : null}
    </>
  );

  if (onOpenEvent) {
    return (
      <article className="brief-item brief-item--clickable">
        <button type="button" className="brief-item__open" onClick={() => onOpenEvent(event)}>
          {body}
        </button>
      </article>
    );
  }

  return (
    <article className="brief-item">
      <Link href={buildWorkHubHref('schedule')} className="brief-item__open">
        {body}
      </Link>
    </article>
  );
}

function BriefWorkScheduleItem({
  item,
  onOpenTodo,
  onOpenEvent,
}: {
  item: WorkScheduleItem;
  onOpenTodo?: (todo: Todo) => void;
  onOpenEvent?: (event: HotelEvent) => void;
}) {
  if (item.kind === 'event') {
    return <BriefEventItem event={item.event} onOpenEvent={onOpenEvent} />;
  }
  return <BriefTodoItem todo={item.todo} onOpenTodo={onOpenTodo} />;
}

function BriefReviewItem({
  review,
  followUpBusy,
  actionBusy,
  onFollowUp,
  onCompleteAction,
  canCompleteAction = true,
}: {
  review: GuestReview;
  followUpBusy: boolean;
  actionBusy: boolean;
  onFollowUp: () => void;
  onCompleteAction: () => void;
  canCompleteAction?: boolean;
}) {
  return (
    <article className="brief-item brief-item--warn">
      <div className="brief-item__top">
        <span className="brief-item__status">나쁜 리뷰</span>
        {review.guest_name || isReviewAnonymous(review) ? (
          <span className="brief-item__room">{formatReviewGuestLabel(review)}</span>
        ) : null}
      </div>
      <BriefExpandableBody
        preview={<p className="brief-item__title brief-item__title--clamp">{review.content_ko}</p>}
      >
        <p className="brief-item__title">
          <LinkifiedText text={review.content_ko} as="span" />
        </p>
      </BriefExpandableBody>
      <p className="brief-item__meta">{formatTime(review.created_at)}</p>
      <div className="brief-item__actions">
        <button type="button" className="btn btn--outline btn--xs" disabled={followUpBusy} onClick={onFollowUp}>
          {followUpBusy ? '…' : '인수인계 카드 만들기'}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--xs"
          disabled={actionBusy || !canCompleteAction}
          onClick={onCompleteAction}
        >
          {actionBusy ? '…' : '조치 완료'}
        </button>
      </div>
    </article>
  );
}

function BriefMemoSection({
  sessionReady,
  saving,
  onSave,
}: {
  sessionReady: boolean;
  saving: boolean;
  onSave: (text: string) => Promise<void>;
}) {
  const [memo, setMemo] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = memo.trim();
    if (!text || !sessionReady || saving) return;
    await onSave(text);
    setMemo('');
  }

  return (
    <section className="brief-section brief-section--memo">
      <h2>교대 메모</h2>
      <p className="brief-section__lead">인계하면서 떠오른 할 일을 적어 두세요. 저장하면 오늘 할일에 추가됩니다.</p>
      <form className="brief-memo-form" onSubmit={(e) => void handleSubmit(e)}>
        <textarea
          className="brief-memo-form__input"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="예) 1207호 추가 수건 요청 확인 · VIP 도착 전 객실 점검"
          aria-label="교대 메모"
          disabled={!sessionReady || saving}
        />
        <div className="brief-memo-form__actions">
          <button
            type="submit"
            className="btn btn--primary btn--small"
            disabled={!memo.trim() || !sessionReady || saving}
          >
            {saving ? '저장 중…' : '오늘 할일로 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ShiftBriefContent({
  summary,
  authorLabel,
  sessionReady,
  checklist,
  pendingNegativeReviews,
  amenityAlerts,
  isLoading = false,
  ackBusyId,
  followUpBusyId,
  reviewActionBusyId = null,
  savingHandover,
  briefMemoSaving = false,
  onAcknowledge,
  currentStaffName = '',
  onFollowUp,
  onCompleteReviewAction,
  onSaveBriefMemo,
  onLogShiftStart,
  onOpenCard,
  todayTodos = [],
  todayEvents = [],
  pendingTaxi = [],
  taxiLoading = false,
  onOpenTodo,
  onOpenEvent,
  todayShiftLogs = [],
  shiftLogsLoading = false,
  onOpenShiftHistory,
  onExportText,
  onExportPrint,
  onExportImage,
  onNavigateToList,
  exportingImage = false,
  showFooter = true,
  showPrint = false,
  className = '',
  hkDayNotes = null,
}: ShiftBriefContentProps) {
  const [actionReview, setActionReview] = useState<GuestReview | null>(null);
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayWorkItems = mergeWorkScheduleItems({
    todos: todayTodos,
    events: todayEvents,
    month: todayMonth,
    includeUndatedOpenTodos: true,
  });
  const hasExport = Boolean(onExportText || onExportPrint || onExportImage);
  const hasContent =
    summary.unackedUrgent.length > 0 ||
    summary.urgentActive.length > 0 ||
    summary.progressActive.length > 0 ||
    summary.holdActive.length > 0 ||
    summary.staleActive.length > 0 ||
    summary.longHoldActive.length > 0 ||
    summary.pinnedAnnouncements.length > 0 ||
    summary.changes.length > 0 ||
    pendingNegativeReviews.length > 0 ||
    amenityAlerts.length > 0 ||
    todayWorkItems.length > 0 ||
    pendingTaxi.length > 0 ||
    todayShiftLogs.length > 0 ||
    Boolean(hkDayNotes);
  const hasPriorityContent =
    summary.unackedUrgent.length > 0 ||
    summary.urgentActive.length > 0 ||
    summary.progressActive.length > 0 ||
    pendingTaxi.length > 0 ||
    todayWorkItems.length > 0 ||
    pendingNegativeReviews.length > 0 ||
    amenityAlerts.length > 0 ||
    Boolean(hkDayNotes);
  const hasReferenceContent =
    summary.holdActive.length > 0 ||
    summary.pinnedAnnouncements.length > 0 ||
    summary.changes.length > 0 ||
    todayShiftLogs.length > 0 ||
    Boolean(onSaveBriefMemo);

  return (
    <div className={`shift-brief ${className}`.trim()}>
      <header className="shift-brief__header">
        <div>
          <h1>교대 인계 요약</h1>
          <p>
            {getTodayLabel()} · {authorLabel || '근무자 미선택'} ·{' '}
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {hasExport || showPrint ? (
          <div className="shift-brief__actions">
            {onExportText ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={onExportText}>
                텍스트
              </button>
            ) : null}
            {onExportPrint ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={onExportPrint}>
                인쇄
              </button>
            ) : null}
            {onExportImage ? (
              <button
                type="button"
                className="btn btn--outline btn--small"
                disabled={exportingImage}
                onClick={onExportImage}
              >
                {exportingImage ? '저장 중…' : '이미지'}
              </button>
            ) : null}
            {showPrint ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
                인쇄
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {!sessionReady ? (
        <p className="shift-brief__hint">상단 「지금 근무」에서 교대 · 조 · 담당자를 선택해 주세요.</p>
      ) : null}

      <div className="shift-brief__chips">
        {[
          {
            key: 'unacked',
            label: '미확인 긴급',
            count: summary.unackedUrgent.length,
            tone: 'alert' as const,
          },
          {
            key: 'urgent',
            label: '긴급',
            count: summary.urgentActive.length,
            tone: 'alert' as const,
          },
          {
            key: 'progress',
            label: '진행중',
            count: summary.progressActive.length,
          },
          {
            key: 'hold',
            label: '보류',
            count: summary.holdActive.length,
            tone: 'warn' as const,
          },
          {
            key: 'stale',
            label: '오래됨',
            count: summary.staleActive.length,
            tone: 'warn' as const,
          },
          {
            key: 'longHold',
            label: '보류 오래됨',
            count: summary.longHoldActive.length,
            tone: 'warn' as const,
          },
          {
            key: 'checklist',
            label: '체크리스트 미완료',
            count: checklist.incomplete,
            tone: 'warn' as const,
          },
          {
            key: 'reviews',
            label: '후속 리뷰',
            count: pendingNegativeReviews.length,
            tone: 'warn' as const,
          },
          {
            key: 'amenity',
            label: '어메니티 부족',
            count: amenityAlerts.length,
            tone: 'warn' as const,
          },
          {
            key: 'work',
            label: '업무 일정',
            count: todayWorkItems.length,
          },
          {
            key: 'taxi',
            label: '택시',
            count: pendingTaxi.length,
            tone: 'warn' as const,
          },
        ]
          .filter((chip) => chip.count > 0)
          .map((chip) => {
            const jump = onNavigateToList ? briefChipJumpTarget(chip.key) : null;
            const className = `brief-chip${chip.tone === 'alert' ? ' brief-chip--alert' : ''}${
              chip.tone === 'warn' ? ' brief-chip--warn' : ''
            }${jump ? ' brief-chip--action' : ''}`;
            const label = (
              <>
                {chip.label} <strong>{chip.count}</strong>
              </>
            );
            if (jump && onNavigateToList) {
              return (
                <button
                  key={chip.key}
                  type="button"
                  className={className}
                  title="목록·관련 화면으로 이동"
                  onClick={() => onNavigateToList(jump)}
                >
                  {label}
                </button>
              );
            }
            return (
              <span key={chip.key} className={className}>
                {label}
              </span>
            );
          })}
      </div>

      {isLoading || shiftLogsLoading || taxiLoading ? (
        <p className="empty-state">인계 내용을 불러오는 중…</p>
      ) : (
        <div className="shift-brief__sections">
          {hasPriorityContent ? (
          <div className="shift-brief__priority">
            <p className="shift-brief__zone-label">지금 확인할 항목</p>

            {summary.unackedUrgent.length ? (
              <section className="brief-section brief-section--alert">
                <h2>미확인 긴급 — 지금 확인</h2>
                <p className="brief-section__lead">카드에서 ✓ 긴급 확인을 눌러 다음 교대로 넘깁니다.</p>
                <div className="brief-section__list">
                  {summary.unackedUrgent.map((card) => (
                    <BriefCardItem
                      key={card.id}
                      card={card}
                      warn
                      currentStaffName={currentStaffName}
                      ackBusy={ackBusyId === card.id}
                      onAcknowledge={() => onAcknowledge(card.id)}
                      onOpenCard={onOpenCard}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {summary.urgentActive.length ? (
              <section className="brief-section brief-section--alert">
                <h2>긴급 처리 중</h2>
                <div className="brief-section__list">
                  {summary.urgentActive.map((card) => (
                    <BriefCardItem key={card.id} card={card} onOpenCard={onOpenCard} />
                  ))}
                </div>
              </section>
            ) : null}

            {summary.progressActive.length ? (
              <section className="brief-section">
                <h2>오늘 진행 업무</h2>
                <div className="brief-section__list">
                  {summary.progressActive.map((card) => (
                    <BriefCardItem key={card.id} card={card} onOpenCard={onOpenCard} />
                  ))}
                </div>
              </section>
            ) : null}

            {pendingTaxi.length ? (
              <section className="brief-section">
                <h2>오늘 택시 — 미완료</h2>
                <p className="brief-section__lead">오늘 픽업 예정이며 아직 완료 처리되지 않은 건입니다.</p>
                <div className="brief-section__list">
                  {pendingTaxi.map((booking) => (
                    <BriefTaxiItem key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            ) : null}

            {todayWorkItems.length ? (
              <section className="brief-section">
                <h2>오늘 업무 일정</h2>
                <p className="brief-section__lead">오늘 할일·호텔 일정(교육·VIP·점검 등)입니다.</p>
                <div className="brief-section__list">
                  {todayWorkItems.map((item) => (
                    <BriefWorkScheduleItem
                      key={item.kind === 'todo' ? `todo-${item.todo.id}` : `event-${item.event.id}`}
                      item={item}
                      onOpenTodo={onOpenTodo}
                      onOpenEvent={onOpenEvent}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {pendingNegativeReviews.length ? (
              <section className="brief-section brief-section--warn">
                <h2>후속 필요 리뷰</h2>
                <p className="brief-section__lead">조치가 끝났으면 「조치 완료」를 눌러 인계 목록에서 숨깁니다.</p>
                <div className="brief-section__list">
                  {pendingNegativeReviews.map((review) => (
                    <BriefReviewItem
                      key={review.id}
                      review={review}
                      followUpBusy={followUpBusyId === review.id}
                      actionBusy={reviewActionBusyId === review.id}
                      onFollowUp={() => onFollowUp(review)}
                      onCompleteAction={() => setActionReview(review)}
                      canCompleteAction={Boolean(onCompleteReviewAction)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {amenityAlerts.length ? (
              <section className="brief-section">
                <h2>어메니티 부족·품절</h2>
                <div className="brief-section__list">
                  {amenityAlerts.map((item) => (
                    <article key={item.id} className="brief-item">
                      <p className="brief-item__title">{item.name}</p>
                      <p className="brief-item__sub">
                        재고 {formatAmenityQty(item.quantity, item.unit)} · 30일 사용{' '}
                        {formatAmenityQty(item.monthlyUsage, item.unit)}
                        {item.orderBoxes > 0
                          ? ` · 발주 권장 ${
                              isBagAmenityUnit(item.unit)
                                ? formatAmenityQty(item.orderQty, item.unit)
                                : `${item.orderBoxes}박스`
                            }`
                          : ''}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {hkDayNotes ? (
              <section className="brief-section">
                <h2>하우스키핑 전달 메모</h2>
                <div className="brief-section__list">
                  {hkDayNotes.previous ? (
                    <article className="brief-item">
                      <p className="brief-item__meta">어제 미완료·특이</p>
                      <p className="brief-item__title">{hkDayNotes.previous}</p>
                    </article>
                  ) : null}
                  {hkDayNotes.next ? (
                    <article className="brief-item">
                      <p className="brief-item__meta">내일 단체·행사</p>
                      <p className="brief-item__title">{hkDayNotes.next}</p>
                    </article>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
          ) : null}

          {hasReferenceContent ? (
          <div className="shift-brief__reference">
            <p className="shift-brief__zone-label">참고 · 이어서 볼 항목</p>

            {summary.holdActive.length ? (
              <BriefFoldSection
                title="보류 — 대기 중"
                count={summary.holdActive.length}
                preview={[
                  ...summary.longHoldActive,
                  ...summary.holdActive.filter(
                    (card) => !summary.longHoldActive.some((longHold) => longHold.id === card.id),
                  ),
                ]
                  .slice(0, 3)
                  .map((card) => card.title)
                  .join(' · ')}
                lead={
                  summary.longHoldActive.length
                    ? `아직 끝나지 않았지만 지금은 멈춰 둔 업무입니다. 그중 ${summary.longHoldActive.length}건은 24시간 이상 보류입니다.`
                    : '아직 끝나지 않았지만 지금은 멈춰 둔 업무입니다.'
                }
                tone="warn"
                onJump={
                  onNavigateToList
                    ? () =>
                        onNavigateToList(
                          summary.longHoldActive.length
                            ? { kind: 'list', statusTab: 'hold', quickFilter: 'hold-long' }
                            : { kind: 'list', statusTab: 'hold', quickFilter: 'all' },
                        )
                    : undefined
                }
              >
                {summary.holdActive.map((card) => (
                  <BriefCardItem key={card.id} card={card} onOpenCard={onOpenCard} />
                ))}
              </BriefFoldSection>
            ) : null}

            {summary.pinnedAnnouncements.length ? (
              <BriefFoldSection title="고정 공지" count={summary.pinnedAnnouncements.length}>
                {summary.pinnedAnnouncements.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </BriefFoldSection>
            ) : null}

            {summary.changes.length ? (
              <BriefFoldSection title="업무 변경" count={summary.changes.length}>
                {summary.changes.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </BriefFoldSection>
            ) : null}

            <BriefFoldSection
              title="오늘 교대 기록"
              count={todayShiftLogs.length}
              lead="교대 시작·종료 시 저장된 인수·마감 스냅샷입니다."
              defaultOpen={false}
            >
              {todayShiftLogs.length ? (
                todayShiftLogs.map((record) => (
                  <BriefShiftHandoverItem key={record.id} record={record} />
                ))
              ) : (
                <p className="brief-section__empty">
                  오늘 교대 기록이 없습니다. 교대 시작·종료 시 자동 저장됩니다.
                </p>
              )}
              {onOpenShiftHistory ? (
                <div className="brief-section__fold-actions">
                  <button type="button" className="btn btn--ghost btn--xs" onClick={onOpenShiftHistory}>
                    전체 보기
                  </button>
                </div>
              ) : null}
            </BriefFoldSection>

            {onSaveBriefMemo ? (
              <BriefMemoSection sessionReady={sessionReady} saving={briefMemoSaving} onSave={onSaveBriefMemo} />
            ) : null}
          </div>
          ) : null}

          {!hasContent ? <p className="empty-state">현재 인계할 특이 사항이 없습니다.</p> : null}
        </div>
      )}

      {showFooter ? (
        <footer className="shift-brief__footer">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!sessionReady || savingHandover}
            onClick={onLogShiftStart}
          >
            {savingHandover ? '기록 중…' : '교대 인수 기록'}
          </button>
        </footer>
      ) : null}

      {onCompleteReviewAction ? (
        <ReviewActionCompleteModal
          open={Boolean(actionReview)}
          review={actionReview}
          busy={Boolean(actionReview && reviewActionBusyId === actionReview.id)}
          onClose={() => setActionReview(null)}
          onConfirm={async (note) => {
            if (!actionReview) return;
            await onCompleteReviewAction(actionReview, note);
            setActionReview(null);
          }}
        />
      ) : null}
    </div>
  );
}
