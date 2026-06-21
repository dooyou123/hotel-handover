'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShiftBriefContent } from '@/components/handover/shift-brief-content';
import { cardSummaryLabel } from '@/lib/handover/activity';
import { fetchAmenityInventoryData } from '@/lib/amenity/api';
import { getStockStatus } from '@/lib/amenity/ui';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchHousekeepingReport } from '@/lib/housekeeping/api';
import {
  buildPrintDocumentHtml,
  buildSummaryText,
  downloadTextFile,
  getExportFilename,
  openSummaryPrintWindow,
} from '@/lib/handover/daily-summary';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import {
  fetchChecklistIncomplete,
  fetchTodayActivityLogs,
  fetchTodayShiftHandovers,
  logShiftHandover,
} from '@/lib/handover/use-activity-logs';
import type { ActivityLog, ShiftHandover } from '@/lib/handover/types';
import { createFollowUpCardFromReview } from '@/lib/reviews/follow-up-card';
import { filterPendingFollowUpReviews } from '@/lib/reviews/pending-follow-up';
import { useReviews } from '@/lib/reviews/use-reviews';
import { briefMemoToTodoInput } from '@/lib/todos/brief-memo';
import { useTodos } from '@/lib/todos/use-todos';
import type { Card, WorkSession } from '@/lib/handover/types';
import type { GuestReview } from '@/lib/reviews/types';
import type { HotelEvent } from '@/lib/events/types';
import { filterPendingTodayTaxi, filterTodayEvents, filterTodayTodos } from '@/lib/today/alerts';
import { todayDateString } from '@/lib/handover/shift-summary';
import type { Todo } from '@/lib/todos/types';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';

type HandoverShiftBriefProjectProps = {
  summary: ShiftSummaryData;
  todos: Todo[];
  events: HotelEvent[];
  session: WorkSession;
  authorLabel: string;
  requireSession: (action: string) => boolean;
  onAcknowledge: (cardId: string) => void | Promise<void>;
  onOpenCard: (card: Card) => void;
  onOpenTodo?: (todo: Todo) => void;
  onOpenEvent?: (event: HotelEvent) => void;
  onOpenRecords?: (tab: HandoverRecordsTab) => void;
  onToast: (message: string) => void;
};

