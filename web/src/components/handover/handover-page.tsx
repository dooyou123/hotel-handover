'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { cardSummaryLabel, logActivity } from '@/lib/handover/activity';
import { EMPTY_COMPLAINT_REMEDIES } from '@/lib/handover/complaint-remedies';
import { filterCards, isArchivedCard, CARD_SNOOZE_MS, isCardDueActive, needsComplaintFirstResponse, buildDuplicateCardInput } from '@/lib/handover/card-utils';
import { formatSupabaseClientError } from '@/lib/supabase/env';
import { cardInputFromNotice } from '@/lib/handover/notice-to-card';
import { buildShiftSummaryData, todayDateString } from '@/lib/handover/shift-summary';
import { useNotices } from '@/lib/handover/use-notices';
import { useArchivedCards, useCards, useCurrentUserId, useIsManager } from '@/lib/handover/use-cards';
import { fetchChecklistIncomplete, logShiftHandover } from '@/lib/handover/use-activity-logs';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type {
  Card,
  CardAttachment,
  CardInput,
  HandoverViewMode,
  Priority,
  QuickFilter,
} from '@/lib/handover/types';
import { useMonthEvents } from '@/lib/events/use-events';
import type { HotelEvent, HotelEventInput } from '@/lib/events/types';
import { buildTodayAlerts, filterTodayEvents, filterTodayTodos } from '@/lib/today/alerts';
import { consumeHkHandoverDraft } from '@/lib/housekeeping/handover-draft';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';
import type { Todo, TodoInput, TodoPriority } from '@/lib/todos/types';
import { useTodos } from '@/lib/todos/use-todos';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { EventModal } from '@/components/schedule/event-modal';
import { TodoModal } from '@/components/todos/todo-modal';
import { HandoverRecordsModal } from './handover-records-modal';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import { CardModal } from './card-modal';
import { ShiftHandoverModal } from './shift-handover-modal';
import { ShiftStartConfirmModal } from './shift-start-confirm-modal';
import { HandoverWorkspaceProject } from './project/handover-workspace-project';

function cardPriorityToTodo(priority: Priority): TodoPriority {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'today') return 'normal';
  return 'low';
}

function todoPriorityToCard(priority: TodoPriority): Priority {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'normal') return 'today';
  return 'info';
}

