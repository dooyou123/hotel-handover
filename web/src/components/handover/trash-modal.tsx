'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatRelativeTime } from '@/lib/handover/card-utils';
import { useTrashedCards } from '@/lib/handover/use-cards';
import type { Card } from '@/lib/handover/types';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

/**
 * 휴지통 창 — 윈도우 휴지통처럼 삭제된 카드를 모아 보여주고,
 * 항목별 복원·영구 삭제와 「휴지통 비우기」를 제공한다.
 */

export const TRASH_RETENTION_DAYS = 30;

function trashDaysLeft(deletedAt: string | null | undefined): number {
  const deletedTime = deletedAt ? Date.parse(deletedAt) : Number.NaN;
  if (Number.isNaN(deletedTime)) return TRASH_RETENTION_DAYS;
  const elapsedDays = Math.floor((Date.now() - deletedTime) / 86_400_000);
  return Math.max(0, TRASH_RETENTION_DAYS - elapsedDays);
}

type TrashModalProps = {
  open: boolean;
  isManager: boolean;
  onClose: () => void;
  onRestore: (card: Card) => Promise<void>;
  /** 영구 삭제 — 확인창까지 포함해 호출한 쪽에서 처리한다 */
  onHardDelete: (cards: Card[]) => Promise<void>;
};

export function TrashModal({ open, isManager, onClose, onRestore, onHardDelete }: TrashModalProps) {
  const { data, isLoading } = useTrashedCards(open);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cards = data?.cards ?? [];

  if (!open) return null;

  async function run(id: string, task: () => Promise<void>) {
    if (busyId) return;
    setBusyId(id);
    try {
      await task();
    } finally {
      setBusyId(null);
    }
  }

  const dialog = (
    <div className="modal-overlay modal-overlay--records" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal trash-window" onClick={(event) => event.stopPropagation()}>
        <div className="trash-window__titlebar">
          <span className="trash-window__title">
            <span aria-hidden>🗑️</span> 휴지통
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="trash-window__toolbar">
          <span className="trash-window__summary">
            {cards.length
              ? `${cards.length}개 항목 · 삭제 후 ${TRASH_RETENTION_DAYS}일이 지나면 자동으로 완전히 삭제됩니다.`
              : `삭제한 인수인계가 ${TRASH_RETENTION_DAYS}일간 보관되는 곳입니다.`}
          </span>
          {isManager && cards.length ? (
            <button
              type="button"
              className="btn btn--ghost btn--small trash-window__empty-btn"
              disabled={busyId !== null}
              onClick={() => void run('__all__', () => onHardDelete(cards))}
            >
              {busyId === '__all__' ? '비우는 중…' : '휴지통 비우기'}
            </button>
          ) : null}
        </div>

        <div className="trash-window__body">
          {isLoading ? (
            <p className="trash-window__status">불러오는 중…</p>
          ) : data?.schemaMissing ? (
            <p className="trash-window__status">
              휴지통을 쓰려면 DB 마이그레이션 <code>102_cards_trash.sql</code> 적용이 필요합니다.
            </p>
          ) : cards.length ? (
            <ul className="trash-window__list">
              {cards.map((card) => {
                const deletedTime = card.deleted_at ? formatRelativeTime(card.deleted_at) : null;
                const daysLeft = trashDaysLeft(card.deleted_at);
                const expanded = expandedId === card.id;
                const comments = card.card_comments.filter((comment) => !comment.deleted_at);
                return (
                  <li key={card.id} className={`trash-window__item${expanded ? ' is-open' : ''}`}>
                    <div className="trash-window__row">
                      <span className="trash-window__item-icon" aria-hidden>
                        📄
                      </span>
                      <button
                        type="button"
                        className="trash-window__item-main"
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : card.id)}
                      >
                        <p className="trash-window__item-title">
                          {card.handover_no ? `#${card.handover_no} ` : ''}
                          {card.room.trim() ? `[${card.room.trim()}] ` : ''}
                          {card.title}
                        </p>
                        <p className="trash-window__item-meta">
                          {card.deleted_by ? `${card.deleted_by} 삭제` : '삭제'}
                          {deletedTime ? (
                            <>
                              {' · '}
                              <time dateTime={deletedTime.iso} title={deletedTime.title}>
                                {deletedTime.label}
                              </time>
                            </>
                          ) : null}
                          <span className={`trash-window__days${daysLeft <= 5 ? ' is-soon' : ''}`}>
                            {' · '}
                            {daysLeft}일 뒤 자동 삭제
                          </span>
                        </p>
                      </button>
                      <span className="trash-window__chevron" aria-hidden>
                        {expanded ? '▾' : '▸'}
                      </span>
                      <div className="trash-window__item-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          disabled={busyId !== null}
                          onClick={() => void run(card.id, () => onRestore(card))}
                        >
                          {busyId === card.id ? '복원 중…' : '복원'}
                        </button>
                        {isManager ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small trash-window__purge-btn"
                            disabled={busyId !== null}
                            onClick={() => void run(`purge-${card.id}`, () => onHardDelete([card]))}
                          >
                            {busyId === `purge-${card.id}` ? '삭제 중…' : '영구 삭제'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {expanded ? (
                      <div className="trash-window__detail">
                        <p className="trash-window__detail-meta">
                          {card.author ? `작성 ${card.author}` : null}
                          {card.author && card.created_at ? ' · ' : null}
                          {card.created_at
                            ? new Date(card.created_at).toLocaleDateString('ko-KR', {
                                month: 'long',
                                day: 'numeric',
                              })
                            : null}
                          {card.category ? ` · ${card.category}` : null}
                          {card.card_attachments.length
                            ? ` · 사진 ${card.card_attachments.length}장`
                            : null}
                        </p>
                        {card.details.trim() ? (
                          <div className="trash-window__detail-block">
                            <span className="trash-window__detail-label">상세</span>
                            <p className="trash-window__detail-text">{card.details.trim()}</p>
                          </div>
                        ) : null}
                        {card.resolution.trim() ? (
                          <div className="trash-window__detail-block">
                            <span className="trash-window__detail-label">처리 결과</span>
                            <p className="trash-window__detail-text">{card.resolution.trim()}</p>
                          </div>
                        ) : null}
                        {card.next_action.trim() ? (
                          <div className="trash-window__detail-block">
                            <span className="trash-window__detail-label">다음 조치</span>
                            <p className="trash-window__detail-text">{card.next_action.trim()}</p>
                          </div>
                        ) : null}
                        {comments.length ? (
                          <div className="trash-window__detail-block">
                            <span className="trash-window__detail-label">댓글 {comments.length}개</span>
                            <ul className="trash-window__detail-comments">
                              {comments.map((comment) => (
                                <li key={comment.id}>
                                  <strong>{comment.staff_name}</strong> {comment.content}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {!card.details.trim() &&
                        !card.resolution.trim() &&
                        !card.next_action.trim() &&
                        !comments.length ? (
                          <p className="trash-window__detail-text trash-window__detail-text--empty">
                            추가로 기록된 내용이 없습니다.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="trash-window__empty">
              <span className="trash-window__empty-icon" aria-hidden>
                🗑️
              </span>
              <p>휴지통이 비어 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : null;
}