export function HandoverShiftBriefProject({
  summary,
  todos,
  events,
  session,
  authorLabel,
  requireSession,
  onAcknowledge,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onOpenRecords,
  onToast,
}: HandoverShiftBriefProjectProps) {
  const queryClient = useQueryClient();
  const { reviews, isLoading: reviewsLoading, completeRoomAction } = useReviews();
  const { createTodo } = useTodos();
  const { data: todayTaxi = [], isLoading: taxiLoading } = useTodayTaxiBookings();

  const todayTodos = useMemo(() => filterTodayTodos(todos), [todos]);
  const todayEvents = useMemo(() => filterTodayEvents(events), [events]);
  const pendingTaxi = useMemo(() => filterPendingTodayTaxi(todayTaxi), [todayTaxi]);

  const { data: amenityData, isLoading: amenityLoading } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(DEFAULT_HOTEL_ID),
  });

  const { data: hkBundle } = useQuery({
    queryKey: ['housekeeping-report', DEFAULT_HOTEL_ID, todayDateString()],
    queryFn: () => fetchHousekeepingReport(todayDateString()),
  });

  const hkDayNotes = useMemo(() => {
    const report = hkBundle?.report;
    if (!report) return null;
    const previous = report.previous_day_notes?.trim() ?? '';
    const next = report.next_day_notes?.trim() ?? '';
    if (!previous && !next) return null;
    return { previous, next };
  }, [hkBundle]);

  const [checklist, setChecklist] = useState({ total: 0, incomplete: 0 });
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);
  const [reviewActionBusyId, setReviewActionBusyId] = useState<string | null>(null);
  const [briefMemoSaving, setBriefMemoSaving] = useState(false);
  const [savingHandover, setSavingHandover] = useState(false);
  const [todayLogs, setTodayLogs] = useState<ActivityLog[]>([]);
  const [todayShiftLogs, setTodayShiftLogs] = useState<ShiftHandover[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [exportingImage, setExportingImage] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const briefExtras = useMemo(
    () => ({ todayTodos, pendingTaxi, todayShiftLogs }),
    [todayTodos, pendingTaxi, todayShiftLogs],
  );

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

  useEffect(() => {
    setLogsLoading(true);
    Promise.all([fetchTodayActivityLogs(200), fetchTodayShiftHandovers(50)])
      .then(([logs, shiftLogs]) => {
        setTodayLogs(logs);
        setTodayShiftLogs(shiftLogs);
      })
      .catch(() => {
        setTodayLogs([]);
        setTodayShiftLogs([]);
      })
      .finally(() => setLogsLoading(false));
  }, [summary]);

  async function handleAcknowledge(cardId: string) {
    if (!requireSession('긴급 확인')) return;
    setAckBusyId(cardId);
    try {
      await onAcknowledge(cardId);
      onToast('긴급 확인이 기록되었습니다.');
    } catch {
      onToast('긴급 확인에 실패했습니다.');
    } finally {
      setAckBusyId(null);
    }
  }

  async function handleCompleteReviewAction(review: GuestReview) {
    if (!requireSession('조치 완료')) return;
    setReviewActionBusyId(review.id);
    try {
      await completeRoomAction.mutateAsync({ id: review.id, by: authorLabel });
      onToast('리뷰 조치 완료로 표시했습니다. 인계 목록에서 숨깁니다.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : '조치 완료 처리에 실패했습니다.');
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
      onToast(`오늘 할일에 추가했습니다. (${input.title})`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : '할일 저장에 실패했습니다.');
    } finally {
      setBriefMemoSaving(false);
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
      onToast(`인수인계 카드가 생성되었습니다. (${cardSummaryLabel('', review.guest_name || '리뷰 후속')})`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : '카드 생성에 실패했습니다.');
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
      await queryClient.invalidateQueries({ queryKey: ['shift-handovers', DEFAULT_HOTEL_ID] });
      const shiftLogs = await fetchTodayShiftHandovers(50);
      setTodayShiftLogs(shiftLogs);
      onToast(`${authorLabel} 교대 인수가 기록되었습니다.`);
    } catch {
      onToast('교대 기록에 실패했습니다.');
    } finally {
      setSavingHandover(false);
    }
  }

  const sessionReady = Boolean(session.group && session.name);

  function handleExportText() {
    downloadTextFile(buildSummaryText(summary, todayLogs, authorLabel, briefExtras), getExportFilename('txt'));
    onToast('텍스트 파일을 저장했습니다.');
  }

  function handleExportPrint() {
    const ok = openSummaryPrintWindow(summary, todayLogs, authorLabel, briefExtras);
    if (!ok) onToast('인쇄 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.');
  }

  async function handleExportImage() {
    if (!sheetRef.current) return;
    setExportingImage(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      sheetRef.current.innerHTML = buildPrintDocumentHtml(summary, todayLogs, authorLabel, briefExtras);
      sheetRef.current.classList.remove('hidden');
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = getExportFilename('png');
      link.href = canvas.toDataURL('image/png');
      link.click();
      onToast('이미지 파일을 저장했습니다.');
    } catch {
      onToast('이미지 저장에 실패했습니다.');
    } finally {
      sheetRef.current?.classList.add('hidden');
      if (sheetRef.current) sheetRef.current.innerHTML = '';
      setExportingImage(false);
    }
  }

  return (
    <>
    <ShiftBriefContent
      className="project-shift-brief"
      summary={summary}
      authorLabel={authorLabel}
      sessionReady={sessionReady}
      checklist={checklist}
      pendingNegativeReviews={pendingNegativeReviews}
      amenityAlerts={amenityAlerts}
      isLoading={reviewsLoading || amenityLoading}
      todayLogs={todayLogs}
      logsLoading={logsLoading}
      onExportText={handleExportText}
      onExportPrint={handleExportPrint}
      onExportImage={() => void handleExportImage()}
      exportingImage={exportingImage}
      ackBusyId={ackBusyId}
      followUpBusyId={followUpBusyId}
      reviewActionBusyId={reviewActionBusyId}
      briefMemoSaving={briefMemoSaving}
      savingHandover={savingHandover}
      onAcknowledge={(cardId) => void handleAcknowledge(cardId)}
      onFollowUp={(review) => void handleFollowUp(review)}
      onCompleteReviewAction={(review) => void handleCompleteReviewAction(review)}
      onSaveBriefMemo={(text) => handleSaveBriefMemo(text)}
      onLogShiftStart={() => void handleLogShiftStart()}
      onOpenCard={onOpenCard}
      todayTodos={todayTodos}
      todayEvents={todayEvents}
      pendingTaxi={pendingTaxi}
      taxiLoading={taxiLoading}
      onOpenTodo={onOpenTodo}
      onOpenEvent={onOpenEvent}
      hkDayNotes={hkDayNotes}
      todayShiftLogs={todayShiftLogs}
      shiftLogsLoading={logsLoading}
      onOpenShiftHistory={onOpenRecords ? () => onOpenRecords('shift') : undefined}
      onOpenActivityLog={onOpenRecords ? () => onOpenRecords('activity') : undefined}
      showFooter={false}
    />
    <div ref={sheetRef} className="export-sheet hidden" aria-hidden />
    </>
  );
}
