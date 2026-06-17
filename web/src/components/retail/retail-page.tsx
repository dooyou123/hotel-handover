'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  closeRetailPeriod,
  fetchRetailPeriodBundle,
  fetchRetailPeriods,
  saveRetailPeriodLines,
  subscribeRetailChanges,
} from '@/lib/retail/api';
import { calcDifferenceQty, calcTheoreticalQty } from '@/lib/retail/calc';
import {
  defaultSettlementYearMonth,
  formatYearMonthLabel,
  shiftYearMonth,
} from '@/lib/retail/format';
import type { RetailPeriodLineInput, RetailSettlementRow } from '@/lib/retail/types';
import { formatSupabaseClientError } from '@/lib/supabase/env';

type EditableField = 'restock_qty' | 'sales_qty' | 'free_qty' | 'actual_qty';

type DraftLine = {
  product_id: number;
  restock_qty: number;
  sales_qty: number;
  free_qty: number;
  actual_qty: number;
  line_notes: string;
};

function toDraftLine(row: RetailSettlementRow): DraftLine {
  return {
    product_id: row.product_id,
    restock_qty: row.restock_qty,
    sales_qty: row.sales_qty,
    free_qty: row.free_qty,
    actual_qty: row.actual_qty,
    line_notes: row.line_notes,
  };
}

