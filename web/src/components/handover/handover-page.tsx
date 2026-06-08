'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cardSummaryLabel, logActivity } from '@/lib/handover/activity';
import { filterCards } from '@/lib/handover/card-utils';
import { buildShiftSummaryData } from '@/lib/handover/shift-summary';
import { useActivityLogs } from '@/lib/handover/use-activity-logs';
import { filterNoticesByType, useNotices } from '@/lib/handover/use-notices';
import { useCards, useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type {
  Card,
  CardAttachment,
  CardInput,
  HandoverViewMode,
  Notice,
  NoticeInput,
  NoticeType,
  QuickFilter,
  ShiftHandoverType,
} from '@/lib/handover/types';
import { PinnedContactsBar } from '@/components/contacts/pinned-contacts-bar';
import { useRegisterShiftHandlers } from '@/components/layout/session-bar-actions';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { TodayStaffBar } from '@/components/schedule/today-staff-bar';
import { ExportSummaryModal } from './export-summary-modal';
import { ActivityLogModal } from './activity-log-modal';
import { BoardToolbar } from './board-toolbar';
import { CardModal } from './card-modal';
import { KanbanBoard } from './kanban-board';
import { NoticeModal } from './notice-modal';
import { NoticePanel } from './notice-panel';
import { RoomView } from './room-view';
import { ShiftHandoverModal } from './shift-handover-modal';
import { HandoverSecondaryPanel } from './handover-secondary-panel';
import { PinnedNoticesStrip } from './pinned-notices-strip';
import { SummaryBar } from './summary-bar';
import { UnackedUrgentAlert } from './unacked-urgent-alert';

export function HandoverPage() {
  const {
    cards,
    isLoading,
    error,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    acknowledgeCard,
    addComment,
    uploadAttachment,
    deleteAttachment,
    clearDone,
  } = useCards();
  const { notices, createNotice, updateNotice, deleteNotice, togglePin } = useNotices();
  const { data: activityLogs = [], isLoading: activityLoading, refetch: refetchActivity } = useActivityLogs(80);
  const { data: isManager = false } = useIsManager();
  const { session, requireSession, authorLabel } = useWorkSession();
  const { confirm } = useConfirmDialog();

  const [viewMode, setViewMode] = useState<HandoverViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeDefaultType, setNoticeDefaultType] = useState<NoticeType>('announcement');
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<ShiftHandoverType>('start');
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
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

  const visibleCards = useMemo(
    () => filterCards(cards, { query: searchQuery, quickFilter, category: '', session }),
    [cards, searchQuery, quickFilter, session],
  );

  const summaryData = useMemo(() => buildShiftSummaryData(cards, notices), [cards, notices]);
  const unpinnedNotices = useMemo(() => notices.filter((notice) => !notice.is_pinned), [notices]);
  const activeCard = editingCard ? cards.find((card) => card.id === editingCard.id) ?? editingCard : null;
  const doneCount = cards.filter((card) => card.column_id === 'done').length;

  const audit = () => ({ shift: session.shift, staffName: session.name });

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openCreateModal() {
    if (!requireSession('인수인계 추가')) return;
    setEditingCard(null);
    setModalOpen(true);
  }

  function openEditModal(card: Card) {
    setEditingCard(card);
    setModalOpen(true);
  }

  function openNoticeCreate(type: NoticeType) {
    if (!requireSession('공지 추가')) return;
    setEditingNotice(null);
    setNoticeDefaultType(type);
    setNoticeModalOpen(true);
  }

  function openNoticeEdit(notice: Notice) {
    setEditingNotice(notice);
    setNoticeDefaultType(notice.type);
    setNoticeModalOpen(true);
  }

  function openShiftModal(mode: ShiftHandoverType) {
    if (!requireSession(mode === 'start' ? '교대 시작' : '교대 종료')) return;
    setShiftModalMode(mode);
    setShiftModalOpen(true);
  }

  const handleShiftStart = useCallback(() => {
    if (!requireSession('교대 시작')) return;
    setShiftModalMode('start');
    setShiftModalOpen(true);
  }, [requireSession]);

  const handleShiftEnd = useCallback(() => {
    if (!requireSession('교대 종료')) return;
    setShiftModalMode('end');
    setShiftModalOpen(true);
  }, [requireSession]);

  useRegisterShiftHandlers({ onShiftStart: handleShiftStart, onShiftEnd: handleShiftEnd });

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
      showToast('수정되었습니다.');
    } else {
      const created = await createCard.mutateAsync({
        ...input,
        assignee_shift: input.assignee_shift || session.shift,
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
    refetchActivity();
  }

  async function handleDelete(id: string) {
    const before = cards.find((card) => card.id === id);
    await deleteCard.mutateAsync(id);
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
    refetchActivity();
  }

  async function handleMove(cardId: string, columnId: Card['column_id'], orderedIds: string[]) {
    const before = cards.find((card) => card.id === cardId);
    try {
      await moveCard.mutateAsync({ cardId, columnId, orderedIds });
      if (before && before.column_id !== columnId) {
        await logActivity({
          entityType: 'card',
          entityId: cardId,
          action: 'move',
          audit: audit(),
          summary: `이동: ${cardSummaryLabel(before.room, before.title)}`,
          details: { from: before.column_id, to: columnId },
        });
        refetchActivity();
      }
    } catch {
      showToast('카드 이동에 실패했습니다.');
    }
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

  async function handleClearDone() {
    if (!isManager) return;
    const ok = await confirm({
      title: '완료 칸 비우기',
      message: `완료 칸 ${doneCount}건을 모두 삭제합니다.`,
      detail: '삭제된 인수인계는 복구할 수 없습니다.',
      tone: 'danger',
      confirmLabel: '모두 삭제',
    });
    if (!ok) return;
    try {
      await clearDone.mutateAsync();
      await logActivity({
        entityType: 'card',
        action: 'clear_done',
        audit: audit(),
        summary: `완료칸 비우기 (${doneCount}건)`,
      });
      showToast('완료 칸을 비웠습니다.');
      refetchActivity();
    } catch {
      showToast('완료 칸 비우기에 실패했습니다.');
    }
  }

  async function handleNoticeSave(input: NoticeInput, id?: string) {
    if (!requireSession('저장')) return;
    if (id) {
      await updateNotice.mutateAsync({ id, input });
      await logActivity({
        entityType: 'notice',
        entityId: id,
        action: 'update',
        audit: audit(),
        summary: `공지 수정: ${input.content.slice(0, 40)}`,
      });
      showToast('공지가 수정되었습니다.');
    } else {
      const created = await createNotice.mutateAsync(input);
      await logActivity({
        entityType: 'notice',
        entityId: created.id,
        action: 'create',
        audit: audit(),
        summary: `공지 추가: ${input.content.slice(0, 40)}`,
      });
      showToast('공지가 추가되었습니다.');
    }
    refetchActivity();
  }

  async function handleNoticeDelete(id: string) {
    const before = notices.find((notice) => notice.id === id);
    await deleteNotice.mutateAsync(id);
    if (before) {
      await logActivity({
        entityType: 'notice',
        entityId: id,
        action: 'delete',
        audit: audit(),
        summary: `공지 삭제: ${before.content.slice(0, 40)}`,
      });
    }
    showToast('삭제되었습니다.');
    refetchActivity();
  }

  async function handleTogglePin(notice: Notice) {
    if (!requireSession('고정 변경')) return;
    await togglePin.mutateAsync({ id: notice.id, isPinned: notice.is_pinned });
    showToast('고정 상태가 변경되었습니다.');
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
      refetchActivity();
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
    return (
      <div className="empty-state">인수인계 보드를 불러오는 중…</div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
        카드를 불러오지 못했습니다. Supabase migration과 RLS 설정을 확인해 주세요.
      </div>
    );
  }

  return (
    <>
      <div className="handover-workspace">
        <div className="handover-workspace__sticky">
          <SummaryBar
            data={summaryData}
            totalCount={cards.length}
            activeFilter={quickFilter}
            onFilterSelect={setQuickFilter}
          />
          <PinnedNoticesStrip notices={notices} onOpen={openNoticeEdit} />
          <UnackedUrgentAlert
            count={summaryData.unackedUrgent.length}
            isFilterActive={quickFilter === 'unacked'}
            onShowUnacked={() => {
              setQuickFilter('unacked');
              setViewMode('board');
            }}
          />
          <BoardToolbar
            viewMode={viewMode}
            searchQuery={searchQuery}
            quickFilter={quickFilter}
            doneCount={doneCount}
            isManager={isManager}
            onViewModeChange={setViewMode}
            onSearchChange={setSearchQuery}
            onQuickFilterChange={setQuickFilter}
            onAdd={openCreateModal}
            onClearDone={handleClearDone}
            onExport={() => setExportModalOpen(true)}
            onActivity={() => setActivityModalOpen(true)}
          />
        </div>

        <div className="handover-workspace__board">
          {viewMode === 'board' ? (
            <KanbanBoard
              cards={visibleCards}
              searchQuery={searchQuery}
              onMove={handleMove}
              onOpenCard={openEditModal}
              onAcknowledge={handleAcknowledge}
            />
          ) : (
            <RoomView cards={visibleCards} onOpenCard={openEditModal} />
          )}
        </div>
      </div>

      <HandoverSecondaryPanel noticeCount={unpinnedNotices.length}>
        <TodayStaffBar />
        <PinnedContactsBar />
        <section className="notices">
          <NoticePanel
            type="announcement"
            title="📢 업무 공지"
            hint="전체 공지 · 안내 사항"
            notices={filterNoticesByType(unpinnedNotices, 'announcement')}
            onAdd={() => openNoticeCreate('announcement')}
            onOpen={openNoticeEdit}
            onTogglePin={handleTogglePin}
          />
          <NoticePanel
            type="change"
            title="🔄 업무 변경"
            hint="운영·절차 변경 사항"
            notices={filterNoticesByType(unpinnedNotices, 'change')}
            onAdd={() => openNoticeCreate('change')}
            onOpen={openNoticeEdit}
            onTogglePin={handleTogglePin}
          />
        </section>
      </HandoverSecondaryPanel>

      <CardModal
        open={modalOpen}
        card={activeCard}
        authorLabel={authorLabel}
        defaultShift={session.shift}
        defaultName={session.name}
        staffNames={staffNames}
        isManager={isManager}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onAddComment={handleAddComment}
        onUploadAttachment={handleUploadAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        requireSession={requireSession}
      />

      <NoticeModal
        open={noticeModalOpen}
        notice={editingNotice}
        defaultType={noticeDefaultType}
        authorLabel={authorLabel}
        isManager={isManager}
        onClose={() => setNoticeModalOpen(false)}
        onSave={handleNoticeSave}
        onDelete={handleNoticeDelete}
      />

      <ShiftHandoverModal
        open={shiftModalOpen}
        mode={shiftModalMode}
        cards={cards}
        notices={notices}
        activityLogs={activityLogs}
        session={session}
        authorLabel={authorLabel}
        onClose={() => setShiftModalOpen(false)}
        onComplete={showToast}
        onHandoverComplete={(mode) => {
          if (mode !== 'start' || summaryData.unackedUrgent.length === 0) return;
          setQuickFilter('unacked');
          setViewMode('board');
          showToast('미확인 긴급 건부터 확인해 주세요.');
        }}
        onOpenExport={() => {
          setShiftModalOpen(false);
          setExportModalOpen(true);
        }}
      />

      <ActivityLogModal
        open={activityModalOpen}
        logs={activityLogs}
        isLoading={activityLoading}
        onClose={() => setActivityModalOpen(false)}
      />

      <ExportSummaryModal
        open={exportModalOpen}
        cards={cards}
        notices={notices}
        authorLabel={authorLabel}
        onClose={() => setExportModalOpen(false)}
        onToast={showToast}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
