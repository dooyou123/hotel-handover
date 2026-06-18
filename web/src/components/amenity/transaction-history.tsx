'use client';

import { useMemo, useState } from 'react';
import {
  deleteAmenityTransaction,
  updateAmenityTransaction,
} from '@/lib/amenity/api';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  formatAmenityDateTimeShort,
  type AmenityTransaction,
  type InventoryItem,
} from '@/lib/amenity/types';
import {
  amenityTransactionBadgeClass,
  formatAmenityTransactionQuantity,
  matchesAmenityTransactionFilter,
  resolveAmenityTransactionDisplayType,
  type AmenityTransactionDisplayType,
} from '@/lib/amenity/transaction-display';
import { AMENITY_WORKSPACE_TABS } from '@/lib/amenity/copy';

const PAGE_SIZE_EMBEDDED = 20;
const PAGE_SIZE_FULL = 50;

type TypeFilter = 'all' | AmenityTransactionDisplayType;

interface TransactionHistoryProps {
  transactions: AmenityTransaction[];
  items: InventoryItem[];
  author: string;
  canEdit: boolean;
  onSuccess: () => void;
  selectedAmenityId?: number | null;
  variant?: 'full' | 'embedded';
}

export function AmenityTransactionHistory({
  transactions,
  items,
  author,
  canEdit,
  onSuccess,
  selectedAmenityId = null,
  variant = 'full',
}: TransactionHistoryProps) {
  const embedded = variant === 'embedded';
  const pageSize = embedded ? PAGE_SIZE_EMBEDDED : PAGE_SIZE_FULL;
  const [toast, setToast] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQtyText, setEditQtyText] = useState('1');
  const [editMemo, setEditMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm, alert: showAlert } = useConfirmDialog();

  const selectedName = items.find((item) => item.id === selectedAmenityId)?.name;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function startEdit(tx: AmenityTransaction) {
    if (resolveAmenityTransactionDisplayType(tx) === '실사') return;
    setEditingId(tx.id);
    setEditQtyText(String(tx.total_items));
    setEditMemo(tx.memo);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQtyText('1');
    setEditMemo('');
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (embedded && selectedAmenityId != null && tx.amenity_id !== selectedAmenityId) return false;
      if (!matchesAmenityTransactionFilter(tx, typeFilter)) return false;
      if (!query) return true;
      const name = tx.amenities?.name?.toLowerCase() ?? '';
      return (
        name.includes(query) ||
        tx.author.toLowerCase().includes(query) ||
        tx.memo.toLowerCase().includes(query)
      );
    });
  }, [transactions, typeFilter, embedded, selectedAmenityId, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  async function saveEdit(tx: AmenityTransaction) {
    const quantity = Number.parseInt(editQtyText.trim(), 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      await showAlert({ title: '수량 확인', message: '수량은 1 이상이어야 합니다.', tone: 'danger' });
      return;
    }
    setSaving(true);
    try {
      await updateAmenityTransaction({
        transactionId: tx.id,
        type: tx.type,
        amenityId: tx.amenity_id,
        quantity,
        author,
        memo: editMemo,
      });
      showToast('수정되었습니다.');
      cancelEdit();
      onSuccess();
    } catch (err) {
      await showAlert({
        title: '수정 실패',
        message: err instanceof Error ? err.message : '수정에 실패했습니다.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeTx(tx: AmenityTransaction) {
    const label = tx.amenities?.name ?? '거래';
    const displayType = resolveAmenityTransactionDisplayType(tx);
    const ok = await confirm({
      title: '기록 삭제',
      message: `${label} · ${displayType} · ${formatAmenityTransactionQuantity(tx)}`,
      detail: '삭제하면 재고가 되돌려집니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    try {
      await deleteAmenityTransaction({ transactionId: tx.id });
      showToast('삭제되었습니다.');
      if (editingId === tx.id) cancelEdit();
      onSuccess();
    } catch (err) {
      await showAlert({
        title: '삭제 실패',
        message: err instanceof Error ? err.message : '삭제에 실패했습니다.',
        tone: 'danger',
      });
    }
  }

  return (
    <>
      <section
        className={`amenity-history${embedded ? ' amenity-history--embedded' : ' amenity-history--docked'}`}
        aria-label="최근 거래 내역"
      >
        <header className="amenity-history__head">
          <div className="amenity-history__title-row">
            <h3>{embedded ? '이 품목 기록' : '전체 입출고 기록'}</h3>
            <span className="amenity-history__count">{filtered.length}건</span>
          </div>
          {!embedded ? (
            <>
              <p className="amenity-history__subtitle">{AMENITY_WORKSPACE_TABS.history.description}</p>
              <div className="amenity-history__filters" role="tablist" aria-label="거래 구분">
                {(
                  [
                    { id: 'all', label: '전체' },
                    { id: '출고', label: '출고' },
                    { id: '입고', label: '입고' },
                    { id: '실사', label: '실사' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={typeFilter === item.id}
                    className={`amenity-history__filter${typeFilter === item.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setTypeFilter(item.id);
                      setVisibleCount(pageSize);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="amenity-history__toolbar">
                <label className="amenity-history__search">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setVisibleCount(pageSize);
                    }}
                    placeholder="품목·작성자·메모 검색"
                    autoComplete="off"
                    aria-label="거래 내역 검색"
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="amenity-history__embedded-hint">
              {selectedName ? `${selectedName} 입출고 기록` : '품목을 선택하세요'}
            </p>
          )}
        </header>

        {filtered.length === 0 ? (
          <p className="amenity-history__empty">
            {embedded
              ? '이 품목의 기록이 없습니다.'
              : search || typeFilter !== 'all'
                ? '조건에 맞는 거래 내역이 없습니다.'
                : '아직 거래 내역이 없습니다.'}
          </p>
        ) : (
          <>
            <div className="amenity-history__table-wrap">
              <table className={`amenity-history__table${embedded ? ' amenity-history__table--embedded' : ''}`}>
                <thead>
                  <tr>
                    <th>시간</th>
                    {!embedded ? <th>구분</th> : null}
                    {!embedded ? <th>품목</th> : <th>구분</th>}
                    <th>수량</th>
                    {!embedded ? <th>작성자</th> : null}
                    {canEdit ? <th aria-label="작업" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((tx) => {
                    const displayType = resolveAmenityTransactionDisplayType(tx);
                    const badgeClass = amenityTransactionBadgeClass(displayType);
                    const isAudit = displayType === '실사';

                    return editingId === tx.id ? (
                      <tr key={tx.id} className="amenity-history__edit-row">
                        <td colSpan={embedded ? (canEdit ? 4 : 3) : canEdit ? 6 : 5}>
                          <div className="amenity-history__inline-edit">
                            <span className={`amenity-stock-badge ${badgeClass}`}>
                              {displayType}
                            </span>
                            <label className="amenity-history__inline-field">
                              <span>수량</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editQtyText}
                                onChange={(e) => setEditQtyText(e.target.value.replace(/[^\d]/g, ''))}
                                disabled={saving}
                              />
                            </label>
                            <label className="amenity-history__inline-field amenity-history__inline-field--grow">
                              <span>메모</span>
                              <input
                                type="text"
                                value={editMemo}
                                onChange={(e) => setEditMemo(e.target.value)}
                                placeholder="선택"
                                disabled={saving}
                              />
                            </label>
                            <div className="amenity-history__inline-actions">
                              <button
                                type="button"
                                className="btn btn--primary btn--xs"
                                disabled={saving}
                                onClick={() => void saveEdit(tx)}
                              >
                                {saving ? '저장…' : '저장'}
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--xs"
                                disabled={saving}
                                onClick={cancelEdit}
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--xs btn--danger-text"
                                disabled={saving}
                                onClick={() => void removeTx(tx)}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={tx.id}>
                        <td className="amenity-history__time">{formatAmenityDateTimeShort(tx.created_at)}</td>
                        {!embedded ? (
                          <td>
                            <span className={`amenity-stock-badge ${badgeClass}`}>
                              {displayType}
                            </span>
                          </td>
                        ) : null}
                        {!embedded ? (
                          <td className="amenity-history__item">
                            <span className="amenity-history__item-name">{tx.amenities?.name ?? '—'}</span>
                            {tx.memo ? <span className="amenity-history__memo">{tx.memo}</span> : null}
                          </td>
                        ) : (
                          <td>
                            <span className={`amenity-stock-badge ${badgeClass}`}>
                              {displayType}
                            </span>
                          </td>
                        )}
                        <td className="amenity-history__qty">
                          {formatAmenityTransactionQuantity(tx)}
                          {embedded && tx.memo ? (
                            <span className="amenity-history__memo">{tx.memo}</span>
                          ) : null}
                        </td>
                        {!embedded ? <td>{tx.author}</td> : null}
                        {canEdit ? (
                          <td>
                            <div className="amenity-history__actions">
                              {!isAudit ? (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--xs"
                                  onClick={() => startEdit(tx)}
                                >
                                  수정
                                </button>
                              ) : null}
                              {!embedded ? (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--xs btn--danger-text"
                                  onClick={() => void removeTx(tx)}
                                >
                                  삭제
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore ? (
              <div className="amenity-history__more">
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setVisibleCount((count) => count + pageSize)}
                >
                  더 보기 ({filtered.length - visibleCount}건)
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
