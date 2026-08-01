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

/** 날짜 칸 안에 제목으로 표시되는 개별 항목 */
export type WorkHubDayItem = {
  id: string;
  label: string;
  tone: 'event' | 'todo' | 'urgent';
  done?: boolean;
};

/** 날짜 칸에 제목으로 보여줄 최대 개수 — 넘치면 +N으로 접는다 */
const DAY_ITEM_LIMIT = 3;

type WorkHubMonthCalendarProps = {
  month: string;
  selectedDate: string;
  dayMarks: Map<string, WorkHubDayMarks>;
  /** 있으면 큰 달력 모드 — 날짜 칸에 항목 제목을 직접 표시 (좁은 화면에선 점으로 대체) */
  dayItems?: Map<string, WorkHubDayItem[]>;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
};

export function WorkHubMonthCalendar({
  month,
  selectedDate,
  dayMarks,
  dayItems,
  onMonthChange,
  onSelectDate,
}: WorkHubMonthCalendarProps) {
  const today = todayDateString();
  const cells = buildCalendarCells(month);

  return (
    <div className={`work-hub-month-cal${dayItems ? ' work-hub-month-cal--detailed' : ''}`}>
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
          const items = dayItems?.get(cell.date) ?? [];
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
              {items.length ? (
                <span className="work-hub-month-cal__items" aria-hidden>
                  {items.slice(0, DAY_ITEM_LIMIT).map((item) => (
                    <span
                      key={item.id}
                      className={`work-hub-month-cal__item is-${item.tone}${item.done ? ' is-done' : ''}`}
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  ))}
                  {items.length > DAY_ITEM_LIMIT ? (
                    <span className="work-hub-month-cal__item-more">
                      +{items.length - DAY_ITEM_LIMIT}건 더
                    </span>
                  ) : null}
                </span>
              ) : null}
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
