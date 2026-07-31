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
  staffNames: string[];
  unseenCount: number;
  unseenHint: boolean;
  unseenActive: boolean;
  onShowUnseen: () => void;
  onClearUnseen: () => void;
  onShowUnacked: () => void;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
};

export function HandoverListSummary({
  cards,
  todos,
  events,
  staffNames,
  unseenCount,
  unseenHint,
  unseenActive,
  onShowUnseen,
  onClearUnseen,
  onShowUnacked,
  onOpenCard,
  onAcknowledge,
}: HandoverListSummaryProps) {
  const unacked = cards.filter((card) =>
    isUnackedUrgentCard(card, staffNames.length ? { activeStaffNames: staffNames } : undefined),
  );
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

      {unseenCount ? (
        <span className="handover-list-summary__unseen">
          <button
            type="button"
            className={`handover-list-summary__chip handover-list-summary__chip--unseen${unseenActive ? ' is-active' : ''}`}
            onClick={onShowUnseen}
            title="내 마지막 교대 기록 이후 다른 사람이 바꾼 카드만 봅니다"
          >
            <span className="handover-list-summary__unseen-dot" aria-hidden />안 본 변경 {unseenCount}건
          </button>
          <button type="button" className="handover-list-summary__link" onClick={onClearUnseen}>
            모두 확인
          </button>
        </span>
      ) : unseenHint ? (
        <span className="handover-list-summary__hint">
          교대 시작을 눌러두면 자리 비운 사이 바뀐 카드를 모아 보여드려요
        </span>
      ) : null}

      {todayWorkCount ? (
        <Link href={buildWorkHubHref('schedule')} className="handover-list-summary__chip">
          오늘 일정 {todayWorkCount}건
        </Link>
      ) : null}
    </div>
  );
}