function parseQty(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function differenceClass(diff: number): string {
  if (diff === 0) return 'retail-table__diff--ok';
  if (diff < 0) return 'retail-table__diff--short';
  return 'retail-table__diff--over';
}

export function RetailPageClient() {
  const { authorLabel, requireSession, session } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session.shift && session.group && session.name);

  const [yearMonth, setYearMonth] = useState(defaultSettlementYearMonth);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const bundleQuery = useQuery({
    queryKey: ['retail', DEFAULT_HOTEL_ID, yearMonth],
    queryFn: () => fetchRetailPeriodBundle(DEFAULT_HOTEL_ID, yearMonth),
  });

  const historyQuery = useQuery({
    queryKey: ['retail-periods', DEFAULT_HOTEL_ID],
    queryFn: () => fetchRetailPeriods(DEFAULT_HOTEL_ID),
  });

  useEffect(() => {
    const unsubscribe = subscribeRetailChanges(DEFAULT_HOTEL_ID, () => {
      void queryClient.invalidateQueries({ queryKey: ['retail', DEFAULT_HOTEL_ID] });
      void queryClient.invalidateQueries({ queryKey: ['retail-periods', DEFAULT_HOTEL_ID] });
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!bundleQuery.data) return;
    setDraft(bundleQuery.data.lines.map(toDraftLine));
    setDirty(false);
  }, [bundleQuery.data]);

  const isClosed = bundleQuery.data?.period.status === 'closed';
  const rows = useMemo(() => {
    const products = bundleQuery.data?.products ?? [];
    const productMap = new Map(products.map((product) => [product.id, product.name]));
    const openingMap = new Map(
      (bundleQuery.data?.lines ?? []).map((line) => [line.product_id, line.opening_qty]),
    );

    return draft.map((line) => {
      const opening_qty = openingMap.get(line.product_id) ?? 0;
      const theoretical_qty = calcTheoreticalQty({ ...line, opening_qty });
      const difference_qty = calcDifferenceQty(line.actual_qty, theoretical_qty);
      return {
        ...line,
        opening_qty,
        product_name: productMap.get(line.product_id) ?? '—',
        theoretical_qty,
        difference_qty,
      };
    });
  }, [bundleQuery.data, draft]);

  const summary = useMemo(() => {
    const mismatches = rows.filter((row) => row.difference_qty !== 0).length;
    return { mismatches, total: rows.length };
  }, [rows]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  function updateLine(productId: number, field: EditableField, value: string) {
    if (isClosed) return;
    setDraft((prev) =>
      prev.map((line) =>
        line.product_id === productId ? { ...line, [field]: parseQty(value) } : line,
      ),
    );
    setDirty(true);
  }

  async function handleSave() {
    if (!requireSession('저장')) return;
    if (!bundleQuery.data || isClosed) return;
    setSaving(true);
    try {
      const inputs: RetailPeriodLineInput[] = draft.map((line) => ({
        product_id: line.product_id,
        restock_qty: line.restock_qty,
        sales_qty: line.sales_qty,
        free_qty: line.free_qty,
        actual_qty: line.actual_qty,
        line_notes: line.line_notes,
      }));
      await saveRetailPeriodLines(bundleQuery.data.period.id, DEFAULT_HOTEL_ID, inputs);
      setDirty(false);
      showToast('저장했습니다.');
      await queryClient.invalidateQueries({ queryKey: ['retail', DEFAULT_HOTEL_ID, yearMonth] });
    } catch (error) {
      showToast(formatSupabaseClientError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!requireSession('마감')) return;
    if (!bundleQuery.data || isClosed) return;

    if (dirty) {
      showToast('저장하지 않은 변경이 있습니다. 먼저 저장해 주세요.');
      return;
    }

    const ok = await confirm({
      title: `${formatYearMonthLabel(yearMonth)} 마감`,
      message:
        summary.mismatches > 0
          ? `차이가 있는 품목이 ${summary.mismatches}개 있습니다. 실사 수량을 기준으로 다음 달 이월됩니다. 마감할까요?`
          : '이번 달 정산을 마감하면 수정할 수 없습니다. 마감할까요?',
      confirmLabel: '마감',
    });
    if (!ok) return;

    setClosing(true);
    try {
      await closeRetailPeriod(bundleQuery.data.period.id, authorLabel || session.name);
      showToast('마감했습니다.');
      await queryClient.invalidateQueries({ queryKey: ['retail', DEFAULT_HOTEL_ID] });
      await queryClient.invalidateQueries({ queryKey: ['retail-periods', DEFAULT_HOTEL_ID] });
    } catch (error) {
      showToast(formatSupabaseClientError(error));
    } finally {
      setClosing(false);
    }
  }

  if (bundleQuery.isLoading) {
    return <p className="empty-state">데이터 불러오는 중…</p>;
  }

  if (bundleQuery.error) {
    return (
      <p className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
        {bundleQuery.error instanceof Error ? bundleQuery.error.message : '데이터를 불러오지 못했습니다.'}
        <br />
        Supabase SQL Editor에서 052_retail_products 마이그레이션을 실행했는지 확인해 주세요.
      </p>
    );
  }

  const closedPeriods = (historyQuery.data ?? []).filter((period) => period.status === 'closed');

  return (
    <section className="retail-page">
      <header className="retail-page__header schedule-panel">
        <div className="retail-page__headline">
          <h2 className="retail-page__title">판매상품 재고</h2>
          <p className="retail-page__desc">
            월초에 지난달 판매·무료배포·입고를 입력하고, 실사 수량과 맞춰 마감합니다.
          </p>
        </div>
        <div className="retail-page__month-nav">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setYearMonth((prev) => shiftYearMonth(prev, -1))}
          >
            ← 이전 달
          </button>
          <strong className="retail-page__month-label">{formatYearMonthLabel(yearMonth)}</strong>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setYearMonth((prev) => shiftYearMonth(prev, 1))}
          >
            다음 달 →
          </button>
        </div>
        <div className="retail-page__actions">
          {isClosed ? (
            <span className="retail-page__status retail-page__status--closed">마감됨</span>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--outline btn--small"
                disabled={!hasSession || saving || !dirty}
                onClick={() => void handleSave()}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--small"
                disabled={!hasSession || closing || dirty}
                onClick={() => void handleClose()}
              >
                {closing ? '마감 중…' : '마감'}
              </button>
            </>
          )}
        </div>
      </header>

      {!hasSession ? (
        <p className="retail-page__hint">「지금 근무」 설정 후 저장·마감 가능</p>
      ) : null}

      <div className="retail-page__summary">
        <span>품목 {summary.total}개</span>
        <span className={summary.mismatches ? 'retail-page__summary-warn' : ''}>
          차이 {summary.mismatches}개
        </span>
        {dirty ? <span className="retail-page__summary-warn">저장 안 됨</span> : null}
      </div>

      <div className="retail-page__table-wrap schedule-panel">
        <table className="retail-table">
          <thead>
            <tr>
              <th>품목</th>
              <th>이월</th>
              <th>입고</th>
              <th>판매</th>
              <th>무료</th>
              <th>이론 잔량</th>
              <th>실사</th>
              <th>차이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id} className={row.difference_qty !== 0 ? 'retail-table__row--warn' : ''}>
                <th scope="row" className="retail-table__name">
                  {row.product_name}
                </th>
                <td className="retail-table__readonly">{row.opening_qty}</td>
                <td>
                  {isClosed ? (
                    row.restock_qty
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className="retail-table__input"
                      value={row.restock_qty}
                      onChange={(event) => updateLine(row.product_id, 'restock_qty', event.target.value)}
                    />
                  )}
                </td>
                <td>
                  {isClosed ? (
                    row.sales_qty
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className="retail-table__input"
                      value={row.sales_qty}
                      onChange={(event) => updateLine(row.product_id, 'sales_qty', event.target.value)}
                    />
                  )}
                </td>
                <td>
                  {isClosed ? (
                    row.free_qty
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className="retail-table__input"
                      value={row.free_qty}
                      onChange={(event) => updateLine(row.product_id, 'free_qty', event.target.value)}
                    />
                  )}
                </td>
                <td className="retail-table__readonly">{row.theoretical_qty}</td>
                <td>
                  {isClosed ? (
                    <strong>{row.actual_qty}</strong>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className="retail-table__input retail-table__input--actual"
                      value={row.actual_qty}
                      onChange={(event) => updateLine(row.product_id, 'actual_qty', event.target.value)}
                    />
                  )}
                </td>
                <td className={`retail-table__diff ${differenceClass(row.difference_qty)}`}>
                  {row.difference_qty > 0 ? `+${row.difference_qty}` : row.difference_qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {closedPeriods.length ? (
        <aside className="retail-page__history schedule-panel">
          <h3>마감 이력</h3>
          <ul className="retail-history">
            {closedPeriods.map((period) => (
              <li key={period.id}>
                <button
                  type="button"
                  className={`retail-history__item${period.year_month === yearMonth ? ' is-active' : ''}`}
                  onClick={() => setYearMonth(period.year_month)}
                >
                  <span>{formatYearMonthLabel(period.year_month)}</span>
                  <span className="retail-history__meta">
                    {period.closed_by || '—'}
                    {period.closed_at
                      ? ` · ${new Date(period.closed_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`
                      : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <p className="retail-page__formula">
        이론 잔량 = 이월 + 입고 − 판매 − 무료 · 차이 = 실사 − 이론 잔량 · 마감 시 실사가 다음 달 이월
      </p>

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
