'use client';

import { useEffect, useMemo, useState } from 'react';
import { todayDateString } from '@/lib/handover/shift-summary';
import type { HotelEvent } from '@/lib/events/types';
import { useMonthEvents } from '@/lib/events/use-events';
import type { Todo } from '@/lib/todos/types';
import { formatEventTimeRange } from '@/lib/work-items/merge';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year!, mon! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${year}년 ${mon}월`;
}

function formatSelectedDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

type AsideMonthCalendarProps = {
  todos?: Todo[];
  onOpenEvent?: (event: HotelEvent) => void;
  onOpenTodo?: (todo: Todo) => void;
};

export function AsideMonthCalendar({ todos = [], onOpenEvent, onOpenTodo }: AsideMonthCalendarProps) {
  const today = todayDateString();
  const todayMonth = today.slice(0, 7);
  const [month, setMonth] = useState(() => todayMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const { events } = useMonthEvents(month);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((event) => {
      counts.set(event.event_date, (counts.get(event.event_date) ?? 0) + 1);
    });
    todos.forEach((todo) => {
      if (!todo.due_date || !todo.due_date.startsWith(month)) return;
      counts.set(todo.due_date, (counts.get(todo.due_date) ?? 0) + 1);
    });
    return counts;
  }, [events, todos, month]);

  const selectedEvents = useMemo(
    () => events.filter((event) => event.event_date === selectedDate),
    [events, selectedDate],
  );

  const selectedTodos = useMemo(
    () => todos.filter((todo) => todo.due_date === selectedDate),
    [todos, selectedDate],
  );

  const cells = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const first = new Date(year!, mon! - 1, 1);
    const lastDay = new Date(year!, mon!, 0).getDate();
    const leading = first.getDay();
    const items: Array<{ key: string; day: number | null; date: string | null }> = [];

    for (let i = 0; i < leading; i += 1) {
      items.push({ key: `blank-${i}`, day: null, date: null });
    }
    for (let day = 1; day <= lastDay; day += 1) {
      const date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      items.push({ key: date, day, date });
    }
    return items;
  }, [month]);

  useEffect(() => {
    setSelectedDate((current) => {
      if (current.startsWith(month)) return current;
      if (today.startsWith(month)) return today;
      return `${month}-01`;
    });
  }, [month, today]);

  const selectedCount = selectedEvents.length + selectedTodos.length;

  return (
    <section className="aside-card aside-card--calendar">
      <div className="aside-card__head aside-month-cal__head">
        <h3 className="aside-card__title">이번 달 업무</h3>
        <div className="aside-month-cal__nav">
          <button type="button" className="aside-month-cal__nav-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="이전 달">
            ‹
          </button>
          <span className="aside-month-cal__label">{formatMonthLabel(month)}</span>
          <button type="button" className="aside-month-cal__nav-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="다음 달">
            ›
          </button>
        </div>
      </div>

      <div className="aside-month-cal__weekdays" aria-hidden>
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="aside-month-cal__grid" role="grid" aria-label={`${formatMonthLabel(month)} 달력`}>
        {cells.map((cell) => {
          if (!cell.date || cell.day == null) {
            return <span key={cell.key} className="aside-month-cal__day is-empty" aria-hidden />;
          }

          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const count = dayCounts.get(cell.date) ?? 0;
          const hasItems = count > 0;

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-label={`${cell.day}일${hasItems ? ` · 일정 ${count}건` : ''}${isToday ? ' · 오늘' : ''}`}
              aria-pressed={isSelected}
              className={[
                'aside-month-cal__day',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                hasItems ? 'has-event' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedDate(cell.date!)}
            >
              <span className="aside-month-cal__day-num">{cell.day}</span>
              {hasItems ? <span className="aside-month-cal__day-badge">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="aside-month-cal__detail">
        <h4 className="aside-month-cal__detail-title">
          {formatSelectedDateLabel(selectedDate)}
          {selectedCount ? <span className="aside-month-cal__detail-count">{selectedCount}건</span> : null}
        </h4>

        {selectedCount ? (
          <ul className="aside-month-cal__day-list">
            {selectedEvents.map((event) => (
              <li key={`event-${event.id}`}>
                <button type="button" className="aside-month-cal__day-item" onClick={() => onOpenEvent?.(event)}>
                  <span className="aside-month-cal__day-item-kind aside-month-cal__day-item-kind--event">
                    {event.category || '일정'}
                  </span>
                  <span className="aside-month-cal__day-item-body">
                    <strong>{event.title}</strong>
                    <time>{formatEventTimeRange(event.start_time, event.end_time)}</time>
                  </span>
                </button>
              </li>
            ))}
            {selectedTodos.map((todo) => (
              <li key={`todo-${todo.id}`}>
                <button type="button" className="aside-month-cal__day-item" onClick={() => onOpenTodo?.(todo)}>
                  <span className="aside-month-cal__day-item-kind aside-month-cal__day-item-kind--todo">할일</span>
                  <span className="aside-month-cal__day-item-body">
                    <strong>{todo.title}</strong>
                    <span>{todo.status === 'done' ? '완료' : '미완료'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="aside-month-cal__empty">선택한 날짜에 등록된 일정이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
