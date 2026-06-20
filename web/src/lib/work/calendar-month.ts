export const CALENDAR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function shiftCalendarMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year!, mon! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCalendarMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${year}년 ${mon}월`;
}

export function formatCalendarDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export type CalendarCell = { key: string; day: number | null; date: string | null };

export function buildCalendarCells(month: string): CalendarCell[] {
  const [year, mon] = month.split('-').map(Number);
  const first = new Date(year!, mon! - 1, 1);
  const lastDay = new Date(year!, mon!, 0).getDate();
  const leading = first.getDay();
  const items: CalendarCell[] = [];

  for (let i = 0; i < leading; i += 1) {
    items.push({ key: `blank-${i}`, day: null, date: null });
  }
  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    items.push({ key: date, day, date });
  }
  return items;
}

export function sortCalendarItemsByDone<T>(items: T[], isDone: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
}
