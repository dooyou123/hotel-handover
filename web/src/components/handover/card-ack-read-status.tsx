'use client';

import { useState } from 'react';
import {
  cardAckSummary,
  hasStaffAckedCard,
  isTeamAckPending,
} from '@/lib/handover/card-acks';
import type { Card } from '@/lib/handover/types';

type CardAckReadStatusProps = {
  card: Card;
  activeStaffNames: string[];
  currentStaffName: string;
  variant?: 'full' | 'compact';
  onAcknowledge?: () => void;
  onMarkDone?: () => void;
  acknowledging?: boolean;
};

export function CardAckReadStatus({
  card,
  activeStaffNames,
  currentStaffName,
  variant = 'full',
  onAcknowledge,
  onMarkDone,
  acknowledging = false,
}: CardAckReadStatusProps) {
  const [open, setOpen] = useState(variant === 'full');

  if (!activeStaffNames.length || card.priority !== 'urgent' || card.column_id === 'done') {
    return null;
  }

  const { read, unread } = cardAckSummary(card, activeStaffNames);
  const mineAcked = hasStaffAckedCard(card, currentStaffName);
  const teamPending = isTeamAckPending(card, activeStaffNames);
  const allRead = !teamPending;

  const toggle = (
    <button
      type="button"
      className={`card-ack-status__toggle${unread.length ? ' card-ack-status__toggle--pending' : ''}`}
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
    >
      <span className="card-ack-status__count">
        긴급 확인 {read.length}/{activeStaffNames.length}
      </span>
      {mineAcked ? <span className="card-ack-status__mine">내 확인 완료</span> : null}
      <span className="card-ack-status__chevron" aria-hidden>
        {open ? '▴' : '▾'}
      </span>
    </button>
  );

  const nameLists = open ? (
    <div className="card-ack-status__lists">
      {unread.length ? (
        <p className="card-ack-status__unread">
          <span className="card-ack-status__label">미확인</span>
          <span className="card-ack-status__chips">
            {unread.map((name) => (
              <span key={name} className="card-ack-status__chip card-ack-status__chip--unread">
                {name}
              </span>
            ))}
          </span>
        </p>
      ) : null}
      {read.length ? (
        <p className="card-ack-status__read">
          <span className="card-ack-status__label">확인</span>
          <span className="card-ack-status__chips">
            {read.map((name) => (
              <span key={name} className="card-ack-status__chip card-ack-status__chip--read">
                {name}
              </span>
            ))}
          </span>
        </p>
      ) : null}
    </div>
  ) : unread.length ? (
    <p className="card-ack-status__hint">
      미확인 <strong>{unread.join(', ')}</strong>
    </p>
  ) : null;

  const actions = (
    <div className="card-ack-status__actions">
      {!mineAcked && onAcknowledge ? (
        <button
          type="button"
          className="btn btn--primary btn--small card-ack-status__ack-btn"
          onClick={onAcknowledge}
          disabled={acknowledging}
        >
          {acknowledging ? '확인 중…' : '내 확인'}
        </button>
      ) : null}
      {allRead && onMarkDone ? (
        <button type="button" className="btn btn--small card-ack-status__done-btn" onClick={onMarkDone}>
          완료 처리
        </button>
      ) : null}
    </div>
  );

  if (variant === 'compact') {
    return (
      <div
        className={`card-ack-status card-ack-status--compact${teamPending ? ' card-ack-status--pending' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        {toggle}
        {nameLists}
        {!mineAcked && onAcknowledge ? (
          <button
            type="button"
            className="card-ack-status__ack-inline"
            onClick={onAcknowledge}
            disabled={acknowledging}
          >
            확인
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className={`card-ack-status${teamPending ? ' card-ack-status--pending' : ' card-ack-status--done'}`}>
      {toggle}
      {nameLists}
      {allRead ? (
        <p className="card-ack-status__done-msg">전원 확인했습니다. 완료 처리하면 목록에서 사라집니다.</p>
      ) : (
        <p className="card-ack-status__prompt">미확인 직원은 「내 확인」을 눌러 주세요.</p>
      )}
      {actions}
    </section>
  );
}
