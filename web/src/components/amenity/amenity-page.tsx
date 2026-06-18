'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AmenityOrderSheet } from '@/components/amenity/amenity-order-sheet';
import { AmenityInventoryGrid } from '@/components/amenity/inventory-grid';
import { AmenityTransactionPanel } from '@/components/amenity/transaction-panel';
import { AmenityTransactionHistory } from '@/components/amenity/transaction-history';
import { fetchAmenityInventoryData, fetchAllAmenityTransactions, subscribeAmenityChanges } from '@/lib/amenity/api';
import { AMENITY_WORKSPACE_TABS } from '@/lib/amenity/copy';
import { downloadAmenityTransactionsCsv } from '@/lib/amenity/export';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { todayDateString } from '@/lib/handover/shift-summary';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useTodos } from '@/lib/todos/use-todos';
import { buildAmenityOrderLines, buildAmenityOrderText } from '@/lib/amenity/order-sheet';

type AmenityWorkspaceTab = 'inventory' | 'history';

export function AmenityPageClient() {
  const { session, authorLabel, requireSession } = useWorkSession();
  const { createTodo } = useTodos();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session.shift && session.group && session.name);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [todoBusy, setTodoBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<AmenityWorkspaceTab>('inventory');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(DEFAULT_HOTEL_ID),
  });

  useEffect(() => {
    const unsubscribe = subscribeAmenityChanges(DEFAULT_HOTEL_ID, () => {
      queryClient.invalidateQueries({ queryKey: ['amenity', DEFAULT_HOTEL_ID] });
    });
    return unsubscribe;
  }, [queryClient]);

  const {
    data: allTransactions = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['amenity-transactions-all', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAllAmenityTransactions(DEFAULT_HOTEL_ID),
    enabled: workspaceTab === 'history',
  });

  useEffect(() => {
    if (!data?.items.length || selectedId != null) return;
    const firstReorder = data.items.find((item) => item.orderBoxes > 0);
    setSelectedId(firstReorder?.id ?? data.items[0].id);
  }, [data, selectedId]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleDownloadHistory() {
    setDownloadBusy(true);
    try {
      const rows = await fetchAllAmenityTransactions(DEFAULT_HOTEL_ID);
      if (!rows.length) {
        showToast('다운로드할 입출고 기록이 없습니다.');
        return;
      }
      downloadAmenityTransactionsCsv(rows);
      showToast(`${rows.length.toLocaleString()}건 CSV로 저장했습니다.`);
    } catch {
      showToast('기록 다운로드에 실패했습니다.');
    } finally {
      setDownloadBusy(false);
    }
  }

  async function handleCreateTodoFromOrder() {
    if (!requireSession('할일 등록')) return;
    const orderItems = data?.items ?? [];
    const lines = buildAmenityOrderLines(orderItems);
    if (!lines.length) return;
    setTodoBusy(true);
    try {
      await createTodo.mutateAsync({
        title: `어메니티 발주 (${lines.length}품목)`,
        description: buildAmenityOrderText(lines),
        due_date: todayDateString(),
        priority: 'normal',
        assignee_shift: session.group || session.shift,
        assignee_name: session.name,
        author: authorLabel,
      });
      showToast('업무 일정에 할일을 등록했습니다.');
      void queryClient.invalidateQueries({ queryKey: ['todos', DEFAULT_HOTEL_ID] });
    } catch {
      showToast('할일 등록에 실패했습니다.');
    } finally {
      setTodoBusy(false);
    }
  }

  if (isLoading) {
    return <p className="empty-state">데이터 불러오는 중…</p>;
  }

  if (error) {
    return (
      <p className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
        {error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'}
        <br />
        Supabase SQL Editor에서 003·012 마이그레이션을 실행했는지 확인해 주세요.
      </p>
    );
  }

  const items = data?.items ?? [];
  const { label: amenityTitle, description: amenityDescription } = getNavPageMeta('/amenity');
  const activeTabCopy = AMENITY_WORKSPACE_TABS[workspaceTab];

  return (
    <section className="amenity-page">
      <header className="amenity-page__header">
        <h2 className="amenity-page__title">{amenityTitle || '어메니티'}</h2>
        <p className="amenity-page__desc">{amenityDescription}</p>
      </header>

      {!hasSession ? (
        <p className="amenity-page__hint">「지금 근무」 설정 후 입출고 가능</p>
      ) : null}

      <AmenityOrderSheet
        items={items}
        onToast={showToast}
        onCreateTodo={() => void handleCreateTodoFromOrder()}
        createTodoBusy={todoBusy}
      />

      <div className="amenity-page__tabs" role="tablist" aria-label="어메니티 보기">
        {(Object.keys(AMENITY_WORKSPACE_TABS) as AmenityWorkspaceTab[]).map((tabId) => {
          const tab = AMENITY_WORKSPACE_TABS[tabId];
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={workspaceTab === tabId}
              className={`amenity-page__tab${workspaceTab === tabId ? ' is-active' : ''}`}
              onClick={() => setWorkspaceTab(tabId)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <p className="amenity-page__tab-hint">{activeTabCopy.description}</p>

      {workspaceTab === 'inventory' ? (
        <div className="amenity-page__workspace">
          <AmenityInventoryGrid
            items={items}
            selectedId={selectedId}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
            onDownloadHistory={() => void handleDownloadHistory()}
            onOpenHistory={() => setWorkspaceTab('history')}
            downloadBusy={downloadBusy}
          />
          <div className="amenity-side-stack">
            <AmenityTransactionPanel
              items={items}
              selectedId={selectedId}
              author={authorLabel || session.name}
              canTransact={hasSession}
              busy={isFetching}
              onSelect={handleSelect}
              onSuccess={() => {
                showToast('처리되었습니다.');
                void refetch();
                void refetchHistory();
              }}
              onMinQuantitySaved={() => {
                showToast('최소 재고가 저장되었습니다.');
                void refetch();
              }}
              onError={showToast}
            />
          </div>
        </div>
      ) : (
        <div className="amenity-page__workspace amenity-page__workspace--history">
          {historyLoading ? (
            <p className="empty-state">입출고 기록을 불러오는 중…</p>
          ) : (
            <AmenityTransactionHistory
              variant="full"
              transactions={allTransactions}
              items={items}
              author={authorLabel || session.name}
              canEdit={hasSession}
              onSuccess={() => {
                void refetch();
                void refetchHistory();
              }}
            />
          )}
        </div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
