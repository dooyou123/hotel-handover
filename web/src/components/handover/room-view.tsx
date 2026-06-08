'use client';

import { useMemo, useState } from 'react';
import { COLUMN_LABELS, PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatDueLabel,
  formatTime,
  groupCardsByRoom,
  isCardOverdue,
  isUrgentPriorityCard,
  sortRoomKeys,
} from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';

type RoomViewProps = {
  cards: Card[];
  onOpenCard: (card: Card) => void;
};

export function RoomView({ cards, onOpenCard }: RoomViewProps) {
  const groups = useMemo(() => groupCardsByRoom(cards), [cards]);
  const roomKeys = useMemo(() => sortRoomKeys([...groups.keys()]), [groups]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeKey = selectedKey && groups.has(selectedKey) ? selectedKey : roomKeys[0] ?? null;
  const roomCards = activeKey ? groups.get(activeKey) ?? [] : [];
  const sortedCards = [...roomCards].sort(
    (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime(),
  );

  if (!roomKeys.length) {
    return (
      <p className="room-view__empty">
        표시할 업무가 없습니다. 필터를 바꾸거나 새 인수인계를 추가해 주세요.
      </p>
    );
  }

  return (
    <div className="room-view__layout">
      <aside className="room-view__sidebar">
        <div className="room-view__sidebar-header">
          <h3>객실 목록</h3>
          <span className="room-chip__count">{roomKeys.length}개</span>
        </div>
        <div className="room-view__rooms">
          {roomKeys.map((key) => {
            const list = groups.get(key) ?? [];
            const urgentCount = list.filter(isUrgentPriorityCard).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={[
                  'room-chip',
                  activeKey === key ? 'is-active' : '',
                  urgentCount && activeKey !== key ? 'room-chip--urgent' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="room-chip__name">{key}</span>
                <span className="room-chip__count">{list.length}건</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="room-view__timeline">
        <div className="room-timeline__header">
          <h3>{activeKey}</h3>
          <span className="room-chip__count">{sortedCards.length}건 · 최신순</span>
        </div>

        <div className="room-timeline__list">
          {sortedCards.length ? (
            sortedCards.map((card) => {
              const overdue = isCardOverdue(card);
              return (
                <article
                  key={card.id}
                  className={[
                    'room-timeline-item',
                    isUrgentPriorityCard(card) ? 'room-timeline-item--urgent' : '',
                    overdue ? 'room-timeline-item--overdue' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="room-timeline-item__top">
                    <span>{PRIORITY_LABELS[card.priority]}</span>
                    <span>{card.category}</span>
                    <span className="room-timeline-item__status">
                      {card.column_id === 'done' ? COLUMN_LABELS.done : COLUMN_LABELS.progress}
                    </span>
                  </div>
                  <p className="room-timeline-item__title">{card.title}</p>
                  {card.next_action ? (
                    <p className="room-timeline-item__action">다음: {card.next_action}</p>
                  ) : null}
                  <div className="room-timeline-item__meta">
                    {formatAssigneeLabel(card) ? <span>{formatAssigneeLabel(card)}</span> : null}
                    {card.due_at ? <span>{formatDueLabel(card.due_at, overdue)}</span> : null}
                    <span>{formatTime(card.updated_at || card.created_at)}</span>
                  </div>
                  <button type="button" onClick={() => onOpenCard(card)} className="btn btn--ghost btn--small">
                    카드 열기
                  </button>
                </article>
              );
            })
          ) : (
            <p className="room-view__empty">이 객실에 표시할 업무가 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
