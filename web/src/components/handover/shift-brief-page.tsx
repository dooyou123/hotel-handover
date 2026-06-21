'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShiftBriefContent } from '@/components/handover/shift-brief-content';
import { cardSummaryLabel } from '@/lib/handover/activity';
import { fetchAmenityInventoryData } from '@/lib/amenity/api';
import { getStockStatus } from '@/lib/amenity/ui';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { fetchChecklistIncomplete, logShiftHandover, useTodayActivityLogs, useTodayShiftHandovers } from '@/lib/handover/use-activity-logs';
import { openSummaryPrintWindow } from '@/lib/handover/daily-summary';
import { useCards } from '@/lib/handover/use-cards';
import { useNotices } from '@/lib/handover/use-notices';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createFollowUpCardFromReview } from '@/lib/reviews/follow-up-card';
import { filterPendingFollowUpReviews } from '@/lib/reviews/pending-follow-up';
import { useReviews } from '@/lib/reviews/use-reviews';
import { briefMemoToTodoInput } from '@/lib/todos/brief-memo';
import { useMonthEvents } from '@/lib/events/use-events';
import { filterPendingTodayTaxi, filterTodayEvents, filterTodayTodos } from '@/lib/today/alerts';
import { useTodos } from '@/lib/todos/use-todos';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';

export function ShiftBriefPageClient() {
  const queryClient = useQueryClient();
  const { session, requireSession, authorLabel } = useWorkSession();
  const { cards, isLoading: cardsLoading, acknowledgeCard } = useCards();
  const { notices, isLoading: noticesLoading } = useNotices();
  const { reviews, isLoading: reviewsLoading, completeRoomAction } = useReviews();
  const { todos, isLoading: todosLoading, createTodo } = useTodos();
  const { data: todayTaxi = [], isLoading: taxiLoading } = useTodayTaxiBookings();
  const { data: todayShiftLogs = [], isLoading: shiftLogsLoading } = useTodayShiftHandovers();
  const { data: todayLogs = [] } = useTodayActivityLogs(200);

  const month = new Date().toISOString().slice(0, 7);
  const { events } = useMonthEvents(month);
  const todayTodos = useMemo(() => filterTodayTodos(todos), [todos]);
  const todayEvents = useMemo(() => filterTodayEvents(events), [events]);
  const pendingTaxi = useMemo(() => filterPendingTodayTaxi(todayTaxi), [todayTaxi]);

  const { data: amenityData } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(DEFAULT_HOTEL_ID),
  });

  const [checklist, setChecklist] = useState({ total: 0, incomplete: 0 });
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);
  const [reviewActionBusyId, setReviewActionBusyId] = useState<string | null>(null);
  const [briefMemoSaving, setBriefMemoSaving] = useState(false);
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
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        monthlyUsage: item.monthlyUsage,
        orderBoxes: item.orderBoxes,
      }));
  }, [amenityData]);

  const pendingNegativeReviews = useMemo(() => filterPendingFollowUpReviews(reviews), [reviews]);

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

  async function handleCompleteReviewAction(
    review: Parameters<typeof createFollowUpCardFromReview>[0]['review'],
    note: string,
  ) {
    if (!requireSession('조치 완료')) return;
    setReviewActionBusyId(review.id);
    try {
      await completeRoomAction.mutateAsync({ id: review.id, by: authorLabel, note });
      showToast('리뷰 조치 완료로 표시했습니다. 인계 목록에서 숨깁니다.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '조치 완료 처리에 실패했습니다.');
    } finally {
      setReviewActionBusyId(null);
    }
  }

  async function handleSaveBriefMemo(text: string) {
    if (!requireSession('오늘 할일 저장')) return;
    setBriefMemoSaving(true);
    try {
      const input = briefMemoToTodoInput(text, {
        author: authorLabel,
        assigneeName: session.name,
        assigneeShift: session.shift || session.group,
      });
      await createTodo.mutateAsync(input);
      showToast(`오늘 할일에 추가했습니다. (${input.title})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '할일 저장에 실패했습니다.');
    } finally {
      setBriefMemoSaving(false);
    }
  }

  async function handleFollowUp(review: Parameters<typeof createFollowUpCardFromReview>[0]['review']) {
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
      await queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      showToast(`${authorLabel} 교대 인수가 기록되었습니다.`);
    } catch {
      showToast('교대 기록에 실패했습니다.');
    } finally {
      setSavingHandover(false);
    }
  }

  const briefExtras = useMemo(
    () => ({ todayTodos, pendingTaxi, todayShiftLogs }),
    [todayTodos, pendingTaxi, todayShiftLogs],
  );

  function handleExportPrint() {
    const ok = openSummaryPrintWindow(summary, todayLogs, authorLabel, briefExtras);
    if (!ok) showToast('인쇄 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.');
  }

  const isLoading = cardsLoading || noticesLoading || reviewsLoading || todosLoading;
  const sessionReady = Boolean(session.group && session.name);

  return (
    <div className="brief-shell">
      <ShiftBriefContent
        summary={summary}
        authorLabel={authorLabel}
        sessionReady={sessionReady}
        checklist={checklist}
        pendingNegativeReviews={pendingNegativeReviews}
        amenityAlerts={amenityAlerts}
        isLoading={isLoading}
        ackBusyId={ackBusyId}
        followUpBusyId={followUpBusyId}
        reviewActionBusyId={reviewActionBusyId}
        briefMemoSaving={briefMemoSaving}
        savingHandover={savingHandover}
        onAcknowledge={(cardId) => void handleAcknowledge(cardId)}
        onFollowUp={(review) => void handleFollowUp(review)}
        onCompleteReviewAction={(review, note) => handleCompleteReviewAction(review, note)}
        onSaveBriefMemo={(text) => handleSaveBriefMemo(text)}
        onLogShiftStart={() => void handleLogShiftStart()}
        todayTodos={todayTodos}
        todayEvents={todayEvents}
        pendingTaxi={pendingTaxi}
        taxiLoading={taxiLoading}
        todayShiftLogs={todayShiftLogs}
        shiftLogsLoading={shiftLogsLoading}
        onExportPrint={handleExportPrint}
      />
      <div className="shift-brief__actions shift-brief__actions--standalone">
        <Link href="/handover" className="btn btn--outline btn--small">
          인수인계 보드
        </Link>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
