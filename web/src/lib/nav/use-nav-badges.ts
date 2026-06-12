'use client';

import { useMemo } from 'react';
import { usePinnedContacts } from '@/lib/contacts/use-contacts';
import { useMonthEvents } from '@/lib/events/use-events';
import { todayDateString } from '@/lib/handover/shift-summary';
import { useCards } from '@/lib/handover/use-cards';
import { useNotices } from '@/lib/handover/use-notices';
import { computeNavBadges, type NavBadgeMap } from '@/lib/nav/nav-badges';
import { useTodos } from '@/lib/todos/use-todos';
import { useTodayPendingTransport } from '@/lib/transport/use-transport';

export function useNavBadges(): NavBadgeMap {
  const { cards } = useCards();
  const { notices } = useNotices();
  const { todos } = useTodos();
  const month = todayDateString().slice(0, 7);
  const { events } = useMonthEvents(month);
  const { data: pinnedContacts = [] } = usePinnedContacts();
  const { data: transportBookings = [] } = useTodayPendingTransport();

  return useMemo(
    () =>
      computeNavBadges({
        cards,
        notices,
        todos,
        events,
        transportBookings,
        pinnedContactsCount: pinnedContacts.length,
      }),
    [cards, notices, todos, events, transportBookings, pinnedContacts.length],
  );
}
