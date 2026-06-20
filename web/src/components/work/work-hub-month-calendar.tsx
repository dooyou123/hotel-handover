'use client';

import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';
import { todayDateString } from '@/lib/handover/shift-summary';

type WorkHubMonthCalendarProps = {
  month: string;
  selectedDate: string;
  dayCounts: Map<string, number>;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
};

export function WorkHubMonthCalendar({
  month,
  selectedDate,
  dayCounts,
  onMonthChange,
  onSelectDate,
}: WorkHubMonthCalendarProps) {
  const today = todayDateString();
  const cells = buildCalendarCells(month);

  return (
    <div className="work-hub-month-cal">
      <div className="work-hub-month-cal__head">
        <div className="work-hub-month-cal__nav">
          <button
            type="button"
            className="work-hub-month-cal__nav-btn"
            onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="work-hub-month-cal__label">{formatCalendarMonthLabel(month)}</span>
          <button
            type="button"
            className="work-hub-month-cal__nav-btn"
            onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
        {selectedDate !== today ? (
          <button type="button" className="work-hub-today__link" onClick={() => onSelectDate(today)}>
            오늘
          </button>
        ) : null}
      </div>

      <div className="work-hub-month-cal__weekdays" aria-hidden>
        {CALENDAR_WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="work-hub-month-cal__grid" role="grid" aria-label={`${formatCalendarMonthLabel(month)} 달력`}>
        {cells.map((cell) => {
          if (!cell.date || cell.day == null) {
            return <span key={cell.key} className="work-hub-month-cal__day is-empty" aria-hidden />;
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
                'work-hub-month-cal__day',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                hasItems ? 'has-items' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.date!)}
            >
              <span className="work-hub-month-cal__day-num">{cell.day}</span>
              {hasItems ? <span className="work-hub-month-cal__day-badge">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
