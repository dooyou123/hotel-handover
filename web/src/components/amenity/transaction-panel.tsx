'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { addAmenityTransaction } from '@/lib/amenity/api';
import { orderBoxItemCount } from '@/lib/amenity/reorder';
import type { AmenityTransactionType, InventoryItem } from '@/lib/amenity/types';
import { getStockStatus, STOCK_BADGE_CLASS, STOCK_LABELS } from '@/lib/amenity/ui';

interface TransactionPanelProps {
  items: InventoryItem[];
  selectedId: number | null;
  author: string;
  canTransact: boolean;
  busy: boolean;
  onSelect: (id: number) => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function AmenityTransactionPanel({
  items,
  selectedId,
  author,
  canTransact,
  busy,
  onSelect,
  onSuccess,
  onError,
}: TransactionPanelProps) {
  const [type, setType] = useState<AmenityTransactionType>('출고');
  const [quantityText, setQuantityText] = useState('1');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  function parseQuantityText(value: string): number {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
  }

  const quantity = parseQuantityText(quantityText);

  function setQuantity(value: number) {
    setQuantityText(String(Math.max(1, value)));
  }

  useEffect(() => {
    setQuantityText('1');
    setMemo('');
  }, [selected?.id, type]);

  if (!selected) {
    return (
      <aside className="amenity-side-panel">
        <p className="empty-state">품목이 없습니다.</p>
      </aside>
    );
  }

  const status = getStockStatus(selected.quantity, selected.box_size);
  const isStockInsufficient = type === '출고' && selected.quantity < quantity;
  const orderFillQty = orderBoxItemCount(selected.orderBoxes, selected.box_size);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canTransact) {
      onError('상단 「지금 근무」를 먼저 설정해 주세요.');
      return;
    }
    if (quantity < 1) {
      onError('수량은 1 이상 숫자로 입력해 주세요.');
      return;
    }
    if (isStockInsufficient) {
      onError(`재고가 부족합니다. (현재 ${selected!.quantity.toLocaleString()}개)`);
      return;
    }

    setSubmitting(true);
    try {
      await addAmenityTransaction({
        type,
        amenityId: selected!.id,
        quantity,
        author,
        memo,
      });
      setQuantityText('1');
      setMemo('');
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="amenity-side-panel schedule-panel">
      <div className="amenity-side-panel__head">
        <h3>입출고</h3>
        <p>품목을 선택하고 수량을 입력하세요</p>
      </div>

      <form className="amenity-side-panel__form" onSubmit={handleSubmit}>
        <label className="field">
          <span>품목</span>
          <select
            value={selected.id}
            onChange={(e) => onSelect(Number(e.target.value))}
            disabled={busy || submitting}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="amenity-side-panel__stock">
          <div>
            <span className="amenity-side-panel__stock-label">재고</span>
            <p className="amenity-side-panel__stock-value">
              {selected.quantity.toLocaleString()}
              <span>개</span>
              <em>· {selected.remainingBoxes}박스</em>
            </p>
          </div>
          <span className={`amenity-stock-badge ${STOCK_BADGE_CLASS[status]}`}>
            {STOCK_LABELS[status]}
          </span>
        </div>

        <div className="amenity-side-panel__usage">
          <div>
            <span>30일 사용</span>
            <strong>{selected.monthlyUsage.toLocaleString()}개</strong>
          </div>
          <div>
            <span>발주 권장</span>
            <strong className={selected.orderBoxes > 0 ? 'amenity-side-panel__order-warn' : ''}>
              {selected.orderBoxes > 0 ? `${selected.orderBoxes}박스` : '불필요'}
            </strong>
          </div>
        </div>

        <div className="amenity-type-toggle" role="group" aria-label="거래 구분">
          <button
            type="button"
            className={type === '출고' ? 'is-active--out' : undefined}
            onClick={() => setType('출고')}
            disabled={busy || submitting}
          >
            출고
          </button>
          <button
            type="button"
            className={type === '입고' ? 'is-active--in' : undefined}
            onClick={() => setType('입고')}
            disabled={busy || submitting}
          >
            입고
          </button>
        </div>

        <label className="field">
          <span>수량 (개)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="amenity-qty-input"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => {
              if (parseQuantityText(quantityText) < 1) setQuantityText('1');
            }}
            placeholder="숫자 입력"
            disabled={busy || submitting}
          />
        </label>

        {type === '입고' && selected.orderBoxes > 0 ? (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(orderFillQty)}
          >
            발주 권장량 ({orderFillQty.toLocaleString()}개)
          </button>
        ) : null}

        {type === '입고' ? (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(selected.box_size)}
          >
            1발주박스 ({selected.box_size.toLocaleString()}개)
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(selected.unit_size)}
          >
            1박스 ({selected.unit_size.toLocaleString()}개)
          </button>
        )}

        {isStockInsufficient ? (
          <p className="amenity-alert">출고 수량이 재고를 초과합니다.</p>
        ) : null}

        <label className="field">
          <span>메모 (선택)</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 3층 비치"
            disabled={busy || submitting}
          />
        </label>

        <button
          type="submit"
          className={`btn btn--primary amenity-side-panel__submit${type === '출고' ? ' btn--danger' : ''}`}
          disabled={!canTransact || busy || submitting || isStockInsufficient}
        >
          {submitting ? '저장 중…' : `${type} ${quantity.toLocaleString()}개`}
        </button>
      </form>
    </aside>
  );
}
