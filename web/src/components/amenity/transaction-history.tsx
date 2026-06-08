'use client';

import { useState } from 'react';
import { AmenityTransactionEditModal } from '@/components/amenity/transaction-edit-modal';
import {
  deleteAmenityTransaction,
  updateAmenityTransaction,
} from '@/lib/amenity/api';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatAmenityDateTime, type AmenityTransaction, type InventoryItem } from '@/lib/amenity/types';

interface TransactionHistoryProps {
  transactions: AmenityTransaction[];
  items: InventoryItem[];
  author: string;
  canEdit: boolean;
  onSuccess: () => void;
  collapsible?: boolean;
}

export function AmenityTransactionHistory({
  transactions,
  items,
  author,
  canEdit,
  onSuccess,
  collapsible = false,
}: TransactionHistoryProps) {
  const [editing, setEditing] = useState<AmenityTransaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, alert: showAlert } = useConfirmDialog();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  const table = transactions.length === 0 ? (
    <p className="amenity-history__empty">아직 거래 내역이 없습니다</p>
  ) : (
    <div className="amenity-history__table-wrap">
      <table className="amenity-history__table">
        <thead>
          <tr>
            <th>시간</th>
            <th>구분</th>
            <th>품목</th>
            <th>수량</th>
            <th>작성자</th>
            {canEdit ? <th aria-label="작업" /> : null}
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 20).map((tx) => (
            <tr key={tx.id}>
              <td>{formatAmenityDateTime(tx.created_at)}</td>
              <td>
                <span
                  className={`amenity-stock-badge ${tx.type === '입고' ? 'amenity-stock-badge--ok' : 'amenity-stock-badge--critical'}`}
                >
                  {tx.type}
                </span>
              </td>
              <td>{tx.amenities?.name ?? '—'}</td>
              <td>{tx.total_items.toLocaleString()}개</td>
              <td>{tx.author}</td>
              {canEdit ? (
                <td>
                  <div className="amenity-history__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => setEditing(tx)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs btn--danger-text"
                      onClick={async () => {
                        const label = tx.amenities?.name ?? '거래';
                        const ok = await confirm({
                          title: '거래 내역 삭제',
                          message: `${label} · ${tx.type} · ${tx.total_items.toLocaleString()}개`,
                          detail: '삭제하면 재고가 되돌려집니다.',
                          tone: 'danger',
                          confirmLabel: '삭제',
                        });
                        if (!ok) return;
                        try {
                          await deleteAmenityTransaction({ transactionId: tx.id });
                          showToast('거래 내역이 삭제되었습니다.');
                          onSuccess();
                        } catch (err) {
                          await showAlert({
                            title: '삭제 실패',
                            message: err instanceof Error ? err.message : '삭제에 실패했습니다.',
                            tone: 'danger',
                          });
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
  );

  return (
    <>
      {collapsible ? (
        <details className="amenity-history">
          <summary>최근 거래 내역 ({transactions.length}건)</summary>
          {table}
        </details>
      ) : (
        <section className="schedule-panel amenity-panel">
          <div className="schedule-panel__header">
            <h3>최근 거래 내역</h3>
          </div>
          {table}
        </section>
      )}

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
            quantity: input.quantity,
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
