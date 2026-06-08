'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { addAmenityTransaction } from '@/lib/amenity/api';
import { formatAmenityPackHint } from '@/lib/amenity/ui';
import type { AmenityTransactionType, InventoryItem } from '@/lib/amenity/types';

export type AmenityFormPreset = {
  amenityId: number;
  type: AmenityTransactionType;
  boxCount: number;
};

interface TransactionFormProps {
  items: InventoryItem[];
  author: string;
  preset: AmenityFormPreset | null;
  onPresetApplied: () => void;
  onSuccess: () => void;
}

export function AmenityTransactionForm({
  items,
  author,
  preset,
  onPresetApplied,
  onSuccess,
}: TransactionFormProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [type, setType] = useState<AmenityTransactionType>('출고');
  const [amenityId, setAmenityId] = useState<number | null>(null);
  const [boxCount, setBoxCount] = useState(1);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    setAmenityId((current) => {
      if (current && items.some((item) => item.id === current)) return current;
      return items[0].id;
    });
  }, [items]);

  useEffect(() => {
    if (!preset) return;
    setAmenityId(preset.amenityId);
    setType(preset.type);
    setBoxCount(preset.boxCount);
    setError(null);
    onPresetApplied();
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [preset, onPresetApplied]);

  const selected = items.find((item) => item.id === amenityId);
  const totalItems = selected ? boxCount * selected.unit_size : 0;
  const isStockInsufficient = type === '출고' && selected != null && selected.quantity < totalItems;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!amenityId || boxCount < 1) {
      setError('어메니티와 소박스 수를 확인해 주세요.');
      return;
    }
    if (isStockInsufficient && selected) {
      setError(
        `재고가 부족합니다. 현재 ${selected.quantity.toLocaleString()}개, 요청 ${totalItems.toLocaleString()}개`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addAmenityTransaction({ type, amenityId, boxCount, author, memo });
      setMemo('');
      setBoxCount(1);
      setType('출고');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0 || amenityId == null) {
    return (
      <section className="schedule-panel amenity-form-panel">
        <p className="staff-list__empty">재고 데이터를 불러오는 중…</p>
      </section>
    );
  }

  return (
    <section ref={panelRef} className="schedule-panel amenity-form-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>다른 수량 · 입고</h3>
          <p>소박스·대박스 단위로 입력 · 등록 즉시 모든 PC에 반영</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="amenity-type-toggle" role="group" aria-label="거래 구분">
          <button
            type="button"
            className={type === '출고' ? 'is-active--out' : undefined}
            onClick={() => setType('출고')}
          >
            출고
          </button>
          <button
            type="button"
            className={type === '입고' ? 'is-active--in' : undefined}
            onClick={() => setType('입고')}
          >
            입고
          </button>
        </div>

        <label className="field" style={{ marginTop: '1rem' }}>
          <span>어메니티</span>
          <select value={amenityId} onChange={(e) => setAmenityId(Number(e.target.value))}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (현재 {item.quantity.toLocaleString()}개 · 소박스 {item.availableBoxes})
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <p className="amenity-card__unit-hint" style={{ marginTop: '0.5rem' }}>
            {formatAmenityPackHint(selected.box_size, selected.unit_size)}
          </p>
        ) : null}

        <label className="field">
          <span>소박스 수</span>
          <div className="amenity-box-stepper">
            <button
              type="button"
              onClick={() => setBoxCount((n) => Math.max(1, n - 1))}
              aria-label="소박스 수 줄이기"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={boxCount}
              onChange={(e) => setBoxCount(Math.max(1, Number(e.target.value)))}
            />
            <button type="button" onClick={() => setBoxCount((n) => n + 1)} aria-label="소박스 수 늘리기">
              +
            </button>
          </div>
        </label>

        {selected && type === '입고' ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            style={{ marginTop: '0.5rem' }}
            onClick={() => setBoxCount(selected.smallBoxesPerLargeBox || 1)}
          >
            대박스 1입고 = 소박스 {selected.smallBoxesPerLargeBox}개
          </button>
        ) : null}

        <div className="amenity-qty-preview" style={{ marginTop: '0.85rem' }}>
          <div className="amenity-qty-preview__label">
            <span>반영 수량 (총개수)</span>
            {selected ? <span>1소박스 = {selected.unit_size.toLocaleString()}개</span> : null}
          </div>
          <p className="amenity-qty-preview__value">
            {totalItems.toLocaleString()}
            <span>개</span>
          </p>
        </div>

        {isStockInsufficient ? (
          <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>
            출고 수량이 현재 재고({selected?.quantity.toLocaleString()}개)를 초과합니다.
          </p>
        ) : null}

        <label className="field" style={{ marginTop: '0.85rem' }}>
          <span>메모 (선택)</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 3층 비치용"
          />
        </label>

        {error ? <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

        <div style={{ marginTop: '1rem' }}>
          <button
            type="submit"
            disabled={submitting || isStockInsufficient}
            className={`btn btn--primary${type === '출고' ? ' btn--danger' : ''}`}
            style={{ width: '100%' }}
          >
            {submitting ? '저장 중…' : `${type} 등록 (소박스 ${boxCount} · ${totalItems.toLocaleString()}개)`}
          </button>
        </div>
      </form>
    </section>
  );
}
