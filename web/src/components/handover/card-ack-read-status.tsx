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
  hidePersonalCta?: boolean;
  onAcknowledge?: () => void;
  onMarkDone?: () => void;
  acknowledging?: boolean;
};

export function CardAckReadStatus({
  card,
  activeStaffNames,
  currentStaffName,
  variant = 'full',
  hidePersonalCta = false,
  onAcknowledge,
  onMarkDone,
  acknowledging = false,
}: CardAckReadStatusProps) {
  const [open, setOpen] = useState(variant === 'full');

  if (!activeStaffNames.length || card.priority !== 'urgent' || card.column_id === 'done') {
    return null;
  }

  const { read, unread } = cardAckSummary(card, activeStaffNames);
  const needsMyAck = !hasStaffAckedCard(card, currentStaffName);
  const teamPending = isTeamAckPending(card, activeStaffNames);
  const allRead = !teamPending;

  const stateClass = needsMyAck
    ? 'card-ack-status--needs-me'
    : allRead
      ? 'card-ack-status--done'
      : 'card-ack-status--waiting-others';

  const displayName = currentStaffName.trim() || '담당자';

  const ackButton = onAcknowledge ? (
    <button
      type="button"
      className="card-ack-status__ack-btn"
      onClick={onAcknowledge}
      disabled={acknowledging}
    >
      {acknowledging ? '확인 중…' : '지금 확인'}
    </button>
  ) : null;

  const needsMyAckCta = (
    <div className="card-ack-status__cta">
      <p className="card-ack-status__cta-text">
        <strong>이 카드를 먼저 확인해 주세요.</strong>
        <span className="card-ack-status__cta-sub">
          (
          <strong className="card-ack-status__cta-name">{displayName}</strong>
          님이 먼저 확인해야 할 긴급 내용입니다.)
        </span>
      </p>
      {ackButton}
    </div>
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
          <span className="card-ack-status__label">확인함</span>
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
  ) : null;

  const rosterToggle = (
    <button
      type="button"
      className="card-ack-status__toggle"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
    >
      <span className="card-ack-status__count">
        확인 {read.length}/{activeStaffNames.length}
        {unread.length ? ` · 미확인 ${unread.length}명` : ''}
      </span>
      <span className="card-ack-status__chevron" aria-hidden>
        {open ? '접기' : '명단 보기'}
      </span>
    </button>
  );

  if (variant === 'compact') {
    return (
      <div
        className={`card-ack-status card-ack-status--compact ${stateClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        {needsMyAck && !hidePersonalCta ? needsMyAckCta : null}
        {!needsMyAck ? (
          <p className="card-ack-status__mine-done">
            <span className="card-ack-status__mine-badge">내 확인 완료</span>
            {unread.length ? (
              <span className="card-ack-status__waiting-text">동료 {unread.length}명 확인 대기</span>
            ) : null}
          </p>
        ) : null}
        {rosterToggle}
        {nameLists}
      </div>
    );
  }

  return (
    <section className={`card-ack-status ${stateClass}`}>
      {needsMyAck && !hidePersonalCta ? needsMyAckCta : null}
      {!needsMyAck ? (
        <p className="card-ack-status__mine-done">
          <span className="card-ack-status__mine-badge">내 확인 완료</span>
          {unread.length ? (
            <span className="card-ack-status__waiting-text">동료 {unread.length}명이 아직 확인하지 않았습니다.</span>
          ) : null}
        </p>
      ) : null}
      {rosterToggle}
      {nameLists}
      {allRead ? (
        <p className="card-ack-status__done-msg">전원 확인했습니다. 완료 처리하면 목록에서 사라집니다.</p>
      ) : null}
      {allRead && onMarkDone ? (
        <div className="card-ack-status__actions">
          <button type="button" className="btn btn--small card-ack-status__done-btn" onClick={onMarkDone}>
            완료 처리
          </button>
        </div>
      ) : null}
    </section>
  );
}
