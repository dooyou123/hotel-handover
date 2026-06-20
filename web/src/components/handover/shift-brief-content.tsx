'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { ACTION_LABELS } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import { formatComplaintRemedies, hasComplaintRemedies } from '@/lib/handover/complaint-remedies';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import {
  cardStatusLabel,
  formatActivityDetail,
  getTodayLabel,
  type ShiftSummaryData,
} from '@/lib/handover/shift-summary';
import type { ActivityLog, Card, Notice, ShiftHandover } from '@/lib/handover/types';
import type { GuestReview } from '@/lib/reviews/types';
import type { HotelEvent } from '@/lib/events/types';
import { isPickupImminent } from '@/lib/taxi/format';
import { isTodoOverdue } from '@/lib/today/alerts';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { transportStatusLabel, type TransportBooking } from '@/lib/transport/types';
import { formatEventTimeRange, mergeWorkScheduleItems, type WorkScheduleItem } from '@/lib/work-items/merge';
import { LinkifiedText } from '@/components/ui/linkified-text';

export type AmenityBriefAlert = {
  id: number;
  name: string;
  quantity: number;
  monthlyUsage: number;
  orderBoxes: number;
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
  savingHandover: boolean;
  onAcknowledge: (cardId: string) => void;
  onFollowUp: (review: GuestReview) => void;
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
  todayLogs?: ActivityLog[];
  logsLoading?: boolean;
  onOpenShiftHistory?: () => void;
  onOpenActivityLog?: () => void;
  onExportText?: () => void;
  onExportPrint?: () => void;
  onExportImage?: () => void;
  exportingImage?: boolean;
  showFooter?: boolean;
  showPrint?: boolean;
  className?: string;
  hkDayNotes?: { previous: string; next: string } | null;
};

function BriefCardItem({
  card,
  warn,
  onAcknowledge,
  ackBusy,
  onOpenCard,
}: {
  card: Card;
  warn?: boolean;
  onAcknowledge?: () => void;
  ackBusy?: boolean;
  onOpenCard?: (card: Card) => void;
}) {
  const unacked = warn && !card.card_acknowledgments?.length;
  const remedySummary =
    card.category === '컴플레인' && hasComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      ? formatComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other)
      : '';
  const body = (
    <>
      <div className="brief-item__top">
        <span className="brief-item__status">{cardStatusLabel(card)}</span>
        {card.room ? (
          <span className="brief-item__room card-room-badge">{card.room}</span>
        ) : null}
        {unacked && onAcknowledge ? (
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
        ) : null}
      </div>
      <p className="brief-item__title">{card.title}</p>
      {remedySummary ? <p className="brief-item__sub">제공: {remedySummary}</p> : null}
      {card.next_action ? (
        <p className="brief-item__sub">
          다음: <LinkifiedText text={card.next_action} as="span" />
        </p>
      ) : null}
      {card.details ? (
        <p className="brief-item__detail">
          <LinkifiedText text={card.details} as="span" />
        </p>
      ) : null}
      <p className="brief-item__meta">
        {card.author || '—'} · {formatTime(card.updated_at || card.created_at)}
      </p>
    </>
  );

  if (onOpenCard) {
    return (
      <article className={`brief-item brief-item--clickable${warn ? ' brief-item--warn' : ''}`}>
        <button type="button" className="brief-item__open" onClick={() => onOpenCard(card)}>
          {body}
        </button>
      </article>
    );
  }

  return <article className={`brief-item${warn ? ' brief-item--warn' : ''}`}>{body}</article>;
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
        <p className="brief-item__detail brief-item__detail--pre brief-item__detail--lead">
          <LinkifiedText text={title} as="span" />
        </p>
      ) : (
        <>
          <p className="brief-item__title">{title}</p>
          {body ? (
            <p className="brief-item__detail brief-item__detail--pre">
              <LinkifiedText text={body} as="span" />
            </p>
          ) : null}
        </>
      )}
      <p className="brief-item__meta">
        {notice.author || '—'} · {formatTime(notice.updated_at || notice.created_at)}
      </p>
    </article>
  );
}

