'use client';

import { useMemo, useState } from 'react';
import { todayDateString } from '@/lib/handover/shift-summary';
import type { HotelEvent } from '@/lib/events/types';
import { useMonthEvents } from '@/lib/events/use-events';

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

type AsideMonthCalendarProps = {
  onOpenEvent?: (event: HotelEvent) => void;
};

export function AsideMonthCalendar({ onOpenEvent }: AsideMonthCalendarProps) {
  const today = todayDateString();
  const todayMonth = today.slice(0, 7);
  const [month, setMonth] = useState(() => todayMonth);
  const { events } = useMonthEvents(month);
  const { events: todayMonthEvents } = useMonthEvents(month === todayMonth ? '' : todayMonth);

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((event) => set.add(event.event_date));
    return set;
  }, [events]);

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

  const todayEvents = (month === todayMonth ? events : todayMonthEvents).filter(
    (event) => event.event_date === today,
  );

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

      <div className="aside-month-cal__grid">
        {cells.map((cell) => {
          const isToday = cell.date === today;
          const hasEvent = cell.date ? eventDates.has(cell.date) : false;
          return (
            <span
              key={cell.key}
              className={[
                'aside-month-cal__day',
                cell.day ? '' : 'is-empty',
                isToday ? 'is-today' : '',
                hasEvent ? 'has-event' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {cell.day ?? ''}
            </span>
          );
        })}
      </div>

      {todayEvents.length ? (
        <ul className="aside-month-cal__today-list">
          {todayEvents.slice(0, 3).map((event) => (
            <li key={event.id}>
              <button type="button" className="aside-month-cal__today-item" onClick={() => onOpenEvent?.(event)}>
                <span>{event.title}</span>
                {event.start_time ? <time>{event.start_time.slice(0, 5)}</time> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="aside-month-cal__empty">오늘 등록된 업무 일정이 없습니다.</p>
      )}
    </section>
  );
}
