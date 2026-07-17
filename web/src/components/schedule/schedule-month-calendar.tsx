'use client';

import { WORK_GROUPS, formatWorkGroupLabel, type WorkGroupCode } from '@/lib/constants';
import { getKoreanHoliday } from '@/lib/calendar/korean-holidays';
import { todayDateString } from '@/lib/handover/shift-summary';
import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';
import { normalizeScheduleGroup } from '@/lib/schedule/group-utils';
import type { ScheduleEntry } from '@/lib/schedule/parse-csv';

type ScheduleMonthCalendarProps = {
  month: string;
  entries: ScheduleEntry[];
  onMonthChange: (month: string) => void;
  onAdd: (workDate: string, shift?: WorkGroupCode) => void;
  onEdit: (entry: ScheduleEntry) => void;
};

function weekdayClass(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 0) return 'is-sun';
  if (day === 6) return 'is-sat';
  return '';
}

export function ScheduleMonthCalendar({
  month,
  entries,
  onMonthChange,
  onAdd,
  onEdit,
}: ScheduleMonthCalendarProps) {
  const today = todayDateString();
  const cells = buildCalendarCells(month);

  const byDate = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.work_date);
    if (list) list.push(entry);
    else byDate.set(entry.work_date, [entry]);
  }

  return (
    <div className="schedule-cal">
      <div className="schedule-cal__head">
        <div className="schedule-cal__nav">
          <button
            type="button"
            className="schedule-cal__nav-btn"
            onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="schedule-cal__label">{formatCalendarMonthLabel(month)}</span>
          <button
            type="button"
            className="schedule-cal__nav-btn"
            onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
        {month !== today.slice(0, 7) ? (
          <button
            type="button"
            className="schedule-cal__today-link"
            onClick={() => onMonthChange(today.slice(0, 7))}
          >
            이번 달
          </button>
        ) : null}
      </div>

      <div className="schedule-cal__weekdays" aria-hidden>
        {CALENDAR_WEEKDAYS.map((label) => (
          <span key={label} className={label === '일' ? 'is-sun' : label === '토' ? 'is-sat' : undefined}>
            {label}
          </span>
        ))}
      </div>

      <div className="schedule-cal__grid" role="grid" aria-label={`${formatCalendarMonthLabel(month)} 근무표`}>
        {cells.map((cell) => {
          if (!cell.date || cell.day == null) {
            return <div key={cell.key} className="schedule-cal__day is-empty" aria-hidden />;
          }

          const dayEntries = byDate.get(cell.date) ?? [];
          const holiday = getKoreanHoliday(cell.date);
          const isToday = cell.date === today;
          const groups = WORK_GROUPS.map((group) => ({
            group,
            entries: dayEntries.filter((entry) => normalizeScheduleGroup(entry.shift) === group),
          })).filter((row) => row.entries.length > 0);

          return (
            <div
              key={cell.key}
              role="gridcell"
              className={[
                'schedule-cal__day',
                weekdayClass(cell.date),
                isToday ? 'is-today' : '',
                holiday ? 'is-holiday' : '',
                dayEntries.length ? 'has-entries' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="schedule-cal__day-head">
                <span className="schedule-cal__day-num">{cell.day}</span>
                {holiday ? <span className="schedule-cal__holiday">{holiday}</span> : null}
                <button
                  type="button"
                  className="schedule-cal__add"
                  onClick={() => onAdd(cell.date!)}
                  aria-label={`${cell.day}일 근무 추가`}
                  title="근무 추가"
                >
                  +
                </button>
              </div>

              <div className="schedule-cal__groups">
                {groups.length === 0 ? (
                  <p className="schedule-cal__empty">근무 없음</p>
                ) : (
                  groups.map(({ group, entries: groupEntries }) => (
                    <div key={group} className="schedule-cal__group">
                      <button
                        type="button"
                        className="schedule-cal__group-label"
                        onClick={() => onAdd(cell.date!, group)}
                        title={`${formatWorkGroupLabel(group)} 추가`}
                      >
                        {group}
                      </button>
                      <div className="schedule-cal__names">
                        {groupEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            className="schedule-cal__name"
                            onClick={() => onEdit(entry)}
                            title={`${entry.staff_name} 수정`}
                          >
                            {entry.staff_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
