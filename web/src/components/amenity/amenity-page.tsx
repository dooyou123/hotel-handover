'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AmenityInventoryGrid,
  AmenityStatsBar,
  type AmenityQuickAction,
} from '@/components/amenity/inventory-grid';
import {
  AmenityTransactionForm,
  type AmenityFormPreset,
} from '@/components/amenity/transaction-form';
import { AmenityTransactionHistory } from '@/components/amenity/transaction-history';
import { addAmenityTransaction, fetchAmenityInventoryData, subscribeAmenityChanges } from '@/lib/amenity/api';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type { InventoryItem } from '@/lib/amenity/types';

export function AmenityPageClient() {
  const { session, authorLabel } = useWorkSession();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session.shift && session.group && session.name);

  const [formPreset, setFormPreset] = useState<AmenityFormPreset | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(DEFAULT_HOTEL_ID),
  });

  useEffect(() => {
    const unsubscribe = subscribeAmenityChanges(DEFAULT_HOTEL_ID, () => {
      queryClient.invalidateQueries({ queryKey: ['amenity', DEFAULT_HOTEL_ID] });
    });
    return unsubscribe;
  }, [queryClient]);

  const clearFormPreset = useCallback(() => setFormPreset(null), []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleQuickAction(item: InventoryItem, action: AmenityQuickAction) {
    if (action === 'custom') {
      setFormPreset({ amenityId: item.id, type: '출고', boxCount: 1 });
      return;
    }

    const author = authorLabel || session.name;

    if (action === 'out-small') {
      if (item.quantity < item.unit_size) {
        showToast('재고가 부족합니다.');
        return;
      }
      setBusyKey(`${item.id}-out-small`);
      try {
        await addAmenityTransaction({
          type: '출고',
          amenityId: item.id,
          boxCount: 1,
          author,
        });
        showToast(`${item.name} · 소박스 1개 출고 (${item.unit_size.toLocaleString()}개)`);
        await refetch();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '출고에 실패했습니다.');
      } finally {
        setBusyKey(null);
      }
      return;
    }

    if (action === 'in-large') {
      const boxCount = item.smallBoxesPerLargeBox;
      if (boxCount < 1) return;
      setBusyKey(`${item.id}-in-large`);
      try {
        await addAmenityTransaction({
          type: '입고',
          amenityId: item.id,
          boxCount,
          author,
        });
        showToast(`${item.name} · 대박스 1개 입고 (${item.box_size.toLocaleString()}개)`);
        await refetch();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '입고에 실패했습니다.');
      } finally {
        setBusyKey(null);
      }
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
        Supabase SQL Editor에서 003_amenities.sql 마이그레이션을 실행했는지 확인해 주세요.
      </p>
    );
  }

  const items = data?.items ?? [];
  const transactions = data?.transactions ?? [];

  return (
    <section className="schedule-page">
      <div className="schedule-page__intro">
        <h2>어메니티 재고</h2>
        <p>
          평소에는 카드의 <strong>소박스 1 출고</strong>만 누르세요. 배송 입고는{' '}
          <strong>대박스 1 입고</strong>, 예외는 <strong>다른 수량</strong>을 사용합니다.
        </p>
      </div>

      {!hasSession ? (
        <p className="empty-state" style={{ marginBottom: '1rem' }}>
          상단 「지금 근무」에서 교대·조·담당자를 선택하면 입고/출고를 등록할 수 있습니다.
        </p>
      ) : null}

      <AmenityStatsBar items={items} />

      <div className="amenity-layout">
        <AmenityInventoryGrid
          items={items}
          canTransact={hasSession}
          busyKey={busyKey}
          onQuickAction={handleQuickAction}
        />
        {hasSession ? (
          <AmenityTransactionForm
            items={items}
            author={authorLabel || session.name}
            preset={formPreset}
            onPresetApplied={clearFormPreset}
            onSuccess={() => {
              showToast('거래가 등록되었습니다.');
              void refetch();
            }}
          />
        ) : null}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <AmenityTransactionHistory
          transactions={transactions}
          items={items}
          author={authorLabel || session.name}
          canEdit={hasSession}
          onSuccess={() => void refetch()}
        />
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
