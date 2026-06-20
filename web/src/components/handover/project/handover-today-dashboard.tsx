'use client';

import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import { formatAssigneeLabel, isUnackedUrgentCard } from '@/lib/handover/card-utils';
import { getTodayLabel } from '@/lib/handover/shift-summary';
import type { Card, Notice } from '@/lib/handover/types';
import { filterNoticesForFeed } from '@/lib/notices/status';
import type { HotelEvent } from '@/lib/events/types';
import type { TodaySchedule } from '@/lib/schedule/use-schedule';
import { filterTodayEvents, filterTodayTodos, isTodoOverdue } from '@/lib/today/alerts';
import { describeRecurrence } from '@/lib/todos/recurrence';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { formatEventTimeRange, mergeWorkScheduleItems } from '@/lib/work-items/merge';

type HandoverTodayDashboardProps = {
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  schedule: TodaySchedule | undefined;
  notices: Notice[];
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

export function HandoverTodayDashboard({
  cards,
  todos,
  events,
  schedule,
  notices,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onAcknowledge,
  onToggleTodo,
  onShowUnacked,
}: HandoverTodayDashboardProps) {
  const unacked = cards.filter(isUnackedUrgentCard);
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayWorkItems = mergeWorkScheduleItems({
    todos: filterTodayTodos(todos).slice(0, 12),
    events: filterTodayEvents(events).slice(0, 12),
    month: todayMonth,
    includeUndatedOpenTodos: true,
  });
  const pinnedNotices = filterNoticesForFeed(notices).filter((n) => n.is_pinned).slice(0, 5);

  return (
    <div className="today-dashboard">
      <header className="today-dashboard__head">
        <h3>오늘</h3>
        <p>{getTodayLabel()}</p>
      </header>

      <div className="today-dashboard__grid">
        <section className="today-dashboard__panel">
          <div className="today-dashboard__panel-head">
            <h4>미확인 긴급</h4>
            {unacked.length ? (
              <button type="button" className="today-dashboard__link" onClick={onShowUnacked}>
                전체 보기
              </button>
            ) : null}
          </div>
          {unacked.length ? (
            <ul className="today-dashboard__list">
              {unacked.map((card) => (
                <li key={card.id} className="today-dashboard__row today-dashboard__row--urgent">
                  <button type="button" className="today-dashboard__main" onClick={() => onOpenCard(card)}>
                    <span className="today-dashboard__room card-room-badge">{card.room || '—'}</span>
                    <span className="today-dashboard__title">{card.title}</span>
                  </button>
                  <button type="button" className="today-dashboard__action" onClick={() => onAcknowledge(card.id)}>
                    확인
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="today-dashboard__empty">미확인 긴급 건이 없습니다.</p>
          )}
        </section>

        <section className="today-dashboard__panel">
          <div className="today-dashboard__panel-head">
            <h4>오늘 업무 일정</h4>
            <Link href={buildWorkHubHref('schedule')} className="today-dashboard__link">
              할일·일정
            </Link>
          </div>
          {todayWorkItems.length ? (
            <ul className="today-dashboard__list">
              {todayWorkItems.map((item) => {
                if (item.kind === 'event') {
                  const event = item.event;
                  return (
                    <li key={`event-${event.id}`} className="today-dashboard__row">
                      <button type="button" className="today-dashboard__main" onClick={() => onOpenEvent(event)}>
                        <span className="today-dashboard__meta">
                          일정 · {event.category}
                          {formatEventTimeRange(event.start_time, event.end_time) !== '종일'
                            ? ` · ${formatEventTimeRange(event.start_time, event.end_time)}`
                            : ''}
                        </span>
                        <span className="today-dashboard__title">{event.title}</span>
                      </button>
                    </li>
                  );
                }

                const todo = item.todo;
                return (
                  <li
                    key={`todo-${todo.id}`}
                    className={`today-dashboard__row${isTodoOverdue(todo) ? ' today-dashboard__row--urgent' : ''}`}
                  >
                    <button
                      type="button"
                      className="today-dashboard__check"
                      aria-label="완료"
                      onClick={() => onToggleTodo(todo)}
                    />
                    <button type="button" className="today-dashboard__main" onClick={() => onOpenTodo(todo)}>
                      <span className="today-dashboard__meta">
                        할일 · {TODO_PRIORITY_LABELS[todo.priority]} · {formatDue(todo)}
                        {describeRecurrence(todo) ? ` · 🔁 ${describeRecurrence(todo)}` : ''}
                        {todo.linked_card_id ? ' · 인수인계 연동' : ''}
                      </span>
                      <span className="today-dashboard__title">{todo.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="today-dashboard__empty">오늘 표시할 업무 일정이 없습니다.</p>
          )}
        </section>

        <section className="today-dashboard__panel">
          <div className="today-dashboard__panel-head">
            <h4>오늘 근무</h4>
            <Link href="/schedule" className="today-dashboard__link">
              근무표
            </Link>
          </div>
          {schedule ? (
            <ul className="today-dashboard__schedule">
              {WORK_GROUPS.map((group) => (
                <li key={group}>
                  <span>{formatWorkGroupLabel(group)}</span>
                  <span>{schedule.groups[group].length ? schedule.groups[group].join(', ') : '—'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="today-dashboard__empty">근무표를 불러오는 중…</p>
          )}
        </section>

        {pinnedNotices.length ? (
          <section className="today-dashboard__panel today-dashboard__panel--wide">
            <div className="today-dashboard__panel-head">
              <h4>고정 공지</h4>
              <Link href={buildWorkHubHref('notices')} className="today-dashboard__link">
                공지·변경
              </Link>
            </div>
            <ul className="today-dashboard__list">
              {pinnedNotices.map((notice) => (
                <li key={notice.id} className="today-dashboard__row">
                  <Link href={buildWorkHubHref('notices', { channel: notice.type, id: notice.id })} className="today-dashboard__main today-dashboard__main--link">
                    <span className="today-dashboard__meta">{notice.type === 'change' ? '변경' : '공지'}</span>
                    <span className="today-dashboard__title">{notice.content.split('\n')[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="today-dashboard__panel today-dashboard__panel--wide">
          <div className="today-dashboard__panel-head">
            <h4>진행 중 인수인계</h4>
          </div>
          <ul className="today-dashboard__list">
            {cards
              .filter((c) => c.column_id !== 'done' && !isUnackedUrgentCard(c))
              .slice(0, 8)
              .map((card) => (
                <li key={card.id} className="today-dashboard__row">
                  <button type="button" className="today-dashboard__main" onClick={() => onOpenCard(card)}>
                    <span className="today-dashboard__room card-room-badge">{card.room || '—'}</span>
                    <span className="today-dashboard__title">{card.title}</span>
                    {formatAssigneeLabel(card) ? (
                      <span className="today-dashboard__meta">담당 {formatAssigneeLabel(card)}</span>
                    ) : null}
                  </button>
                </li>
              ))}
          </ul>
          {!cards.filter((c) => c.column_id !== 'done').length ? (
            <p className="today-dashboard__empty">진행 중인 인수인계가 없습니다.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
