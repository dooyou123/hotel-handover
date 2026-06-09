'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cardSummaryLabel } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import { fetchAmenityInventoryData } from '@/lib/amenity/api';
import { getStockStatus } from '@/lib/amenity/ui';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  buildShiftSummaryData,
  cardStatusLabel,
  getTodayLabel,
} from '@/lib/handover/shift-summary';
import { fetchChecklistIncomplete, logShiftHandover } from '@/lib/handover/use-activity-logs';
import { useCards } from '@/lib/handover/use-cards';
import { useNotices } from '@/lib/handover/use-notices';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createFollowUpCardFromReview } from '@/lib/reviews/follow-up-card';
import { useReviews } from '@/lib/reviews/use-reviews';
import type { Card, Notice } from '@/lib/handover/types';
import type { GuestReview } from '@/lib/reviews/types';

function BriefCardItem({
  card,
  warn,
  onAcknowledge,
  ackBusy,
}: {
  card: Card;
  warn?: boolean;
  onAcknowledge?: () => void;
  ackBusy?: boolean;
}) {
  const unacked = warn && !card.card_acknowledgments?.length;
  return (
    <article className={`brief-item${warn ? ' brief-item--warn' : ''}`}>
      <div className="brief-item__top">
        <span className="brief-item__status">{cardStatusLabel(card)}</span>
        {card.room ? <span className="brief-item__room">{card.room}</span> : null}
        {unacked && onAcknowledge ? (
          <button
            type="button"
            className="btn btn--danger btn--xs"
            disabled={ackBusy}
            onClick={onAcknowledge}
          >
            {ackBusy ? '…' : '긴급 확인'}
          </button>
        ) : null}
      </div>
      <p className="brief-item__title">{card.title}</p>
      {card.next_action ? <p className="brief-item__sub">다음: {card.next_action}</p> : null}
      {card.details ? <p className="brief-item__detail">{card.details}</p> : null}
      <p className="brief-item__meta">
        {card.author || '—'} · {formatTime(card.updated_at || card.created_at)}
      </p>
    </article>
  );
}

function BriefNoticeItem({ notice }: { notice: Notice }) {
  return (
    <article className="brief-item">
      <p className="brief-item__title">{notice.content}</p>
      <p className="brief-item__meta">
        {notice.author || '—'} · {formatTime(notice.updated_at || notice.created_at)}
      </p>
    </article>
  );
}

function BriefReviewItem({
  review,
  busy,
  onFollowUp,
}: {
  review: GuestReview;
  busy: boolean;
  onFollowUp: () => void;
}) {
  return (
    <article className="brief-item brief-item--warn">
      <div className="brief-item__top">
        <span className="brief-item__status">나쁜 리뷰</span>
        {review.guest_name ? <span className="brief-item__room">{review.guest_name}</span> : null}
      </div>
      <p className="brief-item__title">{review.content_ko}</p>
      <p className="brief-item__meta">{formatTime(review.created_at)}</p>
      <button type="button" className="btn btn--outline btn--xs" disabled={busy} onClick={onFollowUp}>
        {busy ? '…' : '인수인계 카드 만들기'}
      </button>
    </article>
  );
}

