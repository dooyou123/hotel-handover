import { monthDateRange } from '@/lib/schedule/month-range';
import type { HotelEvent } from '@/lib/events/types';

export function getEventEndDate(event: Pick<HotelEvent, 'event_date' | 'end_date'>): string {
  if (event.end_date && event.end_date > event.event_date) return event.end_date;
  return event.event_date;
}

export function isMultiDayEvent(event: Pick<HotelEvent, 'event_date' | 'end_date'>): boolean {
  return Boolean(event.end_date && event.end_date > event.event_date);
}

export function normalizeEventEndDate(
  eventDate: string,
  endDate: string | null | undefined,
): string | null {
  if (!endDate || endDate <= eventDate) return null;
  return endDate;
}

export function isDateInEventRange(
  date: string,
  event: Pick<HotelEvent, 'event_date' | 'end_date'>,
): boolean {
  return date >= event.event_date && date <= getEventEndDate(event);
}

export function eventOverlapsMonth(
  event: Pick<HotelEvent, 'event_date' | 'end_date'>,
  month: string,
): boolean {
  const { start, end } = monthDateRange(month);
  return event.event_date <= end && getEventEndDate(event) >= start;
}

export function eachEventDateInMonth(
  event: Pick<HotelEvent, 'event_date' | 'end_date'>,
  month: string,
): string[] {
  const { start, end } = monthDateRange(month);
  const rangeStart = event.event_date > start ? event.event_date : start;
  const rangeEnd = getEventEndDate(event) < end ? getEventEndDate(event) : end;
  if (rangeStart > rangeEnd) return [];

  const dates: string[] = [];
  const cursor = new Date(`${rangeStart}T12:00:00`);
  const last = new Date(`${rangeEnd}T12:00:00`);
  while (cursor.getTime() <= last.getTime()) {
    const year = cursor.getFullYear();
    const mon = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${mon}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function formatEventDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function formatEventDateRange(
  eventDate: string,
  endDate: string | null | undefined,
): string {
  const startLabel = formatEventDateLabel(eventDate);
  if (!endDate || endDate <= eventDate) return startLabel;
  return `${startLabel} – ${formatEventDateLabel(endDate)}`;
}
