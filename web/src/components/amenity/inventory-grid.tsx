'use client';

import { useMemo } from 'react';
import type { InventoryItem } from '@/lib/amenity/types';
import {
  getStockStatus,
  STOCK_BADGE_CLASS,
  STOCK_CARD_CLASS,
  STOCK_LABELS,
} from '@/lib/amenity/ui';

interface InventoryGridProps {
  items: InventoryItem[];
  selectedId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: number) => void;
  onDownloadHistory?: () => void;
  downloadBusy?: boolean;
}

export function AmenityInventoryGrid({
  items,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onDownloadHistory,
  downloadBusy = false,
}: InventoryGridProps) {
  const sorted = useMemo(() => {
    const order = { empty: 0, critical: 1, low: 2, ok: 3 };
    const query = search.trim().toLowerCase();
    return [...items]
      .filter((item) => !query || item.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (b.orderBoxes !== a.orderBoxes) return b.orderBoxes - a.orderBoxes;
        const sa = getStockStatus(a.quantity, a.box_size);
        const sb = getStockStatus(b.quantity, b.box_size);
        if (order[sa] !== order[sb]) return order[sa] - order[sb];
        return a.sort_order - b.sort_order;
      });
  }, [items, search]);

  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
  const emptyCount = items.filter((item) => item.quantity === 0).length;
  const reorderCount = items.filter((item) => item.orderBoxes > 0).length;
  const monthlyTotal = items.reduce((sum, item) => sum + item.monthlyUsage, 0);

  return (
    <section className="schedule-panel amenity-panel amenity-panel--grid">
      <div className="amenity-toolbar">
        <div className="amenity-toolbar__chips">
          <span className="amenity-chip">
            총 <strong>{totalStock.toLocaleString()}</strong>개
          </span>
          <span className="amenity-chip">
            30일 출고 <strong>{monthlyTotal.toLocaleString()}</strong>개
          </span>
          {reorderCount > 0 ? (
            <span className="amenity-chip amenity-chip--alert">
              발주 필요 <strong>{reorderCount}</strong>종
            </span>
          ) : null}
          {emptyCount > 0 ? (
            <span className="amenity-chip amenity-chip--warn">
              품절 <strong>{emptyCount}</strong>
            </span>
          ) : null}
        </div>
        <div className="amenity-toolbar__actions">
          {onDownloadHistory ? (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={onDownloadHistory}
              disabled={downloadBusy}
            >
              {downloadBusy ? '다운로드 중…' : '기록 CSV'}
            </button>
          ) : null}
          <label className="amenity-search">
            <span className="amenity-search__label">검색</span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="품목 검색"
            />
          </label>
        </div>
      </div>

      <div className="amenity-grid-wrap">
        {sorted.length ? (
          <div className="amenity-grid">
            {sorted.map((item) => {
              const status = getStockStatus(item.quantity, item.box_size);
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`amenity-grid-card ${STOCK_CARD_CLASS[status]}${isSelected ? ' is-selected' : ''}`.trim()}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="amenity-grid-card__top">
                    <span className={`amenity-stock-badge ${STOCK_BADGE_CLASS[status]}`}>
                      {STOCK_LABELS[status]}
                    </span>
                    {item.orderBoxes > 0 ? (
                      <span className="amenity-grid-card__order">발주 {item.orderBoxes}박스</span>
                    ) : null}
                  </div>
                  <h4 className="amenity-grid-card__name">{item.name}</h4>
                  <p className="amenity-grid-card__stock">
                    <strong>{item.quantity.toLocaleString()}</strong>개
                    <span>· {item.remainingBoxes}박스</span>
                    {item.minQuantity > 0 ? <span>· 최소 {item.minQuantity}</span> : null}
                  </p>
                  {item.minQuantity > 0 && item.quantity <= item.minQuantity ? (
                    <p className="amenity-grid-card__low">재고 부족 알림</p>
                  ) : null}
                  <p className="amenity-grid-card__usage">
                    30일 <strong>{item.monthlyUsage.toLocaleString()}</strong>개
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            {search.trim() ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
          </p>
        )}
      </div>
    </section>
  );
}
