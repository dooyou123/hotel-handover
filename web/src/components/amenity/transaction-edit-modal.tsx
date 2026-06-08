'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  getEffectiveStockForEdit,
  type AmenityTransaction,
  type AmenityTransactionType,
  type InventoryItem,
} from '@/lib/amenity/types';

interface TransactionEditModalProps {
  open: boolean;
  transaction: AmenityTransaction | null;
  items: InventoryItem[];
  author: string;
  onClose: () => void;
  onSave: (input: {
    type: AmenityTransactionType;
    amenityId: number;
    boxCount: number;
    memo: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function AmenityTransactionEditModal({
  open,
  transaction,
  items,
  author,
  onClose,
  onSave,
  onDelete,
}: TransactionEditModalProps) {
  const [type, setType] = useState<AmenityTransactionType>('출고');
  const [amenityId, setAmenityId] = useState<number | null>(null);
  const [boxCount, setBoxCount] = useState(1);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transaction) return;
    setType(transaction.type);
    setAmenityId(transaction.amenity_id);
    setBoxCount(transaction.box_count);
    setMemo(transaction.memo);
    setError(null);
  }, [open, transaction]);

  if (!open || !transaction) return null;

  const selected = items.find((item) => item.id === amenityId);
  const totalItems = selected ? boxCount * selected.unit_size : 0;
  const effectiveStock =
    amenityId != null ? getEffectiveStockForEdit(items, transaction, amenityId) : 0;
  const isStockInsufficient = type === '출고' && totalItems > effectiveStock;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!amenityId || boxCount < 1) {
      setError('어메니티와 박스 수를 확인해 주세요.');
      return;
    }
    if (isStockInsufficient) {
      setError(
        `재고가 부족합니다. 수정 가능 ${effectiveStock.toLocaleString()}개, 요청 ${totalItems.toLocaleString()}개`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ type, amenityId, boxCount, memo });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    const label = transaction.amenities?.name ?? '거래';
    if (!window.confirm(`${label} ${transaction.type} ${transaction.box_count}박스 내역을 삭제할까요?\n재고가 되돌려집니다.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <div>
              <h2>거래 내역 수정</h2>
              <p className="shift-modal__sub">수정·삭제 시 재고가 자동으로 조정됩니다</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

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
            <select value={amenityId ?? ''} onChange={(e) => setAmenityId(Number(e.target.value))}>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (현재 {item.quantity.toLocaleString()}개)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>박스 수</span>
            <div className="amenity-box-stepper">
              <button type="button" onClick={() => setBoxCount((n) => Math.max(1, n - 1))} aria-label="박스 수 줄이기">
                −
              </button>
              <input
                type="number"
                min={1}
                value={boxCount}
                onChange={(e) => setBoxCount(Math.max(1, Number(e.target.value)))}
              />
              <button type="button" onClick={() => setBoxCount((n) => n + 1)} aria-label="박스 수 늘리기">
                +
              </button>
            </div>
          </label>

          <div className="amenity-qty-preview" style={{ marginTop: '0.85rem' }}>
            <div className="amenity-qty-preview__label">
              <span>반영 수량</span>
              {selected ? <span>1박스 = {selected.unit_size}개</span> : null}
            </div>
            <p className="amenity-qty-preview__value">
              {totalItems.toLocaleString()}
              <span>개</span>
            </p>
          </div>

          {type === '출고' ? (
            <p className="amenity-qty-preview__label" style={{ marginTop: '0.5rem' }}>
              수정 가능 재고: {effectiveStock.toLocaleString()}개 · 작성자: {author || transaction.author}
            </p>
          ) : null}

          {isStockInsufficient ? (
            <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>
              출고 수량이 수정 가능 재고({effectiveStock.toLocaleString()}개)를 초과합니다.
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

          <div className="modal__footer">
            <div className="modal__footer-left">
              <button
                type="button"
                className="btn btn--danger"
                disabled={deleting || saving}
                onClick={() => void handleDelete()}
              >
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="submit" disabled={saving || deleting || isStockInsufficient} className="btn btn--primary">
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
