'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useProcurement } from '@/lib/procurement/use-procurement';
import {
  DEFAULT_PROCUREMENT_CATEGORIES,
  type ProcurementCategory,
  type ProcurementOrder,
  type ProcurementOrderLine,
  type ProcurementOrderLineInput,
  type ProcurementOrderStatus,
} from '@/lib/procurement/types';
import {
  formatOrderAge,
  fullyReceivedLineCount,
  isLineFullyReceived,
  isOrderOverdue,
  lineReceivedQty,
  lineRemainingQty,
  orderPrimaryCategoryKey,
  todayYmd,
} from '@/lib/procurement/utils';
import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarDateLabel,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type StatusFilter = 'open' | 'done';

type DraftLine = {
  id: string;
  category: string;
  categoryLabel: string;
  itemName: string;
  unit: string;
  quantity: number;
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function labelForCategory(categories: ProcurementCategory[], key: string, fallback = ''): string {
  return categories.find((c) => c.key === key)?.label || fallback || key;
}

function orderCategoryLabel(order: ProcurementOrder, categories: ProcurementCategory[] = []): string {
  const first = order.lines.find((l) => l.item_name.trim()) || order.lines[0];
  if (!first) return '기타';
  return first.category_label || labelForCategory(categories, first.category) || '기타';
}

/** 확인 대화상자 등: 분류 · 품목 */
function orderTitle(order: ProcurementOrder, categories: ProcurementCategory[] = []): string {
  const item = orderItemHeading(order);
  const cat = orderCategoryLabel(order, categories);
  if (!cat || cat === '기타') return item;
  if (order.title.trim()) return order.title.trim();
  return `${cat} · ${item}`;
}

/** 카드 본문 제목: 품목만 (분류는 칩·그룹으로) */
function orderItemHeading(order: ProcurementOrder): string {
  if (order.title.trim()) return order.title.trim();
  const lines = order.lines.filter((l) => l.item_name.trim());
  if (!lines.length) return order.vendor.trim() || '발주 묶음';
  if (lines.length === 1) return lines[0].item_name;
  return `${lines[0].item_name} 외 ${lines.length - 1}건`;
}

function statusLabel(status: ProcurementOrderStatus): string {
  if (status === 'received') return '입고 완료';
  if (status === 'cancelled') return '취소';
  if (status === 'partial') return '일부 입고';
  return '미입고';
}

const OVERDUE_GRACE_DAYS = 3;

function orderTouchesDate(order: ProcurementOrder, date: string): boolean {
  if (order.ordered_at === date) return true;
  return order.lines.some((line) => line.received_at === date);
}

export function ProcurementPageClient() {
  const meta = getNavPageMeta('/procurement');
  const { authorLabel, requireSession } = useWorkSession();
  const { data: isManager = false } = useIsManager();
  const { confirm } = useConfirmDialog();
  const itemInputRef = useRef<HTMLInputElement>(null);
  const {
    categories: dbCategories,
    items,
    orders,
    isLoading,
    error,
    addCategory,
    renameCategory,
    removeCategory,
    addItem,
    createOrder,
    cancelOrder,
    deleteOrder,
    receiveLine,
    unreceiveLine,
    receiveAll,
  } = useProcurement();

  const categories = useMemo(() => {
    if (dbCategories.length) return dbCategories;
    return DEFAULT_PROCUREMENT_CATEGORIES.map((c, index) => ({
      id: c.key,
      hotel_id: '',
      key: c.key,
      label: c.label,
      sort_order: (index + 1) * 10,
      active: true,
      created_by: '',
      created_at: '',
      updated_at: '',
    }));
  }, [dbCategories]);

  const today = todayYmd();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ProcurementOrderLine | null>(null);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState(() => categories[0]?.key ?? 'office');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('개');
  const [vendor, setVendor] = useState('');
  const [orderedAt, setOrderedAt] = useState(today);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    if (!categories.some((c) => c.key === category) && categories[0]) {
      setCategory(categories[0].key);
    }
  }, [categories, category]);

  /** 달력에서 날짜를 고르면 발주일 입력에도 반영 (과거 기록용) */
  useEffect(() => {
    if (selectedDate) setOrderedAt(selectedDate);
  }, [selectedDate]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  const openStatuses: ProcurementOrderStatus[] = ['ordered', 'partial'];
  const openCount = orders.filter((o) => openStatuses.includes(o.status)).length;
  const doneCount = orders.filter(
    (o) => o.status === 'received' || o.status === 'cancelled',
  ).length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const overdueOrders = useMemo(
    () => orders.filter((order) => isOrderOverdue(order, today, OVERDUE_GRACE_DAYS)),
    [orders, today],
  );
  const monthStats = useMemo(() => {
    const inMonth = orders.filter((o) => o.ordered_at.startsWith(month));
    return {
      ordered: inMonth.length,
      open: inMonth.filter((o) => openStatuses.includes(o.status)).length,
      received: inMonth.filter((o) => o.status === 'received').length,
      cancelled: inMonth.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders, month]);

  const dayMarks = useMemo(() => {
    const marks = new Map<string, { ordered: number; received: number }>();
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      const ordered = marks.get(order.ordered_at) ?? { ordered: 0, received: 0 };
      ordered.ordered += 1;
      marks.set(order.ordered_at, ordered);
      for (const line of order.lines) {
        if (!line.received_at) continue;
        const cell = marks.get(line.received_at) ?? { ordered: 0, received: 0 };
        cell.received += 1;
        marks.set(line.received_at, cell);
      }
    }
    return marks;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.filter((order) => {
      if (statusFilter === 'open' && !openStatuses.includes(order.status)) return false;
      if (statusFilter === 'done' && order.status !== 'received' && order.status !== 'cancelled') {
        return false;
      }
      if (selectedDate && !orderTouchesDate(order, selectedDate)) return false;
      if (!q) return true;
      const hay = [
        order.title,
        order.vendor,
        order.note,
        order.ordered_by,
        ...order.lines.map((l) => `${l.item_name} ${l.note} ${l.category_label}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    // 미입고: 오래된 발주가 위에 보이도록
    if (statusFilter === 'open') {
      return [...list].sort((a, b) => {
        const byDate = a.ordered_at.localeCompare(b.ordered_at);
        if (byDate !== 0) return byDate;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return [...list].sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
  }, [orders, statusFilter, selectedDate, search]);

  /** 분류별로 묶어 스캔하기 쉽게 — 목록 등장 순(미입고면 오래된 분류 먼저) */
  const groupedOrders = useMemo(() => {
    const groups: Array<{ key: string; label: string; orders: ProcurementOrder[] }> = [];
    const index = new Map<string, number>();
    for (const order of filteredOrders) {
      const key = orderPrimaryCategoryKey(order);
      let at = index.get(key);
      if (at == null) {
        at = groups.length;
        index.set(key, at);
        groups.push({ key, label: orderCategoryLabel(order, categories), orders: [] });
      }
      groups[at].orders.push(order);
    }
    return groups;
  }, [filteredOrders, categories]);

  function buildCurrentLine(): DraftLine | null {
    const name = itemName.trim();
    if (!name) return null;
    const matched = items.find(
      (item) =>
        item.category === category && item.name.trim().toLowerCase() === name.toLowerCase(),
    );
    return {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      categoryLabel: labelForCategory(categories, category),
      itemName: matched?.name ?? name,
      unit: matched?.unit || unit.trim() || '개',
      quantity: Math.max(1, Math.floor(quantity) || 1),
    };
  }

  function addDraftLine() {
    if (!requireSession('발주 등록')) return;
    const line = buildCurrentLine();
    if (!line) {
      showToast('품목명을 입력해 주세요.');
      itemInputRef.current?.focus();
      return;
    }
    setDraftLines((prev) => [...prev, line]);
    if (line.unit) setUnit(line.unit);
    setItemName('');
    setQuantity(1);
    itemInputRef.current?.focus();
  }

  function removeDraftLine(id: string) {
    setDraftLines((prev) => prev.filter((line) => line.id !== id));
  }

  async function resolveLines(lines: DraftLine[]): Promise<ProcurementOrderLineInput[]> {
    const resolved: ProcurementOrderLineInput[] = [];
    for (const line of lines) {
      let itemId: string | null = null;
      const existing = items.find(
        (item) =>
          item.category === line.category &&
          item.name.trim().toLowerCase() === line.itemName.trim().toLowerCase(),
      );
      if (existing) {
        itemId = existing.id;
      } else {
        const created = await addItem.mutateAsync({
          input: {
            category: line.category,
            name: line.itemName,
            unit: line.unit,
          },
          createdBy: authorLabel,
        });
        itemId = created.id;
      }
      resolved.push({
        itemId,
        category: line.category,
        categoryLabel: line.categoryLabel,
        itemName: line.itemName,
        unit: line.unit,
        quantity: line.quantity,
      });
    }
    return resolved;
  }

  async function submitOrder(lines: DraftLine[]) {
    if (!requireSession('발주 등록')) return;
    if (!lines.length) {
      showToast('품목을 한 줄 이상 넣어 주세요.');
      return;
    }
    if (!authorLabel.trim()) {
      showToast('근무 세션을 먼저 시작해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const resolved = await resolveLines(lines);
      const orderDate = orderedAt.trim() || today;
      await createOrder.mutateAsync({
        title: '',
        vendor: vendor.trim(),
        note: '',
        orderedAt: orderDate,
        orderedBy: authorLabel.trim(),
        expectedReceiveAt: null,
        lines: resolved,
      });
      setDraftLines([]);
      setItemName('');
      setQuantity(1);
      setOrderedAt(orderDate);
      setStatusFilter('open');
      // 날짜 필터를 걸지 않아 미입고(오래된 건 포함)가 첫 화면에 그대로 보이게
      setSelectedDate(null);
      setMonth(orderDate.slice(0, 7));
      showToast(`발주 ${resolved.length}줄을 등록했습니다.`);
      itemInputRef.current?.focus();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickSubmit(event: FormEvent) {
    event.preventDefault();
    const current = buildCurrentLine();
    const lines = current ? [...draftLines, current] : draftLines;
    await submitOrder(lines);
  }

  function onItemKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addDraftLine();
  }

  function openReceiveLine(line: ProcurementOrderLine) {
    if (!requireSession('입고 체크')) return;
    if (isLineFullyReceived(line)) return;
    const remaining = lineRemainingQty(line);
    // 남은 수량이 1이면 바로 전량 입고
    if (remaining <= 1) {
      void confirmReceiveLine(line, remaining);
      return;
    }
    setReceiveTarget(line);
  }

  function openPartialReceive(order: ProcurementOrder) {
    const target = order.lines.find((line) => !isLineFullyReceived(line));
    if (!target) return;
    openReceiveLine(target);
  }

  async function confirmReceiveLine(line: ProcurementOrderLine, addQty: number) {
    try {
      await receiveLine.mutateAsync({ lineId: line.id, receivedBy: authorLabel, addQty });
      const next = lineReceivedQty(line) + addQty;
      const full = next >= line.quantity;
      showToast(
        full
          ? `${line.item_name} 전량 입고했습니다.`
          : `${line.item_name} ${addQty} ${line.unit} 입고 (${next}/${line.quantity})`,
      );
      setReceiveTarget(null);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '입고 처리에 실패했습니다.');
    }
  }

  async function handleUnreceiveLine(lineId: string) {
    if (!requireSession('입고 취소')) return;
    try {
      await unreceiveLine.mutateAsync(lineId);
      showToast('입고 표시를 해제했습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '해제에 실패했습니다.');
    }
  }

  async function handleReceiveAll(order: ProcurementOrder) {
    if (!requireSession('일괄 입고')) return;
    const ok = await confirm({
      title: '모두 입고',
      message: `「${orderTitle(order, categories)}」의 미입고 품목을 모두 입고 처리할까요?`,
      confirmLabel: '모두 입고',
    });
    if (!ok) return;
    try {
      await receiveAll.mutateAsync({ orderId: order.id, receivedBy: authorLabel });
      showToast('남은 품목을 입고 처리했습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '일괄 입고에 실패했습니다.');
    }
  }

  async function handleCancel(order: ProcurementOrder) {
    if (!requireSession('발주 취소')) return;
    const ok = await confirm({
      title: '발주 취소',
      message: `「${orderTitle(order, categories)}」 발주를 취소할까요?`,
      detail: '취소 후 「완료·취소」 탭에서 기록을 삭제할 수 있습니다.',
      confirmLabel: '취소하기',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await cancelOrder.mutateAsync({ orderId: order.id, cancelledBy: authorLabel });
      setStatusFilter('done');
      const removeNow = await confirm({
        title: '기록 삭제',
        message: '취소한 발주 기록을 지금 삭제할까요?',
        detail: '삭제하면 목록에서 완전히 사라집니다.',
        confirmLabel: '지금 삭제',
        cancelLabel: '나중에',
        tone: 'danger',
      });
      if (removeNow) {
        await deleteOrder.mutateAsync(order.id);
        showToast('발주를 취소하고 기록을 삭제했습니다.');
      } else {
        showToast('발주를 취소했습니다. 「완료·취소」 탭에서 삭제할 수 있습니다.');
      }
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '취소에 실패했습니다.');
    }
  }

  async function handleDelete(order: ProcurementOrder) {
    if (!requireSession('발주 삭제')) return;
    if (order.status !== 'received' && order.status !== 'cancelled') {
      showToast('완료·취소된 발주만 삭제할 수 있습니다.');
      return;
    }
    const ok = await confirm({
      title: order.status === 'cancelled' ? '취소 기록 삭제' : '발주 기록 삭제',
      message: `「${orderTitle(order, categories)}」 기록을 완전히 삭제할까요?`,
      detail: '되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteOrder.mutateAsync(order.id);
      showToast('발주 기록을 삭제했습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  const canSubmit = draftLines.length > 0 || itemName.trim().length > 0;

  return (
    <div className="page-shell procurement-page">
      <header className="page-shell__header procurement-page__header">
        <div>
          <h1>{meta.label}</h1>
          <p className="page-shell__desc">{meta.description}</p>
        </div>
        {isManager ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setCategoryModalOpen(true)}
          >
            분류 관리
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="procurement-page__status procurement-page__status--error">
          {error instanceof Error
            ? error.message
            : '불러오지 못했습니다. 마이그레이션(108~110) 적용 여부를 확인해 주세요.'}
        </p>
      ) : null}

      <div className="procurement-layout">
        <section className="procurement-layout__main" aria-label="발주 목록">
          <form className="procurement-composer" onSubmit={(e) => void handleQuickSubmit(e)}>
            <div className="procurement-composer__row">
              <label className="procurement-composer__field procurement-composer__field--date">
                <span className="sr-only">발주일</span>
                <input
                  type="date"
                  value={orderedAt}
                  onChange={(e) => setOrderedAt(e.target.value)}
                  aria-label="발주일"
                  title="발주일"
                />
              </label>
              <label className="procurement-composer__field procurement-composer__field--cat">
                <span className="sr-only">분류</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="분류"
                  title="분류"
                >
                  {categories.map((cat) => (
                    <option key={cat.id || cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="procurement-composer__field procurement-composer__field--vendor">
                <span className="sr-only">발주처</span>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="발주처"
                  aria-label="발주처"
                />
              </label>
              <label className="procurement-composer__field procurement-composer__field--name">
                <span className="sr-only">품목</span>
                <input
                  ref={itemInputRef}
                  list="procurement-item-suggestions"
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    const matched = items.find(
                      (item) =>
                        item.category === category &&
                        item.name.trim().toLowerCase() === e.target.value.trim().toLowerCase(),
                    );
                    if (matched?.unit) setUnit(matched.unit);
                  }}
                  onKeyDown={onItemKeyDown}
                  placeholder="품목명"
                  aria-label="품목명"
                />
              </label>
              <label className="procurement-composer__field procurement-composer__field--qty">
                <span className="sr-only">수량</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="수량"
                  title="수량"
                  placeholder="수량"
                />
              </label>
              <label className="procurement-composer__field procurement-composer__field--unit">
                <span className="sr-only">단위</span>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="단위"
                  aria-label="단위"
                  title="단위"
                />
              </label>
              <div className="procurement-composer__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={addDraftLine}
                  disabled={saving}
                  title="Enter로도 줄 추가"
                >
                  +
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving || !canSubmit}>
                  {saving
                    ? '…'
                    : draftLines.length
                      ? `등록 ${draftLines.length + (itemName.trim() ? 1 : 0)}`
                      : '등록'}
                </button>
              </div>
            </div>
            <datalist id="procurement-item-suggestions">
              {items
                .filter((item) => item.category === category)
                .map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
            </datalist>
            {draftLines.length ? (
              <ul className="procurement-composer__draft">
                {draftLines.map((line) => (
                  <li key={line.id}>
                    <span className="procurement-composer__draft-cat">{line.categoryLabel}</span>
                    <strong>{line.itemName}</strong>
                    <span className="procurement-composer__draft-qty">
                      {line.quantity} {line.unit}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => removeDraftLine(line.id)}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <div className="procurement-board">
          <div className="procurement-layout__controls">
            <div className="procurement-page__tabs" role="tablist" aria-label="상태">
              {(
                [
                  ['open', '미입고', openCount],
                  ['done', '완료·취소', doneCount],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === id}
                  className={`procurement-page__tab${statusFilter === id ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                  <span className="procurement-page__tab-count">{count}</span>
                </button>
              ))}
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색…"
              aria-label="물품 발주 검색"
              className="procurement-page__search"
            />
          </div>

          {statusFilter === 'open' && !selectedDate && overdueOrders.length ? (
            <div className="procurement-alert" role="status">
              <strong>미입고 지연 {overdueOrders.length}건</strong>
              <span>발주 후 {OVERDUE_GRACE_DAYS}일이 지난 건입니다. 오래된 순으로 위에 보입니다.</span>
            </div>
          ) : null}

          {selectedDate ? (
            <div className="procurement-date-filter">
              <span>{formatCalendarDateLabel(selectedDate)}만 보기</span>
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => setSelectedDate(null)}>
                전체 보기
              </button>
            </div>
          ) : null}

          {isLoading ? <p className="procurement-page__status">불러오는 중…</p> : null}

          {!isLoading && filteredOrders.length ? (
            <div className="procurement-card-groups">
              {groupedOrders.map((group) => (
                <section key={group.key} className="procurement-card-group" aria-label={group.label}>
                  {groupedOrders.length > 1 ? (
                    <h3 className="procurement-card-group__title">
                      <span>{group.label}</span>
                      <span className="procurement-card-group__count">{group.orders.length}</span>
                    </h3>
                  ) : null}
                  <ul className="procurement-cards">
                    {group.orders.map((order) => {
                const done = fullyReceivedLineCount(order);
                const total = order.lines.length;
                const overdue = isOrderOverdue(order, today, OVERDUE_GRACE_DAYS);
                const age = formatOrderAge(order.ordered_at, today);
                const isTodayOrder = order.ordered_at === today;
                const open = order.status === 'ordered' || order.status === 'partial';
                const primaryLine = order.lines[0];
                const catLabel = orderCategoryLabel(order, categories);
                const primaryQty = primaryLine
                  ? `${lineReceivedQty(primaryLine) > 0 && !isLineFullyReceived(primaryLine) ? `${lineReceivedQty(primaryLine)}/` : ''}${primaryLine.quantity} ${primaryLine.unit}`
                  : '';
                return (
                  <li key={order.id}>
                    <article
                      className={[
                        'procurement-card',
                        `procurement-card--${order.status}`,
                        overdue ? 'procurement-card--overdue' : '',
                        isTodayOrder ? 'procurement-card--today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="procurement-card__banner">
                        <div className="procurement-card__banner-meta">
                          <span className="procurement-card__cat">{catLabel}</span>
                          {open ? (
                            <span className={`procurement-card__age-pill${overdue ? ' is-warn' : ''}`}>
                              {age}
                            </span>
                          ) : null}
                          {overdue ? <span className="procurement-card__delay-pill">지연</span> : null}
                          <span
                            className={`procurement-card__status-pill procurement-card__status-pill--${order.status}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </div>
                        <p className="procurement-card__banner-title">
                          {orderItemHeading(order)}
                        </p>
                        <p
                          className={`procurement-card__banner-date${isTodayOrder ? ' is-today' : ''}`}
                        >
                          {isTodayOrder ? <span className="procurement-card__today-tag">오늘</span> : null}
                          <span>{formatDate(order.ordered_at)} 발주</span>
                          {total === 1 && primaryQty ? (
                            <span className="procurement-card__banner-qty">{primaryQty}</span>
                          ) : null}
                        </p>
                      </div>

                      <div className="procurement-card__body">
                        {overdue ? (
                          <p className="procurement-card__warning">
                            발주 후 {OVERDUE_GRACE_DAYS}일이 지났습니다. 입고 여부를 확인해 주세요.
                          </p>
                        ) : null}

                        <div className="procurement-card__chips">
                          <span className="procurement-card__chip">
                            {order.vendor.trim() || '발주처 미기입'}
                          </span>
                          <span className="procurement-card__chip procurement-card__chip--muted">
                            {order.ordered_by || '—'}
                          </span>
                          {total > 1 ? (
                            <span className="procurement-card__chip procurement-card__chip--muted">
                              품목 {done}/{total}
                            </span>
                          ) : null}
                        </div>

                        <ul className="procurement-card__lines">
                          {order.lines.map((line) => {
                            const full = isLineFullyReceived(line);
                            const received = lineReceivedQty(line);
                            const remaining = lineRemainingQty(line);
                            const cat =
                              line.category_label || labelForCategory(categories, line.category);
                            return (
                              <li
                                key={line.id}
                                className={`procurement-card__line${full ? ' is-received' : received > 0 ? ' is-partial' : ''}`}
                              >
                                <div className="procurement-card__line-main">
                                  {total > 1 ? (
                                    <>
                                      <span className="procurement-card__line-cat">{cat}</span>
                                      <strong>{line.item_name}</strong>
                                    </>
                                  ) : (
                                    <strong className="procurement-card__line-qty-label">
                                      발주 수량
                                    </strong>
                                  )}
                                </div>
                                <div
                                  className="procurement-card__line-qty"
                                  title={`남은 ${remaining} ${line.unit}`}
                                >
                                  {received > 0 && !full ? (
                                    <>
                                      <b>
                                        {received}/{line.quantity}
                                      </b>
                                      <span>{line.unit}</span>
                                    </>
                                  ) : (
                                    <>
                                      <b>{line.quantity}</b>
                                      <span>{line.unit}</span>
                                    </>
                                  )}
                                </div>
                                <div className="procurement-card__line-actions">
                                  {full ? (
                                    <>
                                      <span className="procurement-card__line-done">완료</span>
                                      {order.status !== 'cancelled' ? (
                                        <button
                                          type="button"
                                          className="procurement-card__action"
                                          onClick={() => void handleUnreceiveLine(line.id)}
                                        >
                                          해제
                                        </button>
                                      ) : null}
                                    </>
                                  ) : order.status !== 'cancelled' ? (
                                    <button
                                      type="button"
                                      className="procurement-card__action procurement-card__action--primary"
                                      onClick={() => openReceiveLine(line)}
                                    >
                                      {received > 0 ? '추가 입고' : '입고'}
                                    </button>
                                  ) : (
                                    <span className="procurement-card__line-done">취소됨</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="procurement-card__actions">
                          {open ? (
                            <>
                              {done < total ? (
                                <>
                                  <button
                                    type="button"
                                    className="procurement-card__action procurement-card__action--primary"
                                    onClick={() => void handleReceiveAll(order)}
                                  >
                                    모두 입고
                                  </button>
                                  <button
                                    type="button"
                                    className="procurement-card__action"
                                    onClick={() => openPartialReceive(order)}
                                  >
                                    일부 입고
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                className="procurement-card__action"
                                onClick={() => void handleCancel(order)}
                              >
                                발주 취소
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="procurement-card__action procurement-card__action--danger"
                              onClick={() => void handleDelete(order)}
                            >
                              {order.status === 'cancelled' ? '취소 기록 삭제' : '기록 삭제'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}

          {!isLoading && !filteredOrders.length ? (
            <div className="procurement-empty">
              {selectedDate ? (
                <>
                  <strong>{formatCalendarDateLabel(selectedDate)} 기록 없음</strong>
                  <p>다른 날짜를 고르거나 위에서 발주를 등록하세요.</p>
                </>
              ) : statusFilter === 'open' ? (
                <>
                  <strong>미입고 발주가 없습니다</strong>
                  <p>품목을 입력한 뒤 「발주 등록」하면 여기에 기록됩니다.</p>
                </>
              ) : (
                <>
                  <strong>완료·취소 기록이 없습니다</strong>
                  <p>입고 완료·취소한 발주가 여기에 표시됩니다.</p>
                </>
              )}
            </div>
          ) : null}
          </div>
        </section>

        <aside className="procurement-layout__aside" aria-label="발주 달력">
          <ProcurementCalendar
            month={month}
            today={today}
            selectedDate={selectedDate}
            dayMarks={dayMarks}
            onMonthChange={setMonth}
            onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
          />
          <p className="procurement-cal__legend">
            <span className="dot dot--ordered" /> 발주
            <span className="dot dot--received" /> 입고
          </p>
          <section className="procurement-month-stats" aria-label="이달 요약">
            <h2>{formatCalendarMonthLabel(month)} 요약</h2>
            <dl>
              <div>
                <dt>발주</dt>
                <dd>{monthStats.ordered}</dd>
              </div>
              <div>
                <dt>미입고</dt>
                <dd>{monthStats.open}</dd>
              </div>
              <div>
                <dt>완료</dt>
                <dd>{monthStats.received}</dd>
              </div>
              <div>
                <dt>취소</dt>
                <dd>{monthStats.cancelled}</dd>
              </div>
            </dl>
            {cancelledCount > 0 ? (
              <button
                type="button"
                className="btn btn--ghost btn--small procurement-month-stats__link"
                onClick={() => {
                  setStatusFilter('done');
                  setSelectedDate(null);
                  setSearch('');
                }}
              >
                취소 기록 보기 · 삭제 ({cancelledCount})
              </button>
            ) : null}
          </section>
        </aside>
      </div>

      {categoryModalOpen && isManager ? (
        <CategoryManageModal
          categories={categories}
          authorLabel={authorLabel}
          requireSession={requireSession}
          busy={addCategory.isPending || renameCategory.isPending || removeCategory.isPending}
          onClose={() => setCategoryModalOpen(false)}
          onAdd={async (label) => {
            await addCategory.mutateAsync({ input: { label }, createdBy: authorLabel });
            showToast('분류를 추가했습니다.');
          }}
          onRename={async (id, label) => {
            await renameCategory.mutateAsync({ id, label });
            showToast('분류 이름을 변경했습니다.');
          }}
          onRemove={async (cat) => {
            const ok = await confirm({
              title: '분류 삭제',
              message: `「${cat.label}」 분류를 삭제할까요?`,
              confirmLabel: '삭제',
              tone: 'danger',
            });
            if (!ok) return;
            await removeCategory.mutateAsync(cat.id);
            showToast('분류를 삭제했습니다.');
          }}
          onError={(message) => showToast(message)}
        />
      ) : null}

      {receiveTarget ? (
        <ReceiveLineModal
          line={receiveTarget}
          busy={receiveLine.isPending}
          onClose={() => setReceiveTarget(null)}
          onConfirm={(qty) => void confirmReceiveLine(receiveTarget, qty)}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function ReceiveLineModal({
  line,
  busy,
  onClose,
  onConfirm,
}: {
  line: ProcurementOrderLine;
  busy: boolean;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}) {
  const remaining = lineRemainingQty(line);
  const already = lineReceivedQty(line);
  const [qty, setQty] = useState(remaining);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQty(remaining);
    setError(null);
  }, [line.id, remaining]);

  function clamp(value: number) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(remaining, Math.max(1, Math.floor(value)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = clamp(qty);
    if (next < 1) {
      setError('입고 수량은 1 이상이어야 합니다.');
      return;
    }
    onConfirm(next);
  }

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(busy ? undefined : onClose)}>
      <div
        className="modal procurement-receive-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="procurement-receive-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="procurement-receive-modal__form">
          <div className="modal__header">
            <h2 id="procurement-receive-title">{already > 0 ? '추가 입고' : '입고 처리'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기" disabled={busy}>
              ✕
            </button>
          </div>

          <div className="procurement-receive-modal__summary">
            <strong>{line.item_name}</strong>
            <p>
              발주 {line.quantity} {line.unit}
              {already > 0 ? ` · 입고됨 ${already} ${line.unit}` : ''}
              {` · 남은 ${remaining} ${line.unit}`}
            </p>
          </div>

          <label className="field procurement-receive-modal__qty-field">
            <span>이번 입고 수량</span>
            <div className="procurement-receive-modal__stepper">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy || qty <= 1}
                onClick={() => setQty((prev) => clamp(prev - 1))}
                aria-label="수량 줄이기"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={remaining}
                value={qty}
                disabled={busy}
                onChange={(e) => setQty(clamp(Number(e.target.value)))}
                aria-label="입고 수량"
              />
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy || qty >= remaining}
                onClick={() => setQty((prev) => clamp(prev + 1))}
                aria-label="수량 늘리기"
              >
                +
              </button>
              <span>{line.unit}</span>
            </div>
          </label>

          <div className="procurement-receive-modal__quick">
            <button
              type="button"
              className="btn btn--outline btn--xs"
              disabled={busy || qty === remaining}
              onClick={() => setQty(remaining)}
            >
              남은 수량 전부
            </button>
          </div>

          {error ? <p className="procurement-receive-modal__error">{error}</p> : null}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? '처리 중…' : `${qty} ${line.unit} 입고`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProcurementCalendar({
  month,
  today,
  selectedDate,
  dayMarks,
  onMonthChange,
  onSelectDate,
}: {
  month: string;
  today: string;
  selectedDate: string | null;
  dayMarks: Map<string, { ordered: number; received: number }>;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const cells = useMemo(() => buildCalendarCells(month), [month]);

  return (
    <div className="procurement-cal">
      <div className="procurement-cal__head">
        <button
          type="button"
          className="procurement-cal__nav"
          onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}
          aria-label="이전 달"
        >
          ‹
        </button>
        <strong>{formatCalendarMonthLabel(month)}</strong>
        <button
          type="button"
          className="procurement-cal__nav"
          onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>
      <div className="procurement-cal__weekdays">
        {CALENDAR_WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="procurement-cal__grid">
        {cells.map((cell) => {
          if (!cell.date) {
            return <div key={cell.key} className="procurement-cal__day is-empty" />;
          }
          const mark = dayMarks.get(cell.date);
          const hasMark = Boolean(mark?.ordered || mark?.received);
          return (
            <button
              key={cell.key}
              type="button"
              className={[
                'procurement-cal__day',
                cell.date === today ? 'is-today' : '',
                cell.date === selectedDate ? 'is-selected' : '',
                hasMark ? 'has-mark' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.date!)}
            >
              <span className="procurement-cal__day-num">{cell.day}</span>
              <span className="procurement-cal__dots">
                {mark?.ordered ? <i className="dot dot--ordered" /> : null}
                {mark?.received ? <i className="dot dot--received" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryManageModal({
  categories,
  authorLabel,
  requireSession,
  busy,
  onClose,
  onAdd,
  onRename,
  onRemove,
  onError,
}: {
  categories: ProcurementCategory[];
  authorLabel: string;
  requireSession: (action: string) => boolean;
  busy: boolean;
  onClose: () => void;
  onAdd: (label: string) => Promise<void>;
  onRename: (id: string, label: string) => Promise<void>;
  onRemove: (cat: ProcurementCategory) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!requireSession('분류 추가')) return;
    try {
      await onAdd(newLabel);
      setNewLabel('');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : '분류 추가에 실패했습니다.');
    }
  }

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div
        className="modal procurement-cat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="procurement-cat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="procurement-cat-modal__body">
          <div className="modal__header">
            <h2 id="procurement-cat-title">분류 관리</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
          <p className="procurement-cat-modal__hint">
            관리자만 분류를 추가·변경·삭제할 수 있습니다. ({authorLabel})
          </p>
          <form className="procurement-catalog__fields" onSubmit={(e) => void submit(e)}>
            <label className="procurement-catalog__note">
              <span>새 분류</span>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="예) 청소용품"
                required
              />
            </label>
            <button type="submit" className="btn btn--primary btn--small" disabled={busy || !newLabel.trim()}>
              추가
            </button>
          </form>
          <ul className="procurement-catalog__cat-admin">
            {categories.map((cat) => (
              <li key={cat.id || cat.key}>
                {editingId === cat.id ? (
                  <>
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    <button
                      type="button"
                      className="btn btn--primary btn--xs"
                      disabled={busy || !editLabel.trim()}
                      onClick={() =>
                        void onRename(cat.id, editLabel)
                          .then(() => setEditingId(null))
                          .catch((caught) =>
                            onError(caught instanceof Error ? caught.message : '변경 실패'),
                          )
                      }
                    >
                      저장
                    </button>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => setEditingId(null)}>
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <strong>{cat.label}</strong>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      disabled={busy || !cat.hotel_id}
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditLabel(cat.label);
                      }}
                    >
                      이름 변경
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      disabled={busy || !cat.hotel_id}
                      onClick={() =>
                        void onRemove(cat).catch((caught) =>
                          onError(caught instanceof Error ? caught.message : '삭제 실패'),
                        )
                      }
                    >
                      삭제
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
