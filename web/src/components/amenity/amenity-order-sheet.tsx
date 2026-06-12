'use client';

import { useMemo, useState } from 'react';
import {
  buildAmenityOrderLines,
  buildAmenityOrderText,
  printAmenityOrderSheet,
  type AmenityOrderLine,
} from '@/lib/amenity/order-sheet';
import type { InventoryItem } from '@/lib/amenity/types';

type AmenityOrderSheetProps = {
  items: InventoryItem[];
  onToast?: (message: string) => void;
};

export function AmenityOrderSheet({ items, onToast }: AmenityOrderSheetProps) {
  const lines = useMemo(() => buildAmenityOrderLines(items), [items]);
  const [open, setOpen] = useState(false);

  async function handleCopy() {
    const text = buildAmenityOrderText(lines);
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('발주서를 클립보드에 복사했습니다.');
    } catch {
      onToast?.('복사에 실패했습니다.');
    }
  }

  return (
    <article className="amenity-order-sheet">
      <div className="schedule-panel__header schedule-panel__header--split">
        <div>
          <h3>발주서</h3>
          <p>
            {lines.length
              ? `권장 발주 ${lines.length}품목 · 최근 30일 출고 기준`
              : '현재 발주 권장 품목이 없습니다.'}
          </p>
        </div>
        <div className="amenity-order-sheet__actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setOpen((v) => !v)}>
            {open ? '접기' : '미리보기'}
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => void handleCopy()} disabled={!lines.length}>
            복사
          </button>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => {
              const ok = printAmenityOrderSheet(lines);
              if (!ok) {
                onToast?.('인쇄 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.');
              }
            }}
          >
            인쇄
          </button>
        </div>
      </div>

      {open ? (
        <div className="amenity-order-sheet__preview">
          {lines.length ? (
            <table className="amenity-order-sheet__table">
              <thead>
                <tr>
                  <th>품목</th>
                  <th>현재고</th>
                  <th>30일 출고</th>
                  <th>발주 박스</th>
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line: AmenityOrderLine) => (
                  <tr key={line.id}>
                    <td>{line.name}</td>
                    <td>{line.quantity}</td>
                    <td>{line.monthlyUsage}</td>
                    <td>
                      <strong>{line.orderBoxes}</strong>
                    </td>
                    <td>{line.orderItems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="amenity-order-sheet__empty">재고가 충분합니다.</p>
          )}
          <pre className="amenity-order-sheet__text">{buildAmenityOrderText(lines)}</pre>
        </div>
      ) : null}
    </article>
  );
}
