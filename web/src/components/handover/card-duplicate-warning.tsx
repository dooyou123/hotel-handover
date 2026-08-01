'use client';

import type { Card } from '@/lib/handover/types';
import { formatAssigneeLabel } from '@/lib/handover/card-utils';

type CardDuplicateWarningProps = {
  duplicates: Card[];
  onOpenCard?: (card: Card) => void;
  /** 작성 중인 카드를 이 카드와 같은 사건으로 연결 (저장 시 반영) */
  onLinkThread?: (card: Card) => void;
  onUnlinkThread?: () => void;
  /** 사건 연결이 선택된 카드 id */
  linkedCardId?: string | null;
};

export function CardDuplicateWarning({
  duplicates,
  onOpenCard,
  onLinkThread,
  onUnlinkThread,
  linkedCardId = null,
}: CardDuplicateWarningProps) {
  if (!duplicates.length) return null;

  return (
    <div className="card-duplicate-warning" role="alert">
      <p className="card-duplicate-warning__title">
        진행 중인 유사 카드 {duplicates.length}건이 있습니다
      </p>
      <ul className="card-duplicate-warning__list">
        {duplicates.slice(0, 3).map((item) => {
          const isLinked = linkedCardId === item.id;
          return (
            <li key={item.id} className="card-duplicate-warning__item">
              {onOpenCard ? (
                <button type="button" className="card-duplicate-warning__link" onClick={() => onOpenCard(item)}>
                  {item.room ? `${item.room} · ` : ''}
                  {item.title}
                  {formatAssigneeLabel(item) ? ` · 담당 ${formatAssigneeLabel(item)}` : ''}
                </button>
              ) : (
                <span>
                  {item.room ? `${item.room} · ` : ''}
                  {item.title}
                </span>
              )}
              {onLinkThread ? (
                isLinked ? (
                  <button
                    type="button"
                    className="card-duplicate-warning__action is-linked"
                    onClick={() => onUnlinkThread?.()}
                    title="카드 연결을 취소합니다"
                  >
                    ✓ 연결됨 · 해제
                  </button>
                ) : (
                  <button
                    type="button"
                    className="card-duplicate-warning__action"
                    onClick={() => onLinkThread(item)}
                    title="저장하면 이 카드와 연계 카드로 묶입니다"
                  >
                    연계 카드로 연결
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {duplicates.length > 3 ? (
        <p className="card-duplicate-warning__more">외 {duplicates.length - 3}건</p>
      ) : null}
    </div>
  );
}
