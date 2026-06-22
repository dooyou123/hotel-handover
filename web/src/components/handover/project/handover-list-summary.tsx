'use client';

import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { isUnackedUrgentCard } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import { filterTodayEvents, filterTodayTodos } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { mergeWorkScheduleItems } from '@/lib/work-items/merge';

type HandoverListSummaryProps = {
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  onShowUnacked: () => void;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
};

export function HandoverListSummary({
  cards,
  todos,
  events,
  onShowUnacked,
  onOpenCard,
  onAcknowledge,
}: HandoverListSummaryProps) {
  const unacked = cards.filter(isUnackedUrgentCard);
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayWorkCount = mergeWorkScheduleItems({
    todos: filterTodayTodos(todos),
    events: filterTodayEvents(events),
    month: todayMonth,
    includeUndatedOpenTodos: true,
  }).length;

  return (
    <div className="handover-list-summary">
      {unacked.length ? (
        <div className="handover-list-summary__urgent">
          <div className="handover-list-summary__urgent-head">
            <span className="handover-list-summary__label">미확인 긴급 {unacked.length}</span>
            {unacked.length > 2 ? (
              <button type="button" className="handover-list-summary__link" onClick={onShowUnacked}>
                전체 보기
              </button>
            ) : null}
          </div>
          <ul className="handover-list-summary__urgent-list">
            {unacked.slice(0, 2).map((card) => (
              <li key={card.id} className="handover-list-summary__urgent-item">
                <button type="button" className="handover-list-summary__urgent-main" onClick={() => onOpenCard(card)}>
                  {card.room ? <span className="handover-list-summary__room card-room-badge">{card.room}</span> : null}
                  <span className="handover-list-summary__title">{card.title}</span>
                </button>
                <button
                  type="button"
                  className="handover-list-summary__ack"
                  onClick={() => onAcknowledge(card.id)}
                >
                  확인
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span className="handover-list-summary__ok">미확인 긴급 없음</span>
      )}

      {todayWorkCount ? (
        <Link href={buildWorkHubHref('schedule')} className="handover-list-summary__chip">
          오늘 일정 {todayWorkCount}건
        </Link>
      ) : null}
    </div>
  );
}
