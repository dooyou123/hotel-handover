'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { addAmenityTransaction, adjustAmenityInventory, updateAmenityMinQuantity } from '@/lib/amenity/api';
import { AMENITY_MODE_HINTS } from '@/lib/amenity/copy';
import { orderBoxItemCount } from '@/lib/amenity/reorder';
import type { AmenityTransactionType, InventoryItem } from '@/lib/amenity/types';
import { getStockStatus, STOCK_BADGE_CLASS, STOCK_LABELS } from '@/lib/amenity/ui';

type PanelMode = AmenityTransactionType | '실사';

interface TransactionPanelProps {
  items: InventoryItem[];
  selectedId: number | null;
  author: string;
  canTransact: boolean;
  busy: boolean;
  onSelect: (id: number) => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  onMinQuantitySaved?: () => void;
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
  onMinQuantitySaved,
}: TransactionPanelProps) {
  const [minQtyText, setMinQtyText] = useState('0');
  const [mode, setMode] = useState<PanelMode>('출고');
  const [quantityText, setQuantityText] = useState('1');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  function parseQuantityText(value: string): number {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
  }

  const quantity = parseQuantityText(quantityText);
  const isCountMode = mode === '실사';

  function setQuantity(value: number) {
    setQuantityText(String(Math.max(isCountMode ? 0 : 1, value)));
  }

  useEffect(() => {
    if (!selected) return;
    setMemo('');
    setMinQtyText(String(selected.minQuantity ?? 0));
    if (mode === '실사') {
      setQuantityText(String(selected.quantity));
    } else {
      setQuantityText('1');
    }
  }, [selected?.id, selected?.minQuantity, selected?.quantity, mode]);

  if (!selected) {
    return (
      <aside className="amenity-side-panel">
        <p className="empty-state">품목이 없습니다.</p>
      </aside>
    );
  }

  const status = getStockStatus(selected.quantity, selected.box_size);
  const isStockInsufficient = mode === '출고' && quantity > selected.quantity;
  const orderFillQty = orderBoxItemCount(selected.orderBoxes, selected.box_size);
  const countDelta = isCountMode && quantity >= 0 ? quantity - selected.quantity : 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canTransact) {
      onError('상단 「지금 근무」를 먼저 설정해 주세요.');
      return;
    }

    if (isCountMode) {
      if (quantity < 0) {
        onError('실사 수량을 0 이상 숫자로 입력해 주세요.');
        return;
      }
      if (countDelta === 0) {
        onError('시스템 재고와 실사 수량이 같습니다.');
        return;
      }
      setSubmitting(true);
      try {
        await adjustAmenityInventory({
          amenityId: selected!.id,
          actualQuantity: quantity,
          currentQuantity: selected!.quantity,
          author,
          memo,
        });
        setMemo('');
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : '재고조정에 실패했습니다.');
      } finally {
        setSubmitting(false);
      }
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
        type: mode,
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

  const submitLabel = submitting
    ? '저장 중…'
    : isCountMode
      ? countDelta === 0
        ? '재고 맞추기'
        : countDelta > 0
          ? `입고 ${countDelta.toLocaleString()}개 맞추기`
          : `출고 ${Math.abs(countDelta).toLocaleString()}개 맞추기`
      : `${mode} ${quantity >= 1 ? quantity.toLocaleString() : '0'}개`;

  return (
    <aside className="amenity-side-panel schedule-panel amenity-side-panel--compact">
      <div className="amenity-side-panel__head">
        <div className="amenity-side-panel__title-row">
          <h3>{selected.name}</h3>
          <span className={`amenity-stock-badge ${STOCK_BADGE_CLASS[status]}`}>
            {STOCK_LABELS[status]}
          </span>
        </div>
        <p className="amenity-side-panel__stock-line">
          재고 <strong>{selected.quantity.toLocaleString()}개</strong>
          <span>· {selected.remainingBoxes}박스</span>
          {selected.orderBoxes > 0 ? (
            <span className="amenity-side-panel__order-hint">· 발주 {selected.orderBoxes}박스</span>
          ) : null}
        </p>
      </div>

      <form className="amenity-side-panel__form" onSubmit={handleSubmit}>
        <div className="amenity-type-toggle amenity-type-toggle--triple" role="group" aria-label="작업 구분">
          {(
            [
              { id: '출고', className: 'is-active--out' },
              { id: '입고', className: 'is-active--in' },
              { id: '실사', className: 'is-active--count' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={mode === item.id ? item.className : undefined}
              onClick={() => setMode(item.id)}
              disabled={busy || submitting}
            >
              {item.id}
            </button>
          ))}
        </div>
        <p className="amenity-side-panel__mode-hint">{AMENITY_MODE_HINTS[mode]}</p>

        <label className="field">
          <span>{isCountMode ? '실제 개수' : '수량 (개)'}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="amenity-qty-input"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => {
              if (isCountMode) {
                if (parseQuantityText(quantityText) < 0) setQuantityText(String(selected.quantity));
              } else if (parseQuantityText(quantityText) < 1) {
                setQuantityText('1');
              }
            }}
            placeholder={isCountMode ? '실사한 개수' : '숫자 입력'}
            disabled={busy || submitting}
          />
        </label>

        {!isCountMode && mode === '입고' && selected.orderBoxes > 0 ? (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(orderFillQty)}
          >
            발주 권장량 ({orderFillQty.toLocaleString()}개)
          </button>
        ) : null}

        {!isCountMode && mode === '입고' ? (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(selected.box_size)}
          >
            1발주박스 ({selected.box_size.toLocaleString()}개)
          </button>
        ) : null}

        {!isCountMode && mode === '출고' ? (
          <button
            type="button"
            className="btn btn--ghost btn--small amenity-side-panel__quick"
            disabled={busy || submitting}
            onClick={() => setQuantity(selected.unit_size)}
          >
            1박스 ({selected.unit_size.toLocaleString()}개)
          </button>
        ) : null}

        {isCountMode && countDelta !== 0 && quantity >= 0 ? (
          <p className={`amenity-adjust-panel__delta${countDelta > 0 ? ' is-plus' : ' is-minus'}`}>
            시스템 {selected.quantity.toLocaleString()}개 → 실사 {quantity.toLocaleString()}개
          </p>
        ) : null}

        {isStockInsufficient ? (
          <p className="amenity-alert">출고 수량이 재고를 초과합니다.</p>
        ) : null}

        <label className="field">
          <span>{isCountMode ? '사유 (선택)' : '메모 (선택)'}</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={isCountMode ? '예: 실사 차이, 파손 폐기' : '예: 3층 비치'}
            disabled={busy || submitting}
          />
        </label>

        <button
          type="submit"
          className={`btn amenity-side-panel__submit ${
            mode === '출고'
              ? 'btn--danger amenity-side-panel__submit--out'
              : mode === '입고'
                ? 'btn--primary'
                : 'btn--ghost amenity-side-panel__submit--count'
          }`}
          disabled={
            !canTransact ||
            busy ||
            submitting ||
            isStockInsufficient ||
            (isCountMode && (quantity < 0 || countDelta === 0))
          }
        >
          {submitLabel}
        </button>
      </form>

      <details className="amenity-side-panel__settings">
        <summary>알림·품목 설정</summary>
        <label className="field">
          <span>최소 재고 알림</span>
          <div className="amenity-side-panel__settings-row">
            <input
              type="number"
              min={0}
              value={minQtyText}
              onChange={(e) => setMinQtyText(e.target.value)}
              disabled={busy || submitting}
            />
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              disabled={busy || submitting}
              onClick={async () => {
                try {
                  await updateAmenityMinQuantity(selected.id, Number(minQtyText) || 0);
                  onMinQuantitySaved?.();
                } catch (err) {
                  onError(err instanceof Error ? err.message : '저장에 실패했습니다.');
                }
              }}
            >
              저장
            </button>
          </div>
        </label>
        <label className="field">
          <span>다른 품목</span>
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
      </details>
    </aside>
  );
}
