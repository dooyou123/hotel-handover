import { isUrgentPriorityCard } from '@/lib/handover/card-utils';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, Notice } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import { filterTodayEvents, isTodoDueToday, isTodoOverdue } from '@/lib/today/alerts';
import { isPickupOverdue } from '@/lib/transport/alerts';
import { filterPendingTodayTaxi } from '@/lib/today/alerts';
import { filterNoticesForFeed } from '@/lib/notices/status';
import type { TransportBooking } from '@/lib/transport/types';
import type { Todo } from '@/lib/todos/types';
import { WORK_HUB_PATH } from '@/lib/work/work-hub';

export type NavBadgeTone = 'urgent' | 'warn' | 'info';

export type NavBadge = {
  count: number;
  tone: NavBadgeTone;
};

export type NavBadgeMap = Record<string, NavBadge>;

export function computeNavBadges(input: {
  cards: Card[];
  notices: Notice[];
  todos: Todo[];
  events: HotelEvent[];
  transportBookings: TransportBooking[];
  pinnedContactsCount: number;
}): NavBadgeMap {
  const badges: NavBadgeMap = {};
  const summary = buildShiftSummaryData(input.cards, input.notices);
  const today = new Date().toISOString().slice(0, 10);

  const unacked = summary.unackedUrgent.length;
  const urgentProgress = input.cards.filter(
    (card) => card.column_id === 'progress' && isUrgentPriorityCard(card),
  ).length;
  const hold = summary.holdActive.length;
  const handoverCount = unacked + urgentProgress + hold;
  if (handoverCount > 0) {
    badges['/handover'] = {
      count: handoverCount,
      tone: unacked > 0 ? 'urgent' : 'warn',
    };
  }

  const activeNotices = filterNoticesForFeed(input.notices);
  const pinnedNotices = activeNotices.filter((notice) => notice.is_pinned).length;
  const todayChanges = activeNotices.filter(
    (notice) => notice.type === 'change' && notice.created_at.slice(0, 10) === today,
  ).length;
  const noticesCount = pinnedNotices + todayChanges;
  const overdueTodos = input.todos.filter(isTodoOverdue).length;
  const dueTodayTodos = input.todos.filter((todo) => isTodoDueToday(todo) && !isTodoOverdue(todo)).length;
  const todayEvents = filterTodayEvents(input.events);
  const vipToday = todayEvents.filter((event) => event.category === 'VIP').length;
  const workScheduleCount = overdueTodos + dueTodayTodos + todayEvents.length;
  const workHubCount = noticesCount + workScheduleCount;
  if (workHubCount > 0) {
    badges[WORK_HUB_PATH] = {
      count: workHubCount,
      tone:
        overdueTodos > 0
          ? 'urgent'
          : todayChanges > 0 || vipToday > 0 || dueTodayTodos > 0
            ? 'warn'
            : 'info',
    };
  }

  if (input.pinnedContactsCount > 0) {
    badges['/contacts'] = { count: input.pinnedContactsCount, tone: 'info' };
  }

  const pendingTaxis = filterPendingTodayTaxi(input.transportBookings);
  if (pendingTaxis.length > 0) {
    const hasOverdue = pendingTaxis.some((booking) => isPickupOverdue(booking));
    badges['/transport'] = {
      count: pendingTaxis.length,
      tone: hasOverdue ? 'urgent' : 'warn',
    };
  }

  return badges;
}