export function ShiftBriefPageClient() {
  const queryClient = useQueryClient();
  const { session, requireSession, authorLabel } = useWorkSession();
  const { cards, isLoading: cardsLoading, acknowledgeCard } = useCards();
  const { notices, isLoading: noticesLoading } = useNotices();
  const { reviews, isLoading: reviewsLoading } = useReviews();

  const { data: amenityData } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(DEFAULT_HOTEL_ID),
  });

  const [checklist, setChecklist] = useState({ total: 0, incomplete: 0 });
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);
  const [savingHandover, setSavingHandover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const summary = useMemo(() => buildShiftSummaryData(cards, notices), [cards, notices]);

  const amenityAlerts = useMemo(() => {
    const items = amenityData?.items ?? [];
    return items
      .filter((item) => {
        const status = getStockStatus(item.quantity, item.box_size ?? 0);
        return status === 'empty' || status === 'critical' || status === 'low';
      })
      .slice(0, 8);
  }, [amenityData]);

  const pendingNegativeReviews = useMemo(() => {
    const cutoff = Date.now() - 14 * 86_400_000;
    return reviews.filter(
      (review) =>
        review.sentiment === 'negative' &&
        !review.follow_up_card_id &&
        new Date(review.created_at).getTime() >= cutoff,
    );
  }, [reviews]);

  const loadChecklist = useCallback(async () => {
    if (!session.group) {
      setChecklist({ total: 0, incomplete: 0 });
      return;
    }
    const shift = session.shift || session.group;
    setChecklist(await fetchChecklistIncomplete(shift, session.group));
  }, [session.shift, session.group]);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleAcknowledge(cardId: string) {
    if (!requireSession('긴급 확인')) return;
    setAckBusyId(cardId);
    try {
      await acknowledgeCard.mutateAsync({
        cardId,
        shift: session.shift,
        staffName: session.name,
      });
      showToast('긴급 확인이 기록되었습니다.');
    } catch {
      showToast('긴급 확인에 실패했습니다.');
    } finally {
      setAckBusyId(null);
    }
  }

  async function handleFollowUp(review: GuestReview) {
    if (!requireSession('인수인계 카드 만들기')) return;
    setFollowUpBusyId(review.id);
    try {
      await createFollowUpCardFromReview({
        review,
        author: authorLabel,
        shift: session.shift,
        name: session.name,
      });
      await queryClient.invalidateQueries({ queryKey: ['guest-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast(`인수인계 카드가 생성되었습니다. (${cardSummaryLabel('', review.guest_name || '리뷰 후속')})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '카드 생성에 실패했습니다.');
    } finally {
      setFollowUpBusyId(null);
    }
  }

  async function handleLogShiftStart() {
    if (!requireSession('교대 인수 기록')) return;
    setSavingHandover(true);
    try {
      await logShiftHandover({
        shift: session.shift,
        staffName: session.name,
        handoverType: 'start',
        unackedUrgent: summary.unackedUrgent.length,
        urgentCount: summary.urgentActive.length,
        progressCount: summary.progressActive.length,
        todayCount: summary.todayCards.length,
        checklistIncomplete: checklist.incomplete,
        progressRemaining: summary.progressActive.length,
      });
      showToast(`${authorLabel} 교대 인수가 기록되었습니다.`);
    } catch {
      showToast('교대 기록에 실패했습니다.');
    } finally {
      setSavingHandover(false);
    }
  }

  const isLoading = cardsLoading || noticesLoading || reviewsLoading;
  const ready = Boolean(session.group && session.name);

  return (
    <div className="shift-brief">
      <header className="shift-brief__header">
        <div>
          <h1>교대 인계</h1>
          <p>
            {getTodayLabel()} · {authorLabel || '근무자 미선택'} ·{' '}
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="shift-brief__actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
            인쇄
          </button>
          <Link href="/handover" className="btn btn--outline btn--small" target="_blank" rel="noreferrer">
            인수인계 보드
          </Link>
        </div>
      </header>

      {!ready ? (
        <p className="shift-brief__hint">메인 창 상단에서 교대 · 조 · 담당자를 설정한 뒤 이 화면을 새로고침하세요.</p>
      ) : null}

      <div className="shift-brief__chips">
        <span className={`brief-chip${summary.unackedUrgent.length ? ' brief-chip--alert' : ''}`}>
          미확인 긴급 <strong>{summary.unackedUrgent.length}</strong>
        </span>
        <span className="brief-chip">
          긴급 <strong>{summary.urgentActive.length}</strong>
        </span>
        <span className="brief-chip">
          진행중 <strong>{summary.progressActive.length}</strong>
        </span>
        <span className={`brief-chip${checklist.incomplete ? ' brief-chip--warn' : ''}`}>
          체크리스트 미완료 <strong>{checklist.incomplete}</strong>
        </span>
        <span className={`brief-chip${pendingNegativeReviews.length ? ' brief-chip--warn' : ''}`}>
          후속 리뷰 <strong>{pendingNegativeReviews.length}</strong>
        </span>
        <span className={`brief-chip${amenityAlerts.length ? ' brief-chip--warn' : ''}`}>
          어메니티 부족 <strong>{amenityAlerts.length}</strong>
        </span>
      </div>

      {isLoading ? (
        <p className="empty-state">인계 내용을 불러오는 중…</p>
      ) : (
        <div className="shift-brief__sections">
          {summary.unackedUrgent.length ? (
            <section className="brief-section brief-section--alert">
              <h2>미확인 긴급 ({summary.unackedUrgent.length})</h2>
              <div className="brief-section__list">
                {summary.unackedUrgent.map((card) => (
                  <BriefCardItem
                    key={card.id}
                    card={card}
                    warn
                    ackBusy={ackBusyId === card.id}
                    onAcknowledge={() => void handleAcknowledge(card.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {summary.urgentActive.length ? (
            <section className="brief-section">
              <h2>현재 긴급 ({summary.urgentActive.length})</h2>
              <div className="brief-section__list">
                {summary.urgentActive.map((card) => (
                  <BriefCardItem key={card.id} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          {summary.progressActive.length ? (
            <section className="brief-section">
              <h2>진행중 ({summary.progressActive.length})</h2>
              <div className="brief-section__list">
                {summary.progressActive.map((card) => (
                  <BriefCardItem key={card.id} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          {summary.pinnedAnnouncements.length ? (
            <section className="brief-section">
              <h2>고정 공지 ({summary.pinnedAnnouncements.length})</h2>
              <div className="brief-section__list">
                {summary.pinnedAnnouncements.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </div>
            </section>
          ) : null}

          {summary.changes.length ? (
            <section className="brief-section">
              <h2>업무 변경 ({summary.changes.length})</h2>
              <div className="brief-section__list">
                {summary.changes.map((notice) => (
                  <BriefNoticeItem key={notice.id} notice={notice} />
                ))}
              </div>
            </section>
          ) : null}

          {pendingNegativeReviews.length ? (
            <section className="brief-section brief-section--warn">
              <h2>후속 필요 리뷰 ({pendingNegativeReviews.length})</h2>
              <div className="brief-section__list">
                {pendingNegativeReviews.map((review) => (
                  <BriefReviewItem
                    key={review.id}
                    review={review}
                    busy={followUpBusyId === review.id}
                    onFollowUp={() => void handleFollowUp(review)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {amenityAlerts.length ? (
            <section className="brief-section">
              <h2>어메니티 부족·품절 ({amenityAlerts.length})</h2>
              <div className="brief-section__list">
                {amenityAlerts.map((item) => (
                  <article key={item.id} className="brief-item">
                    <p className="brief-item__title">{item.name}</p>
                    <p className="brief-item__sub">
                      재고 {item.quantity.toLocaleString()}개 · 30일 사용 {item.monthlyUsage.toLocaleString()}개
                      {item.orderBoxes > 0 ? ` · 발주 권장 ${item.orderBoxes}박스` : ''}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {!summary.unackedUrgent.length &&
          !summary.urgentActive.length &&
          !summary.progressActive.length &&
          !summary.pinnedAnnouncements.length &&
          !summary.changes.length &&
          !pendingNegativeReviews.length &&
          !amenityAlerts.length ? (
            <p className="empty-state">현재 인계할 특이 사항이 없습니다.</p>
          ) : null}
        </div>
      )}

      <footer className="shift-brief__footer">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!ready || savingHandover}
          onClick={() => void handleLogShiftStart()}
        >
          {savingHandover ? '기록 중…' : '교대 인수 기록'}
        </button>
      </footer>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
