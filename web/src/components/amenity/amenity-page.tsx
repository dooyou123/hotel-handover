'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AmenityOrderSheet } from '@/components/amenity/amenity-order-sheet';
import { AmenityInventoryGrid } from '@/components/amenity/inventory-grid';
import { AmenityTransactionPanel } from '@/components/amenity/transaction-panel';
import { AmenityTransactionHistory } from '@/components/amenity/transaction-history';
import { fetchAmenityInventoryData, subscribeAmenityChanges } from '@/lib/amenity/api';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { todayDateString } from '@/lib/handover/shift-summary';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useTodos } from '@/lib/todos/use-todos';
import { buildAmenityOrderLines, buildAmenityOrderText } from '@/lib/amenity/order-sheet';

export function AmenityPageClient() {
  const { session, authorLabel, requireSession } = useWorkSession();
  const { createTodo } = useTodos();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session.shift && session.group && session.name);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [todoBusy, setTodoBusy] = useState(false);

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
        priority: 'today',
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
  const transactions = data?.transactions ?? [];

  return (
    <section className="amenity-page">
      {!hasSession ? (
        <p className="amenity-page__hint">「지금 근무」 설정 후 입출고 가능</p>
      ) : null}

      <AmenityOrderSheet
        items={items}
        onToast={showToast}
        onCreateTodo={() => void handleCreateTodoFromOrder()}
        createTodoBusy={todoBusy}
      />

      <div className="amenity-page__workspace">
        <AmenityInventoryGrid
          items={items}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
        />
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
          }}
          onMinQuantitySaved={() => {
            showToast('최소 재고가 저장되었습니다.');
            void refetch();
          }}
          onError={showToast}
        />
      </div>

      <AmenityTransactionHistory
        transactions={transactions}
        items={items}
        author={authorLabel || session.name}
        canEdit={hasSession}
        onSuccess={() => void refetch()}
        collapsible
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
