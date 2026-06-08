'use client';

import type { InventoryItem } from '@/lib/amenity/types';
import {
  formatAmenityPackHint,
  getAmenityIcon,
  getStockStatus,
  STOCK_BADGE_CLASS,
  STOCK_CARD_CLASS,
  STOCK_LABELS,
  STOCK_METER_CLASS,
} from '@/lib/amenity/ui';

interface StatsBarProps {
  items: InventoryItem[];
}

export function AmenityStatsBar({ items }: StatsBarProps) {
  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
  const emptyCount = items.filter((item) => item.quantity === 0).length;
  const lowCount = items.filter((item) => {
    const status = getStockStatus(item.quantity, item.box_size);
    return status === 'low' || status === 'critical';
  }).length;

  const stats = [
    { label: '총 재고', value: totalStock.toLocaleString(), unit: '개' },
    { label: '품절 품목', value: String(emptyCount), unit: '종', warn: emptyCount > 0 },
    { label: '재고 부족', value: String(lowCount), unit: '종', alert: lowCount > 0 },
    { label: '등록 품목', value: String(items.length), unit: '종' },
  ];

  return (
    <div className="amenity-stats">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className={`amenity-stat${stat.alert ? ' amenity-stat--alert' : stat.warn ? ' amenity-stat--warn' : ''}`}
        >
          <p className="amenity-stat__label">{stat.label}</p>
          <p className="amenity-stat__value">
            {stat.value}
            <span>{stat.unit}</span>
          </p>
        </article>
      ))}
    </div>
  );
}

export type AmenityQuickAction = 'out-small' | 'in-large' | 'custom';

interface InventoryGridProps {
  items: InventoryItem[];
  canTransact: boolean;
  busyKey: string | null;
  onQuickAction: (item: InventoryItem, action: AmenityQuickAction) => void;
}

export function AmenityInventoryGrid({ items, canTransact, busyKey, onQuickAction }: InventoryGridProps) {
  const sorted = [...items].sort((a, b) => {
    const order = { empty: 0, critical: 1, low: 2, ok: 3 };
    const sa = getStockStatus(a.quantity, a.box_size);
    const sb = getStockStatus(b.quantity, b.box_size);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    return a.sort_order - b.sort_order;
  });

  return (
    <section className="schedule-panel">
      <div className="schedule-panel__header schedule-panel__header--split">
        <div>
          <h3>재고 현황</h3>
          <p>카드에서 소박스 1개 출고 · 품절·부족 품목이 상단에 표시됩니다</p>
        </div>
        <span className="shift-stat">
          <strong>{items.length}</strong>종
        </span>
      </div>

      <div className="amenity-inventory-grid">
        {sorted.map((item) => {
          const status = getStockStatus(item.quantity, item.box_size);
          const fillPercent = Math.min(100, Math.round((item.quantity / item.box_size) * 100));
          const canOutSmall = item.quantity >= item.unit_size;
          const outBusy = busyKey === `${item.id}-out-small`;
          const inBusy = busyKey === `${item.id}-in-large`;

          return (
            <article key={item.id} className={`amenity-card ${STOCK_CARD_CLASS[status]}`.trim()}>
              <div className="amenity-card__top">
                <span aria-hidden>{getAmenityIcon(item.name)}</span>
                <span className={`amenity-card__badge ${STOCK_BADGE_CLASS[status]}`}>{STOCK_LABELS[status]}</span>
              </div>

              <h3 className="amenity-card__name">{item.name}</h3>
              <p className="amenity-card__qty">
                {item.quantity.toLocaleString()}
                <span>개</span>
              </p>

              <p className="amenity-card__unit-hint">{formatAmenityPackHint(item.box_size, item.unit_size)}</p>

              <div className="amenity-card__meter">
                <div
                  className={`amenity-card__meter-fill ${STOCK_METER_CLASS[status]}`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>

              <div className="amenity-card__meta">
                <div>
                  <span>비치가능 소박스</span>
                  <strong>{item.availableBoxes}</strong>
                </div>
                <div>
                  <span>대박스</span>
                  <strong>{item.fullBoxes}</strong>
                </div>
              </div>

              {canTransact ? (
                <div className="amenity-card__actions">
                  <button
                    type="button"
                    className="btn btn--danger btn--small amenity-card__action-main"
                    disabled={!canOutSmall || outBusy || Boolean(busyKey && !outBusy)}
                    onClick={() => onQuickAction(item, 'out-small')}
                  >
                    {outBusy
                      ? '처리 중…'
                      : `소박스 1 출고 (${item.unit_size.toLocaleString()}개)`}
                  </button>
                  <div className="amenity-card__actions-row">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={inBusy || Boolean(busyKey && !inBusy)}
                      onClick={() => onQuickAction(item, 'in-large')}
                    >
                      {inBusy ? '…' : `대박스 1 입고`}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={Boolean(busyKey)}
                      onClick={() => onQuickAction(item, 'custom')}
                    >
                      다른 수량
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