function BriefRecordsSection({
  title,
  lead,
  emptyText,
  onOpenAll,
  isEmpty,
  children,
}: {
  title: string;
  lead: string;
  emptyText: string;
  onOpenAll?: () => void;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="brief-section brief-section--records">
      <div className="brief-section__head">
        <h2>{title}</h2>
        {onOpenAll ? (
          <button type="button" className="btn btn--ghost btn--xs" onClick={onOpenAll}>
            전체 보기
          </button>
        ) : null}
      </div>
      <div className="brief-section__body">
        <p className="brief-section__lead">{lead}</p>
        {isEmpty ? (
          <p className="brief-section__empty">{emptyText}</p>
        ) : (
          <div className="brief-section__list">{children}</div>
        )}
      </div>
    </section>
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

function BriefActivityItem({ log }: { log: ActivityLog }) {
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
  const detail = formatActivityDetail(log);
  return (
    <article className="brief-item">
      <div className="brief-item__top">
        <span className="brief-item__status">{ACTION_LABELS[log.action] || log.action}</span>
      </div>
      <p className="brief-item__title">{log.summary}</p>
      <p className="brief-item__meta">
        {actor}
        {detail ? ` · ${detail}` : ''} · {formatTime(log.created_at)}
      </p>
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
  busy,
  onFollowUp,
}: {
  review: GuestReview;
  busy: boolean;
  onFollowUp: () => void;
}) {
  return (
    <article className="brief-item brief-item--warn">
      <div className="brief-item__top">
        <span className="brief-item__status">나쁜 리뷰</span>
        {review.guest_name ? <span className="brief-item__room">{review.guest_name}</span> : null}
      </div>
      <p className="brief-item__title">
        <LinkifiedText text={review.content_ko} as="span" />
      </p>
      <p className="brief-item__meta">{formatTime(review.created_at)}</p>
      <button type="button" className="btn btn--outline btn--xs" disabled={busy} onClick={onFollowUp}>
        {busy ? '…' : '인수인계 카드 만들기'}
      </button>
    </article>
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
  savingHandover,
  onAcknowledge,
  onFollowUp,
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
  todayLogs = [],
  logsLoading = false,
  onOpenShiftHistory,
  onOpenActivityLog,
  onExportText,
  onExportPrint,
  onExportImage,
  exportingImage = false,
  showFooter = true,
  showPrint = false,
  className = '',
  hkDayNotes = null,
}: ShiftBriefContentProps) {
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
    todayLogs.length > 0 ||
    Boolean(hkDayNotes);

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
        <span className={`brief-chip${summary.unackedUrgent.length ? ' brief-chip--alert' : ''}`}>
          미확인 긴급 <strong>{summary.unackedUrgent.length}</strong>
        </span>
        <span className="brief-chip">
          긴급 <strong>{summary.urgentActive.length}</strong>
        </span>
        <span className="brief-chip">
          진행중 <strong>{summary.progressActive.length}</strong>
        </span>
        <span className={`brief-chip${summary.holdActive.length ? ' brief-chip--warn' : ''}`}>
          보류 <strong>{summary.holdActive.length}</strong>
        </span>
        <span className={`brief-chip${summary.staleActive.length ? ' brief-chip--warn' : ''}`}>
          오래됨 <strong>{summary.staleActive.length}</strong>
        </span>
        <span className={`brief-chip${summary.longHoldActive.length ? ' brief-chip--warn' : ''}`}>
          보류 오래됨 <strong>{summary.longHoldActive.length}</strong>
        </span>
        <span className={`brief-chip${checklist.incomplete ? ' brief-chip--warn' : ''}`}>
          체크리스트 미완료 <strong>{checklist.incomplete}</strong>
        </span>
        <span className={`brief-chip${pendingNegativeReviews.length ? ' brief-chip--warn' : ''}`}>
          후속 리뷰 <strong>{pendingNegativeReviews.length}</strong>
        </span>
        <span className={`brief-chip${amenityAlerts.length ? ' brief-chip--warn' : ''}`}>
          어메니티 부족 <strong>{amenityAlerts.length}</strong>
        </span>
        <span className={`brief-chip${todayWorkItems.length ? ' brief-chip--warn' : ''}`}>
          업무 일정 <strong>{todayWorkItems.length}</strong>
        </span>
        <span className={`brief-chip${pendingTaxi.length ? ' brief-chip--warn' : ''}`}>
          택시 <strong>{pendingTaxi.length}</strong>
        </span>
      </div>

      {isLoading || logsLoading || shiftLogsLoading || taxiLoading ? (
        <p className="empty-state">인계 내용을 불러오는 중…</p>
      ) : (
        <div className="shift-brief__sections">
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
                    ackBusy={ackBusyId === card.id}
                    onAcknowledge={() => onAcknowledge(card.id)}
                    onOpenCard={onOpenCard}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {summary.urgentActive.length ? (
            <section className="brief-section">
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

          {summary.holdActive.length ? (
            <section className="brief-section brief-section--warn">
              <h2>보류 — 대기 중</h2>
              <p className="brief-section__lead">아직 끝나지 않았지만 지금은 멈춰 둔 업무입니다.</p>
              <div className="brief-section__list">
                {summary.holdActive.map((card) => (
                  <BriefCardItem key={card.id} card={card} onOpenCard={onOpenCard} />
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

          {summary.pinnedAnnouncements.length ? (
            <section className="brief-section">
              <h2>고정 공지</h2>
              <div className="brief-section__list">
                {summary.pinnedAnnouncements.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </div>
            </section>
          ) : null}

          {summary.changes.length ? (
            <section className="brief-section">
              <h2>업무 변경</h2>
              <div className="brief-section__list">
                {summary.changes.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </div>
            </section>
          ) : null}

          {pendingNegativeReviews.length ? (
            <section className="brief-section brief-section--warn">
              <h2>후속 필요 리뷰</h2>
              <div className="brief-section__list">
                {pendingNegativeReviews.map((review) => (
                  <BriefReviewItem
                    key={review.id}
                    review={review}
                    busy={followUpBusyId === review.id}
                    onFollowUp={() => onFollowUp(review)}
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
                      재고 {item.quantity.toLocaleString()}개 · 30일 사용{' '}
                      {item.monthlyUsage.toLocaleString()}개
                      {item.orderBoxes > 0 ? ` · 발주 권장 ${item.orderBoxes}박스` : ''}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <BriefRecordsSection
            title="오늘 교대 기록"
            lead="교대 시작·종료 시 저장된 인수·마감 스냅샷입니다."
            emptyText="오늘 교대 기록이 없습니다. 교대 시작·종료 시 자동 저장됩니다."
            onOpenAll={onOpenShiftHistory}
            isEmpty={!todayShiftLogs.length}
          >
            {todayShiftLogs.map((record) => (
              <BriefShiftHandoverItem key={record.id} record={record} />
            ))}
          </BriefRecordsSection>

          <BriefRecordsSection
            title="오늘 변경 기록"
            lead="카드·공지 추가·수정·이동 등 업무 변경 내역입니다."
            emptyText="오늘 변경 기록이 없습니다."
            onOpenAll={onOpenActivityLog}
            isEmpty={!todayLogs.length}
          >
            {todayLogs.map((log) => (
              <BriefActivityItem key={log.id} log={log} />
            ))}
          </BriefRecordsSection>

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
    </div>
  );
}
