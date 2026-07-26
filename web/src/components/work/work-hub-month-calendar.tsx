'use client';

import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';
import { todayDateString } from '@/lib/handover/shift-summary';

export type WorkHubDayMarks = {
  todo: boolean;
  event: boolean;
  urgent: boolean;
};

type WorkHubMonthCalendarProps = {
  month: string;
  selectedDate: string;
  dayMarks: Map<string, WorkHubDayMarks>;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
};

export function WorkHubMonthCalendar({
  month,
  selectedDate,
  dayMarks,
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
          const isPast = cell.date < today;
          const marks = dayMarks.get(cell.date);
          const hasItems = Boolean(marks?.todo || marks?.event);
          const labelParts = [
            `${cell.day}일`,
            marks?.event ? '일정' : '',
            marks?.todo ? '할일' : '',
            marks?.urgent ? '긴급' : '',
            isToday ? '오늘' : '',
            isPast ? '지난 날' : '',
          ].filter(Boolean);

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-label={labelParts.join(' · ')}
              aria-pressed={isSelected}
              className={[
                'work-hub-month-cal__day',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                isPast ? 'is-past' : '',
                hasItems ? 'has-items' : '',
                marks?.urgent ? 'has-urgent' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.date!)}
            >
              <span className="work-hub-month-cal__day-num">{cell.day}</span>
              {hasItems ? (
                <span className="work-hub-month-cal__dots" aria-hidden>
                  {marks?.event ? <i className="is-event" /> : null}
                  {marks?.todo ? <i className="is-todo" /> : null}
                  {marks?.urgent ? <i className="is-urgent" /> : null}
                </span>
              ) : (
                <span className="work-hub-month-cal__dots is-empty" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="work-hub-month-cal__legend" aria-hidden>
        <span>
          <i className="is-event" /> 일정
        </span>
        <span>
          <i className="is-todo" /> 할일
        </span>
        <span>
          <i className="is-urgent" /> 긴급
        </span>
      </div>
    </div>
  );
}
