'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AmenityInventoryGrid, AmenityStatsBar } from '@/components/amenity/inventory-grid';
import { AmenityTransactionForm } from '@/components/amenity/transaction-form';
import { AmenityTransactionHistory } from '@/components/amenity/transaction-history';
import { fetchAmenityInventoryData, subscribeAmenityChanges } from '@/lib/amenity/api';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';

export function AmenityPageClient() {
  const { session, authorLabel } = useWorkSession();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session.shift && session.name);

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
        <p>입고·출고는 상단 「지금 근무」에서 교대와 담당자를 선택한 뒤 등록하세요.</p>
      </div>

      {!hasSession ? (
        <p className="empty-state" style={{ marginBottom: '1rem' }}>
          상단 「지금 근무」에서 교대와 담당자를 선택하면 입고/출고를 등록할 수 있습니다.
        </p>
      ) : null}

      <AmenityStatsBar items={items} />

      <div className="amenity-layout">
        <AmenityInventoryGrid items={items} />
        {hasSession ? (
          <AmenityTransactionForm items={items} author={authorLabel || session.name} onSuccess={() => void refetch()} />
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
    </section>
  );
}
