'use client';

import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { useEffect, useMemo, useState } from 'react';
import { getTodayLabel } from '@/lib/handover/shift-summary';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, QuickFilter } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import { filterTodayEvents, filterTodayTodos, isTodoOverdue } from '@/lib/today/alerts';
import type { TodayAlertItem } from '@/lib/today/alerts';
import { describeRecurrence } from '@/lib/todos/recurrence';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { isPickupImminent } from '@/lib/taxi/format';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';
import { transportStatusLabel } from '@/lib/transport/types';
import { formatEventTimeRange, mergeWorkScheduleItems } from '@/lib/work-items/merge';

type HandoverMobilePanelProps = {
  hidden?: boolean;
  summaryData: ShiftSummaryData;
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  alerts: TodayAlertItem[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onOpenRecords: (tab: HandoverRecordsTab) => void;
  onAlertClick: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onAcknowledge: (cardId: string) => void;
  onToggleTodo: (todo: Todo) => void;
  onShowUnacked: () => void;
};

function formatDue(todo: Todo): string {
  if (!todo.due_date) return '마감 없음';
  const date = new Date(`${todo.due_date}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function HandoverMobilePanel({
  hidden = false,
  summaryData,
  cards,
  todos,
  events,
  alerts,
  quickFilter,
  onQuickFilterChange,
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onOpenRecords,
  onAlertClick,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onAcknowledge,
  onToggleTodo,
  onShowUnacked,
}: HandoverMobilePanelProps) {
  const [open, setOpen] = useState(false);
  const unacked = useMemo(() => summaryData.unackedUrgent, [summaryData.unackedUrgent]);
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayWorkItems = useMemo(
    () =>
      mergeWorkScheduleItems({
        todos: filterTodayTodos(todos).slice(0, 8),
        events: filterTodayEvents(events).slice(0, 8),
        month: todayMonth,
        includeUndatedOpenTodos: true,
      }),
    [todos, events, todayMonth],
  );
  const { data: todayTaxi = [] } = useTodayTaxiBookings();
  const todayTaxiActive = todayTaxi
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time))
    .slice(0, 6);

  const badgeCount = unacked.length + alerts.length;

  const statChips = useMemo(
    () =>
      [
        summaryData.unackedUrgent.length
          ? { id: 'unacked', label: '미확인', count: summaryData.unackedUrgent.length, filter: 'unacked' as const, tone: 'urgent' }
          : null,
        summaryData.urgentActive.length
          ? { id: 'urgent', label: '긴급', count: summaryData.urgentActive.length, filter: 'all' as const, tone: 'urgent' }
          : null,
        summaryData.progressActive.length
          ? { id: 'progress', label: '진행', count: summaryData.progressActive.length, filter: 'all' as const, tone: 'progress' }
          : null,
        todayWorkItems.length
          ? { id: 'today', label: '오늘 일정', count: todayWorkItems.length, filter: undefined, tone: 'info' }
          : null,
        todayTaxiActive.length
          ? { id: 'taxi', label: '택시', count: todayTaxiActive.length, filter: undefined, tone: 'info' }
          : null,
      ].filter(Boolean) as {
        id: string;
        label: string;
        count: number;
        filter?: QuickFilter;
        tone: string;
      }[],
    [summaryData, todayWorkItems.length, todayTaxiActive.length],
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function selectFilter(filter: QuickFilter) {
    onQuickFilterChange(filter);
    setOpen(false);
  }

  function runAndClose(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div className={`handover-mobile${hidden ? ' handover-mobile--hidden' : ''}`}>
      <button
        type="button"
        className="handover-mobile__trigger"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="handover-mobile__trigger-icon" aria-hidden>
          ☀
        </span>
        <span className="handover-mobile__trigger-label">오늘 업무</span>
        {badgeCount > 0 ? (
          <span className="handover-mobile__trigger-badge" aria-label={`알림 ${badgeCount}건`}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="handover-mobile__overlay" role="presentation">
          <button
            type="button"
            className="handover-mobile__backdrop"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <section
            className="handover-mobile__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="handover-mobile-title"
          >
            <div className="handover-mobile__handle" aria-hidden />
            <header className="handover-mobile__head">
              <div>
                <h2 id="handover-mobile-title">오늘 업무</h2>
                <p>{getTodayLabel()}</p>
              </div>
              <button type="button" className="handover-mobile__close" onClick={() => setOpen(false)}>
                닫기
              </button>
            </header>

            {statChips.length ? (
              <div className="handover-mobile__chips" role="list">
                {statChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    role="listitem"
                    className={`handover-mobile__chip handover-mobile__chip--${chip.tone}${
                      chip.filter && quickFilter === chip.filter ? ' is-active' : ''
                    }`}
                    onClick={() => {
                      if (chip.filter) selectFilter(chip.filter);
                    }}
                  >
                    <span>{chip.label}</span>
                    <strong>{chip.count}</strong>
                  </button>
                ))}
              </div>
            ) : null}

            {alerts.length ? (
              <div className="handover-mobile__alerts">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    className={`handover-mobile__alert handover-mobile__alert--${alert.tone}`}
                    onClick={() => {
                      onAlertClick(alert.id);
                      setOpen(false);
                    }}
                  >
                    <strong>{alert.label}</strong>
                    <span>{alert.detail}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="handover-mobile__body">
              {unacked.length ? (
                <section className="handover-mobile__section">
                  <div className="handover-mobile__section-head">
                    <h3>미확인 긴급</h3>
                    <button type="button" className="handover-mobile__link" onClick={() => runAndClose(onShowUnacked)}>
                      목록 보기
                    </button>
                  </div>
                  <ul className="handover-mobile__list">
                    {unacked.slice(0, 4).map((card) => (
                      <li key={card.id} className="handover-mobile__item handover-mobile__item--urgent">
                        <button
                          type="button"
                          className="handover-mobile__item-main"
                          onClick={() => {
                            onOpenCard(card);
                            setOpen(false);
                          }}
                        >
                          <span className="handover-mobile__item-room card-room-badge">
                            {card.room || '—'}
                          </span>
                          <span className="handover-mobile__item-title">{card.title}</span>
                        </button>
                        <button
                          type="button"
                          className="handover-mobile__item-action"
                          onClick={() => onAcknowledge(card.id)}
                        >
                          확인
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="handover-mobile__section">
                <div className="handover-mobile__section-head">
                  <h3>오늘 일정·할일</h3>
                  <Link href={buildWorkHubHref('schedule')} className="handover-mobile__link" onClick={() => setOpen(false)}>
                    전체
                  </Link>
                </div>
                {todayWorkItems.length ? (
                  <ul className="handover-mobile__list">
                    {todayWorkItems.map((item) => {
                      if (item.kind === 'event') {
                        const event = item.event;
                        return (
                          <li key={`event-${event.id}`} className="handover-mobile__item">
                            <button
                              type="button"
                              className="handover-mobile__item-main"
                              onClick={() => {
                                onOpenEvent(event);
                                setOpen(false);
                              }}
                            >
                              <span className="handover-mobile__item-meta">
                                일정 · {event.category}
                                {formatEventTimeRange(event.start_time, event.end_time) !== '종일'
                                  ? ` · ${formatEventTimeRange(event.start_time, event.end_time)}`
                                  : ''}
                              </span>
                              <span className="handover-mobile__item-title">{event.title}</span>
                            </button>
                          </li>
                        );
                      }

                      const todo = item.todo;
                      return (
                        <li
                          key={`todo-${todo.id}`}
                          className={`handover-mobile__item${
                            isTodoOverdue(todo) ? ' handover-mobile__item--urgent' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="handover-mobile__item-check"
                            aria-label="완료"
                            onClick={() => onToggleTodo(todo)}
                          />
                          <button
                            type="button"
                            className="handover-mobile__item-main"
                            onClick={() => {
                              onOpenTodo(todo);
                              setOpen(false);
                            }}
                          >
                            <span className="handover-mobile__item-meta">
                              할일 · {TODO_PRIORITY_LABELS[todo.priority]} · {formatDue(todo)}
                              {describeRecurrence(todo) ? ` · 🔁` : ''}
                            </span>
                            <span className="handover-mobile__item-title">{todo.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="handover-mobile__empty">오늘 표시할 일정이 없습니다.</p>
                )}
              </section>

              {todayTaxiActive.length ? (
                <section className="handover-mobile__section">
                  <div className="handover-mobile__section-head">
                    <h3>오늘 택시</h3>
                    <Link href="/transport" className="handover-mobile__link" onClick={() => setOpen(false)}>
                      전체
                    </Link>
                  </div>
                  <ul className="handover-mobile__list">
                    {todayTaxiActive.map((booking) => {
                      const guest = booking.booker_name || booking.guest_name;
                      const imminent = isPickupImminent(booking);
                      return (
                        <li
                          key={booking.id}
                          className={`handover-mobile__item${
                            imminent ? ' handover-mobile__item--urgent' : ''
                          }${booking.status === 'completed' ? ' handover-mobile__item--muted' : ''}`}
                        >
                          <Link
                            href="/transport"
                            className="handover-mobile__item-main"
                            onClick={() => setOpen(false)}
                          >
                            <span className="handover-mobile__item-meta">
                              {booking.pickup_time.slice(0, 5)}
                              {booking.room_number ? ` · ${booking.room_number}호` : ''}
                              {guest ? ` · ${guest}` : ''}
                              {' · '}
                              {transportStatusLabel(booking.status)}
                            </span>
                            <span className="handover-mobile__item-title">
                              {booking.destination || '목적지 미입력'}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>

            <footer className="handover-mobile__foot">
              <button type="button" className="handover-mobile__action" onClick={() => runAndClose(onShiftStart)}>
                ▶ 교대 시작
              </button>
              <button type="button" className="handover-mobile__action" onClick={() => runAndClose(onShiftEnd)}>
                ■ 교대 종료
              </button>
              <button type="button" className="handover-mobile__action" onClick={() => runAndClose(onOpenShiftBrief)}>
                오늘 인계 다시 보기
              </button>
              <button
                type="button"
                className="handover-mobile__action handover-mobile__action--wide"
                onClick={() => runAndClose(() => onOpenRecords('shift'))}
              >
                기록 보기
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