export function HandoverPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const {
    cards,
    isLoading,
    error,
    createCard,
    updateCard,
    deleteCard,
    acknowledgeCard,
    addComment,
    updateComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
    archiveDone,
    archiveCardsByIds,
    restoreFromArchive,
  } = useCards();
  const {
    data: archivedCards = [],
    isLoading: archivedLoading,
    refetch: refetchArchived,
  } = useArchivedCards();
  const { notices } = useNotices();
  function refreshActivityLogs() {
    void queryClient.invalidateQueries({ queryKey: ['activity-logs', DEFAULT_HOTEL_ID] });
  }
  const { data: isManager = false } = useIsManager();
  const { data: currentUserId = null } = useCurrentUserId();
  const { session, requireSession, authorLabel } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const { todos, createTodo: createTodoMutation, updateTodo: updateTodoMutation, toggleTodo: toggleTodoMutation } =
    useTodos();
  const { data: todayTaxi = [] } = useTodayTaxiBookings();
  const currentMonth = todayDateString().slice(0, 7);
  const {
    events,
    createEvent: createEventMutation,
    updateEvent: updateEventMutation,
  } = useMonthEvents(currentMonth);
  const [viewMode, setViewMode] = useState<HandoverViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [cardModalView, setCardModalView] = useState<'full' | 'comments'>('full');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [createDraft, setCreateDraft] = useState<CardInput | null>(null);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);
  const [shiftStartConfirmOpen, setShiftStartConfirmOpen] = useState(false);
  const [shiftStartSaving, setShiftStartSaving] = useState(false);
  const [shiftEndModalOpen, setShiftEndModalOpen] = useState(false);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [recordsModalTab, setRecordsModalTab] = useState<HandoverRecordsTab>('shift');
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  useEffect(() => {
    const cardId = searchParams.get('card');
    if (!cardId || isLoading) return;
    const card = cards.find((item) => item.id === cardId) ?? archivedCards.find((item) => item.id === cardId);
    if (card) {
      setEditingCard(card);
      setCreateDraft(null);
      setModalOpen(true);
    }
  }, [searchParams, cards, archivedCards, isLoading]);

  useEffect(() => {
    const noticeId = searchParams.get('newFromNotice');
    if (!noticeId || isLoading || !notices.length) return;
    const notice = notices.find((item) => item.id === noticeId);
    if (!notice) return;
    setEditingCard(null);
    setCreateDraft(cardInputFromNotice(notice, authorLabel));
    setModalOpen(true);
    router.replace('/handover', { scroll: false });
  }, [searchParams, notices, isLoading, authorLabel, router]);

  useEffect(() => {
    if (searchParams.get('newFromHk') !== '1') return;
    const draft = consumeHkHandoverDraft();
    if (draft) {
      setEditingCard(null);
      setCreateDraft(draft);
      setModalOpen(true);
    }
    router.replace('/handover', { scroll: false });
  }, [searchParams, router]);

  const boardCards = useMemo(
    () =>
      filterCards(cards, {
        query: searchQuery,
        quickFilter,
        category: '',
        session,
        dateFrom: searchDateFrom || null,
        dateTo: searchDateTo || null,
      }),
    [cards, searchQuery, quickFilter, session, searchDateFrom, searchDateTo],
  );

  const archivedSearchMatches = useMemo(() => {
    if (!searchQuery.trim() && !searchDateFrom && !searchDateTo) return [];
    return filterCards(archivedCards, {
      query: searchQuery,
      quickFilter: 'all',
      category: '',
      session,
      dateFrom: searchDateFrom || null,
      dateTo: searchDateTo || null,
    });
  }, [archivedCards, searchQuery, session, searchDateFrom, searchDateTo]);

  const visibleCards = useMemo(() => {
    if (!archivedSearchMatches.length) return boardCards;
    const ids = new Set(boardCards.map((card) => card.id));
    const extra = archivedSearchMatches.filter((card) => !ids.has(card.id));
    return [...boardCards, ...extra];
  }, [boardCards, archivedSearchMatches]);

  const summaryData = useMemo(() => buildShiftSummaryData(cards, notices), [cards, notices]);
  const alerts = useMemo(
    () =>
      buildTodayAlerts({
        unackedUrgent: summaryData.unackedUrgent,
        cards,
        todos,
        events,
        notices,
        transportBookings: todayTaxi,
      }),
    [summaryData.unackedUrgent, cards, todos, events, notices, todayTaxi],
  );

  const activeCard = editingCard
    ? cards.find((card) => card.id === editingCard.id) ??
      archivedCards.find((card) => card.id === editingCard.id) ??
      editingCard
    : null;
  const linkedTodo = activeCard?.linked_todo_id
    ? todos.find((todo) => todo.id === activeCard.linked_todo_id) ?? null
    : null;

  const doneCount = cards.filter((card) => card.column_id === 'done').length;
  const archivedCount = archivedCards.length;

  const audit = () => ({ shift: session.group || session.shift, staffName: session.name });

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  const openRecords = useCallback((tab: HandoverRecordsTab = 'shift') => {
    setRecordsModalTab(tab);
    setRecordsModalOpen(true);
  }, []);

  const openCardById = useCallback(
    (cardId: string) => {
      const card =
        cards.find((item) => item.id === cardId) ?? archivedCards.find((item) => item.id === cardId);
      if (!card) {
        showToast('카드를 찾을 수 없습니다.');
        return;
      }

      const openCardModal = () => {
        setEditingCard(card);
        setCardModalView('full');
        setModalOpen(true);
      };

      const inActiveBoard = cards.some((item) => item.id === cardId);
      setViewMode('board');

      function flashCardElement() {
        const el = document.getElementById(`handover-card-${cardId}`);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('is-flash-highlight');
        window.setTimeout(() => el.classList.remove('is-flash-highlight'), 2200);
        return true;
      }

      function revealCardInList() {
        window.dispatchEvent(new CustomEvent('handover-reveal-card', { detail: { cardId } }));
      }

      if (!inActiveBoard) {
        openCardModal();
        return;
      }

      setQuickFilter('all');

      // 보류·완료는 접힌 섹션에 있어 목록 하이라이트가 실패하기 쉬움 → 바로 열기
      if (card.column_id === 'hold' || card.column_id === 'done') {
        revealCardInList();
        openCardModal();
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (flashCardElement()) return;
          setSearchQuery('');
          setSearchDateFrom('');
          setSearchDateTo('');
          requestAnimationFrame(() => {
            if (flashCardElement()) return;
            revealCardInList();
            requestAnimationFrame(() => {
              if (flashCardElement()) return;
              openCardModal();
            });
          });
        });
      });
    },
    [archivedCards, cards],
  );

  function openCreateModal() {
    if (!requireSession('인수인계 추가')) return;
    setEditingCard(null);
    setCreateDraft(null);
    setModalOpen(true);
  }

  function closeCardModal() {
    setModalOpen(false);
    setCreateDraft(null);
    setCardModalView('full');
  }

  function openEditModal(card: Card) {
    setEditingCard(card);
    setCardModalView('full');
    setModalOpen(true);
  }

  function openCommentsModal(card: Card) {
    setEditingCard(card);
    setCardModalView('comments');
    setModalOpen(true);
  }

  const todayTodoCount = useMemo(() => filterTodayTodos(todos).length, [todos]);
  const todayEventCount = useMemo(() => filterTodayEvents(events).length, [events]);

  const handleShiftStart = useCallback(() => {
    if (!requireSession('교대 시작')) return;
    setShiftStartConfirmOpen(true);
  }, [requireSession]);

  const handleShiftStartConfirm = useCallback(async () => {
    if (!session.group || !session.name) return;
    setShiftStartSaving(true);
    try {
      const checklist = await fetchChecklistIncomplete(session.group || session.shift, session.group);
      await logShiftHandover({
        shift: session.shift,
        staffName: session.name,
        handoverType: 'start',
        unackedUrgent: summaryData.unackedUrgent.length,
        urgentCount: summaryData.urgentActive.length,
        progressCount: summaryData.progressActive.length,
        todayCount: summaryData.todayCards.length,
        checklistIncomplete: checklist.incomplete,
        progressRemaining: summaryData.progressActive.length,
      });
      await queryClient.invalidateQueries({ queryKey: ['shift-handovers', DEFAULT_HOTEL_ID] });
      setShiftStartConfirmOpen(false);
      setViewMode('brief');
      showToast(`${authorLabel} 교대가 시작되었습니다. 인계 탭에서 미완료 업무를 확인해 주세요.`);
    } catch {
      showToast('교대 시작 기록에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setShiftStartSaving(false);
    }
  }, [authorLabel, queryClient, session.group, session.name, session.shift, summaryData]);

  const handleShiftEnd = useCallback(() => {
    if (!requireSession('교대 종료')) return;
    setShiftEndModalOpen(true);
  }, [requireSession]);

  const handleOpenShiftBrief = useCallback(() => {
    setViewMode('brief');
  }, []);

  async function syncLinkedTodoOnCardDone(card: Card) {
    if (!card.linked_todo_id) return;
    const linked = todos.find((todo) => todo.id === card.linked_todo_id);
    if (linked && linked.status === 'open') {
      await updateTodoMutation.mutateAsync({
        id: linked.id,
        input: { status: 'done', completed_at: new Date().toISOString() },
      });
    }
  }

  async function syncLinkedCardOnTodoDone(todo: Todo) {
    if (!todo.linked_card_id) return;
    const linked = cards.find((card) => card.id === todo.linked_card_id);
    if (linked && linked.column_id !== 'done' && !isArchivedCard(linked)) {
      const resolution = linked.next_action?.trim() || linked.details?.trim() || '할일 완료 연동';
      await updateCard.mutateAsync({
        id: linked.id,
        input: { column_id: 'done', resolution },
      });
    }
  }

  async function handleSave(
    input: CardInput,
    id?: string,
    options?: { pendingFiles?: File[] },
  ) {
    if (!requireSession('저장')) return;
    if (id) {
      const before = cards.find((card) => card.id === id);
      await updateCard.mutateAsync({ id, input });
      if (before) {
        await logActivity({
          entityType: 'card',
          entityId: id,
          action: 'update',
          audit: audit(),
          summary: `수정: ${cardSummaryLabel(before.room, before.title)}`,
        });
      }
      if (input.column_id === 'done') {
        const card = cards.find((item) => item.id === id);
        if (card) await syncLinkedTodoOnCardDone(card);
      }
      showToast('수정되었습니다.');
    } else {
      const created = await createCard.mutateAsync({
        ...input,
        assignee_shift: input.assignee_shift || session.group || session.shift,
        assignee_name: input.assignee_name || session.name,
      });
      if (options?.pendingFiles?.length) {
        let uploaded = 0;
        for (const file of options.pendingFiles) {
          await uploadAttachment.mutateAsync({
            cardId: created.id,
            file,
            existingCount: uploaded,
          });
          uploaded += 1;
        }
      }
      await logActivity({
        entityType: 'card',
        entityId: created.id,
        action: 'create',
        audit: audit(),
        summary: `추가: ${cardSummaryLabel(created.room, created.title)}`,
      });
      showToast('인수인계가 추가되었습니다.');
    }
    refreshActivityLogs();
  }

  async function handleDelete(id: string, staffName: string) {
    const before = cards.find((card) => card.id === id) ?? archivedCards.find((card) => card.id === id);
    await deleteCard.mutateAsync({ id, staffName });
    if (before?.linked_todo_id) {
      await updateTodoMutation.mutateAsync({
        id: before.linked_todo_id,
        input: { linked_card_id: null },
      });
    }
    if (before) {
      await logActivity({
        entityType: 'card',
        entityId: id,
        action: 'delete',
        audit: audit(),
        summary: `삭제: ${cardSummaryLabel(before.room, before.title)}`,
      });
    }
    showToast('삭제되었습니다.');
    refreshActivityLogs();
  }

  async function handleDuplicateCard(source: Card) {
    if (!requireSession('카드 복제')) return;
    const input = buildDuplicateCardInput(
      source,
      authorLabel,
      session.group || session.shift,
      session.name,
    );
    const created = await createCard.mutateAsync({
      ...input,
      assignee_shift: input.assignee_shift || session.group || session.shift,
      assignee_name: input.assignee_name || session.name,
    });
    await logActivity({
      entityType: 'card',
      entityId: created.id,
      action: 'create',
      audit: audit(),
      summary: `복제: ${cardSummaryLabel(created.room, created.title)}`,
      details: { sourceId: source.id },
    });
    refreshActivityLogs();
    setEditingCard(created);
    setCardModalView('full');
    setModalOpen(true);
    showToast('카드를 복제했습니다.');
  }

  async function handleAcknowledge(cardId: string) {
    if (!requireSession('긴급 확인')) return;
    try {
      await acknowledgeCard.mutateAsync({
        cardId,
        shift: session.shift,
        staffName: session.name,
      });
      showToast('긴급 건 확인이 기록되었습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '확인에 실패했습니다.');
    }
  }

  async function handleMarkDone(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.column_id === 'done' || isArchivedCard(card)) return;

    const resolution = card.next_action?.trim() || card.details?.trim() || '처리 완료';
    try {
      await updateCard.mutateAsync({
        id: cardId,
        input: { column_id: 'done', resolution },
      });
      await syncLinkedTodoOnCardDone(card);
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'move',
        audit: audit(),
        summary: `완료: ${cardSummaryLabel(card.room, card.title)}`,
        details: { from: card.column_id, to: 'done', quick: true },
      });
      showToast('완료 처리했습니다.');
      refreshActivityLogs();
    } catch {
      showToast('완료 처리에 실패했습니다.');
    }
  }

  async function handleMoveToHold(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.column_id === 'hold' || card.column_id === 'done' || isArchivedCard(card)) return;
    if (!requireSession('보류')) return;

    try {
      await updateCard.mutateAsync({ id: cardId, input: { column_id: 'hold' } });
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'move',
        audit: audit(),
        summary: `보류: ${cardSummaryLabel(card.room, card.title)}`,
        details: { from: card.column_id, to: 'hold', quick: true },
      });
      showToast('보류로 이동했습니다.');
      refreshActivityLogs();
    } catch {
      showToast('보류 처리에 실패했습니다.');
    }
  }

  async function handleResumeFromHold(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.column_id !== 'hold' || isArchivedCard(card)) return;
    if (!requireSession('재개')) return;

    try {
      await updateCard.mutateAsync({ id: cardId, input: { column_id: 'progress' } });
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'move',
        audit: audit(),
        summary: `재개: ${cardSummaryLabel(card.room, card.title)}`,
        details: { from: 'hold', to: 'progress', quick: true },
      });
      showToast('진행으로 재개했습니다.');
      refreshActivityLogs();
    } catch {
      showToast('재개에 실패했습니다.');
    }
  }

  async function handleQuickAssign(cardId: string, assigneeName: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.column_id === 'done' || isArchivedCard(card)) return;
    if (assigneeName === (card.assignee_name || '')) return;
    if (!requireSession('담당 변경')) return;

    try {
      await updateCard.mutateAsync({
        id: cardId,
        input: {
          assignee_name: assigneeName,
          assignee_shift: session.group || session.shift || card.assignee_shift,
        },
      });
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'update',
        audit: audit(),
        summary: `담당 변경: ${cardSummaryLabel(card.room, card.title)}`,
        details: { assignee_name: assigneeName, quick: true },
      });
      showToast(assigneeName ? `${assigneeName}(으)로 담당을 변경했습니다.` : '담당을 해제했습니다.');
      refreshActivityLogs();
    } catch {
      showToast('담당 변경에 실패했습니다.');
    }
  }

  async function handleSnoozeCard(cardId: string) {
    const until = new Date(Date.now() + CARD_SNOOZE_MS).toISOString();
    try {
      await updateCard.mutateAsync({ id: cardId, input: { snoozed_until: until } });
      showToast('2시간 동안 마감 알림을 끕니다.');
    } catch {
      showToast('알림 스누즈에 실패했습니다.');
    }
  }

  async function handleUnsnoozeCard(cardId: string) {
    try {
      await updateCard.mutateAsync({ id: cardId, input: { snoozed_until: null } });
      showToast('마감 알림을 다시 켰습니다.');
    } catch {
      showToast('알림 설정에 실패했습니다.');
    }
  }

  async function handleBulkMarkDone(cardIds: string[]) {
    for (const cardId of cardIds) {
      await handleMarkDone(cardId);
    }
  }

  async function handleBulkHold(cardIds: string[]) {
    if (!requireSession('보류')) return;
    for (const cardId of cardIds) {
      await handleMoveToHold(cardId);
    }
  }

  async function handleBulkAssign(cardIds: string[], assigneeName: string) {
    if (!requireSession('담당 변경')) return;
    for (const cardId of cardIds) {
      await handleQuickAssign(cardId, assigneeName);
    }
  }

  async function handleBulkSnooze(cardIds: string[]) {
    for (const cardId of cardIds) {
      const card = cards.find((item) => item.id === cardId);
      if (card && isCardDueActive(card)) {
        await handleSnoozeCard(cardId);
      }
    }
  }

  async function handleBulkUnassign(cardIds: string[]) {
    if (!requireSession('담당 변경')) return;
    for (const cardId of cardIds) {
      await handleQuickAssign(cardId, '');
    }
  }

  async function handleBulkResume(cardIds: string[]) {
    if (!requireSession('재개')) return;
    for (const cardId of cardIds) {
      const card = cards.find((item) => item.id === cardId);
      if (card?.column_id === 'hold') {
        await handleResumeFromHold(cardId);
      }
    }
  }

  async function handleBulkArchive(cardIds: string[]) {
    if (!isManager || !cardIds.length) return;
    try {
      await archiveCardsByIds.mutateAsync(cardIds);
      await logActivity({
        entityType: 'card',
        action: 'archive_done',
        audit: audit(),
        summary: `선택 완료 보관 (${cardIds.length}건)`,
      });
      showToast(`${cardIds.length}건을 보관함으로 옮겼습니다.`);
      refreshActivityLogs();
      refetchArchived();
    } catch {
      showToast('보관에 실패했습니다.');
    }
  }

  async function handleRecordFirstResponse(cardId: string) {
    if (!requireSession('첫 응대')) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card || !needsComplaintFirstResponse(card)) return;
    try {
      await updateCard.mutateAsync({
        id: cardId,
        input: { first_response_at: new Date().toISOString() },
      });
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'update',
        audit: audit(),
        summary: `첫 응대: ${cardSummaryLabel(card.room, card.title)}`,
      });
      showToast('첫 응대가 기록되었습니다.');
      refreshActivityLogs();
    } catch {
      showToast('첫 응대 기록에 실패했습니다.');
    }
  }

  async function handleCreateTodoFromCard(card: Card) {
    if (!requireSession('할일 등록')) return;
    if (card.linked_todo_id) {
      const existing = todos.find((todo) => todo.id === card.linked_todo_id);
      if (existing) {
        setEditingTodo(existing);
        setTodoModalOpen(true);
        return;
      }
    }
    const dueDate = card.due_at ? card.due_at.slice(0, 10) : null;
    const description = [card.details, card.next_action].filter(Boolean).join('\n');
    try {
      const todo = await createTodoMutation.mutateAsync({
        title: card.title,
        description,
        due_date: dueDate,
        priority: cardPriorityToTodo(card.priority),
        assignee_shift: card.assignee_shift || session.group || session.shift,
        assignee_name: card.assignee_name || session.name,
        author: authorLabel,
      });
      await updateCard.mutateAsync({ id: card.id, input: { linked_todo_id: todo.id } });
      await updateTodoMutation.mutateAsync({ id: todo.id, input: { linked_card_id: card.id } });
      showToast('할일로 등록했습니다.');
    } catch {
      showToast('할일 등록에 실패했습니다.');
    }
  }

  async function handleCreateCardFromTodo(todo: Todo) {
    if (!requireSession('인수인계 등록')) return;
    if (todo.linked_card_id) {
      const existing = cards.find((card) => card.id === todo.linked_card_id);
      if (existing) {
        openEditModal(existing);
        return;
      }
    }
    try {
      const created = await createCard.mutateAsync({
        column_id: 'progress',
        priority: todoPriorityToCard(todo.priority),
        category: '기타',
        room: '',
        title: todo.title,
        details: todo.description,
        resolution: '',
        next_action: '',
        author: authorLabel,
        assignee_shift: todo.assignee_shift || session.group || session.shift,
        assignee_name: todo.assignee_name || session.name,
        due_at: todo.due_date ? `${todo.due_date}T12:00:00` : null,
        ...EMPTY_COMPLAINT_REMEDIES,
      });
      await updateCard.mutateAsync({ id: created.id, input: { linked_todo_id: todo.id } });
      await updateTodoMutation.mutateAsync({ id: todo.id, input: { linked_card_id: created.id } });
      showToast('인수인계로 등록했습니다.');
      openEditModal(created);
    } catch {
      showToast('인수인계 등록에 실패했습니다.');
    }
  }

  async function handleTodoSave(input: TodoInput, id?: string) {
    if (!requireSession('할일 저장')) return;
    if (id) {
      await updateTodoMutation.mutateAsync({ id, input });
      showToast('할일을 수정했습니다.');
    } else {
      await createTodoMutation.mutateAsync(input);
      showToast('할일을 추가했습니다.');
    }
  }

  async function handleToggleTodo(todo: Todo) {
    const result = await toggleTodoMutation.mutateAsync(todo);
    if (todo.status === 'open') {
      await syncLinkedCardOnTodoDone(todo);
      if (result.spawned) {
        showToast(`할일을 완료했습니다. 다음 주기(${result.spawned.due_date}) 할일이 생성되었습니다.`);
        return;
      }
      showToast('할일을 완료했습니다.');
    } else {
      showToast('할일을 다시 열었습니다.');
    }
  }

  async function handleEventSave(input: HotelEventInput, id?: string) {
    if (!requireSession('일정 저장')) return;
    if (id) {
      await updateEventMutation.mutateAsync({ id, input });
      showToast('일정을 수정했습니다.');
    } else {
      await createEventMutation.mutateAsync(input);
      showToast('일정을 추가했습니다.');
    }
  }

  async function handleArchiveDone() {
    if (!isManager) return;
    const ok = await confirm({
      title: '완료 칸 비우기',
      message: `완료 칸 ${doneCount}건을 보관함으로 옮깁니다.`,
      detail: '보드에서는 숨겨지지만 삭제되지 않습니다. 보관함·검색에서 다시 찾을 수 있습니다.',
      tone: 'default',
      confirmLabel: '보관하기',
    });
    if (!ok) return;
    try {
      await archiveDone.mutateAsync();
      await logActivity({
        entityType: 'card',
        action: 'archive_done',
        audit: audit(),
        summary: `완료 보관 (${doneCount}건)`,
      });
      showToast('완료 칸을 비웠습니다. 보관함 탭에서 확인할 수 있습니다.');
      setViewMode('archive');
      refreshActivityLogs();
      refetchArchived();
    } catch {
      showToast('완료 보관에 실패했습니다.');
    }
  }

  async function handleRestoreFromArchive(cardId: string) {
    if (!isManager) return;
    const card = archivedCards.find((item) => item.id === cardId);
    if (!card) return;
    try {
      await restoreFromArchive.mutateAsync(cardId);
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'restore_archive',
        audit: audit(),
        summary: `보관 복원: ${cardSummaryLabel(card.room, card.title)}`,
      });
      showToast('완료 칸으로 복원했습니다.');
      refreshActivityLogs();
      refetchArchived();
    } catch {
      showToast('복원에 실패했습니다.');
    }
  }

  async function handleAddComment(cardId: string, content: string) {
    if (!requireSession('댓글')) return;
    const card = cards.find((item) => item.id === cardId);
    await addComment.mutateAsync({
      cardId,
      shift: session.shift,
      staffName: session.name,
      content,
    });
    if (card) {
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'update',
        audit: audit(),
        summary: `댓글: ${cardSummaryLabel(card.room, card.title)}`,
        details: { changes: [content] },
      });
      refreshActivityLogs();
    }
  }

  async function handleUpdateComment(cardId: string, commentId: string, content: string) {
    if (!requireSession('댓글 수정')) return;
    const card = cards.find((item) => item.id === cardId);
    const target = card?.card_comments.find((comment) => comment.id === commentId);
    await updateComment.mutateAsync({
      commentId,
      cardId,
      content,
      editorShift: session.shift,
      editorName: session.name,
    });
    if (card) {
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'update',
        audit: audit(),
        summary: `댓글 수정: ${cardSummaryLabel(card.room, card.title)}`,
        details: {
          changes: [content],
          original_author: target ? `${target.shift} · ${target.staff_name}` : undefined,
        },
      });
      refreshActivityLogs();
    }
  }

  async function handleDeleteComment(cardId: string, commentId: string) {
    if (!requireSession('댓글 삭제')) return;
    const card = cards.find((item) => item.id === cardId);
    const target = card?.card_comments.find((comment) => comment.id === commentId);
    await deleteComment.mutateAsync({
      commentId,
      cardId,
      deleterShift: session.shift,
      deleterName: session.name,
    });
    if (card) {
      await logActivity({
        entityType: 'card',
        entityId: cardId,
        action: 'update',
        audit: audit(),
        summary: `댓글 삭제: ${cardSummaryLabel(card.room, card.title)}`,
        details: {
          original_author: target ? `${target.shift} · ${target.staff_name}` : undefined,
          deleted_preview: target?.content?.slice(0, 120),
        },
      });
      refreshActivityLogs();
    }
  }

  async function handleUploadAttachment(cardId: string, file: File) {
    const card = cards.find((item) => item.id === cardId);
    await uploadAttachment.mutateAsync({
      cardId,
      file,
      existingCount: card?.card_attachments.length ?? 0,
    });
    showToast('사진이 첨부되었습니다.');
  }

  async function handleDeleteAttachment(attachment: CardAttachment) {
    const ok = await confirm({
      title: '첨부 삭제',
      message: '첨부 사진을 삭제합니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    await deleteAttachment.mutateAsync(attachment);
    showToast('첨부가 삭제되었습니다.');
  }

  if (isLoading) {
    return <div className="empty-state">인수인계 보드를 불러오는 중…</div>;
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)', whiteSpace: 'pre-line' }}>
        {formatSupabaseClientError(error)}
      </div>
    );
  }

  const showUnacked = () => {
    setQuickFilter('unacked');
    setViewMode('board');
  };

  const handleAlertClick = (id: string) => {
    if (id === 'unacked') {
      showUnacked();
      return;
    }
    if (id === 'due-overdue-cards') {
      setQuickFilter('due-overdue');
      setViewMode('board');
      return;
    }
    if (id === 'due-soon-cards') {
      setQuickFilter('due-soon');
      setViewMode('board');
      return;
    }
    if (id === 'stale-cards') {
      setQuickFilter('stale');
      setViewMode('board');
      return;
    }
    if (id === 'hold-long-cards') {
      setQuickFilter('hold-long');
      setViewMode('board');
      return;
    }
    if (id === 'notice-expiry') {
      router.push(buildWorkHubHref('notices', { renewal: '1' }));
      return;
    }
    if (id === 'taxi-needs-input') {
      router.push('/transport?filter=needs_input');
      return;
    }
    if (id === 'taxi-imminent') {
      router.push('/transport');
      return;
    }
    setViewMode('board');
  };

  return (
    <>
      <div className="handover-page handover-page--project">
        <HandoverWorkspaceProject
          summaryData={summaryData}
          cards={cards}
          visibleCards={visibleCards}
          todos={todos}
          events={events}
          alerts={alerts}
          viewMode={viewMode}
          searchQuery={searchQuery}
          searchDateFrom={searchDateFrom}
          searchDateTo={searchDateTo}
          quickFilter={quickFilter}
          doneCount={doneCount}
          archivedCards={archivedCards}
          archivedLoading={archivedLoading}
          archivedCount={archivedCount}
          archivedSearchCount={archivedSearchMatches.length}
          isManager={isManager}
          session={session}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchQuery}
          onSearchDateFromChange={setSearchDateFrom}
          onSearchDateToChange={setSearchDateTo}
          onQuickFilterChange={setQuickFilter}
          onAdd={openCreateModal}
          onArchiveDone={handleArchiveDone}
          onRestoreFromArchive={handleRestoreFromArchive}
          onOpenRecords={openRecords}
          onOpenCardById={openCardById}
          onOpenShiftBrief={handleOpenShiftBrief}
          authorLabel={authorLabel}
          requireSession={requireSession}
          onToast={showToast}
          onShiftStart={handleShiftStart}
          onShiftEnd={handleShiftEnd}
          onOpenCard={openEditModal}
          onOpenCardComments={openCommentsModal}
          onAddComment={handleAddComment}
          staffNames={staffNames}
          staffName={session.name}
          commentDisabled={!session.name}
          onAcknowledge={handleAcknowledge}
          onMarkDone={handleMarkDone}
          onHold={handleMoveToHold}
          onResume={handleResumeFromHold}
          onAssignChange={handleQuickAssign}
          onSnooze={handleSnoozeCard}
          onUnsnooze={handleUnsnoozeCard}
          onRecordFirstResponse={handleRecordFirstResponse}
          onBulkMarkDone={handleBulkMarkDone}
          onBulkHold={handleBulkHold}
          onBulkAssign={handleBulkAssign}
          onBulkSnooze={handleBulkSnooze}
          onBulkUnassign={handleBulkUnassign}
          onBulkResume={handleBulkResume}
          onBulkArchive={handleBulkArchive}
          onShowUnacked={showUnacked}
          onAlertClick={handleAlertClick}
          onOpenTodo={(todo) => {
            setEditingTodo(todo);
            setTodoModalOpen(true);
          }}
          onToggleTodo={handleToggleTodo}
          onOpenEvent={(event) => {
            setEditingEvent(event);
            setEventModalOpen(true);
          }}
        />
      </div>

      <CardModal
        open={modalOpen}
        card={activeCard}
        view={cardModalView}
        createDraft={createDraft}
        linkedTodo={linkedTodo}
        authorLabel={authorLabel}
        defaultShift={session.group || session.shift}
        defaultName={session.name}
        staffNames={staffNames}
        isManager={isManager}
        currentUserId={currentUserId}
        activeCards={cards}
        onClose={closeCardModal}
        onSwitchToFull={() => setCardModalView('full')}
        onSave={handleSave}
        onDelete={handleDelete}
        onDuplicate={handleDuplicateCard}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        onUploadAttachment={handleUploadAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        onCreateTodo={activeCard ? () => handleCreateTodoFromCard(activeCard) : undefined}
        onRecordFirstResponse={
          activeCard && needsComplaintFirstResponse(activeCard)
            ? () => handleRecordFirstResponse(activeCard.id)
            : undefined
        }
        requireSession={requireSession}
      />

      <TodoModal
        open={todoModalOpen}
        todo={editingTodo}
        linkedCard={editingTodo?.linked_card_id ? cards.find((c) => c.id === editingTodo.linked_card_id) ?? null : null}
        authorLabel={authorLabel}
        defaultShift={session.group || session.shift}
        defaultName={session.name}
        staffNames={staffNames}
        onClose={() => setTodoModalOpen(false)}
        onSave={handleTodoSave}
        onCreateCard={editingTodo ? () => handleCreateCardFromTodo(editingTodo) : undefined}
      />

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        authorLabel={authorLabel}
        onClose={() => setEventModalOpen(false)}
        onSave={handleEventSave}
      />

      <ShiftStartConfirmModal
        open={shiftStartConfirmOpen}
        authorLabel={authorLabel}
        summary={summaryData}
        todayTodoCount={todayTodoCount}
        todayEventCount={todayEventCount}
        saving={shiftStartSaving}
        onClose={() => setShiftStartConfirmOpen(false)}
        onConfirm={() => void handleShiftStartConfirm()}
      />

      <ShiftHandoverModal
        open={shiftEndModalOpen}
        cards={cards}
        notices={notices}
        session={session}
        authorLabel={authorLabel}
        onClose={() => setShiftEndModalOpen(false)}
        onComplete={showToast}
      />

      <HandoverRecordsModal
        open={recordsModalOpen}
        initialTab={recordsModalTab}
        onClose={() => setRecordsModalOpen(false)}
      />

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </>
  );
}
