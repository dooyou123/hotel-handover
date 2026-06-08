'use client';

import { useState } from 'react';
import { AmenityTransactionEditModal } from '@/components/amenity/transaction-edit-modal';
import {
  deleteAmenityTransaction,
  updateAmenityTransaction,
} from '@/lib/amenity/api';
import { formatAmenityDateTime, type AmenityTransaction, type InventoryItem } from '@/lib/amenity/types';

interface TransactionHistoryProps {
  transactions: AmenityTransaction[];
  items: InventoryItem[];
  author: string;
  canEdit: boolean;
  onSuccess: () => void;
}

export function AmenityTransactionHistory({
  transactions,
  items,
  author,
  canEdit,
  onSuccess,
}: TransactionHistoryProps) {
  const [editing, setEditing] = useState<AmenityTransaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <>
      <section className="schedule-panel">
        <div className="schedule-panel__header">
          <div>
            <h3>최근 거래 내역</h3>
            <p>최근 {transactions.length}건{canEdit ? ' · 행을 눌러 수정' : ''}</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="empty-state">아직 거래 내역이 없습니다</p>
        ) : (
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>시간</th>
                  <th>구분</th>
                  <th>어메니티</th>
                  <th>소박스</th>
                  <th>총개수</th>
                  <th>작성자</th>
                  <th>메모</th>
                  {canEdit ? <th aria-label="작업" /> : null}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatAmenityDateTime(tx.created_at)}</td>
                    <td>
                      <span
                        className={`amenity-card__badge ${tx.type === '입고' ? 'amenity-card__badge--ok' : 'amenity-card__badge--critical'}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td>{tx.amenities?.name ?? '-'}</td>
                    <td>{tx.box_count}</td>
                    <td>{tx.total_items.toLocaleString()}</td>
                    <td>{tx.author}</td>
                    <td className={tx.memo ? undefined : 'schedule-table__empty'}>{tx.memo || '—'}</td>
                    {canEdit ? (
                      <td>
                        <div className="schedule-table__actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => setEditing(tx)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small btn--danger-text"
                            onClick={async () => {
                              const label = tx.amenities?.name ?? '거래';
                              if (
                                !window.confirm(
                                  `${label} ${tx.type} 소박스 ${tx.box_count} (${tx.total_items}개) 내역을 삭제할까요?\n재고가 되돌려집니다.`,
                                )
                              ) {
                                return;
                              }
                              try {
                                await deleteAmenityTransaction({ transactionId: tx.id });
                                showToast('거래 내역이 삭제되었습니다.');
                                onSuccess();
                              } catch (err) {
                                window.alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AmenityTransactionEditModal
        open={editing != null}
        transaction={editing}
        items={items}
        author={author}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (!editing) return;
          await updateAmenityTransaction({
            transactionId: editing.id,
            type: input.type,
            amenityId: input.amenityId,
            boxCount: input.boxCount,
            author,
            memo: input.memo,
          });
          showToast('거래 내역이 수정되었습니다.');
          onSuccess();
        }}
        onDelete={async () => {
          if (!editing) return;
          await deleteAmenityTransaction({ transactionId: editing.id });
          showToast('거래 내역이 삭제되었습니다.');
          onSuccess();
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
