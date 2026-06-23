'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { buildBatchInfo } from '@/lib/office-supplies/batch';
import { crawlHealthStatusLabel } from '@/lib/office-supplies/crawl-health-ui';
import {
  officeSupplyCrawlHealthQueryKey,
  runLiveOfficeSupplyCrawlHealthCheck,
  useOfficeSupplyCrawlHealth,
} from '@/lib/office-supplies/use-crawl-health';
import {
  aggregateOfficeSupplyOrderLines,
  buildOfficeSupplyOrderText,
  copyOfficeSupplyOrderText,
  printOfficeSupplyOrderSheet,
} from '@/lib/office-supplies/order-export';
import {
  OFFICETOWN_MALL_URL,
  OFFICETOWN_SYNC_CATEGORIES,
  type OfficetownProduct,
} from '@/lib/office-supplies/types';
import { useOfficeSupplies } from '@/lib/office-supplies/use-office-supplies';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { formatSupabaseClientError } from '@/lib/supabase/env';

type LookupState = {
  loading: boolean;
  error: string | null;
  product: OfficetownProduct | null;
};

const EMPTY_LOOKUP: LookupState = { loading: false, error: null, product: null };

const CATEGORY_LABELS = Object.fromEntries(
  OFFICETOWN_SYNC_CATEGORIES.map((category) => [category.id, category.label]),
) as Record<string, string>;

function deadlineUrgencyClass(daysUntil: number, isOrderDay: boolean): string {
  if (isOrderDay) return 'office-supplies-deadline__d-day--today';
  if (daysUntil <= 2) return 'office-supplies-deadline__d-day--urgent';
  if (daysUntil <= 7) return 'office-supplies-deadline__d-day--soon';
  return '';
}

export function OfficeSuppliesPageClient() {
  const pageMeta = getNavPageMeta('/office-supplies');
  const queryClient = useQueryClient();
  const { authorLabel, requireSession } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const { data: isManager = false } = useIsManager();
  const { data: crawlHealth } = useOfficeSupplyCrawlHealth();
  const {
    batch,
    activeBatchKey,
    catalog,
    requests,
    isLoading,
    error,
    refetch,
    addRequest,
    updateRequest,
    deleteRequest,
    submitBatch,
    setCatalogPinned,
  } = useOfficeSupplies();

  const [searchCode, setSearchCode] = useState('');
  const [lookup, setLookup] = useState<LookupState>(EMPTY_LOOKUP);
  const [lookupQty, setLookupQty] = useState('1');
  const [lookupNote, setLookupNote] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const batchInfo = activeBatchKey ? buildBatchInfo(activeBatchKey) : null;
  const isClosed = batch?.status === 'submitted';
  const orderLines = useMemo(() => aggregateOfficeSupplyOrderLines(requests), [requests]);
  const showHealthAlert =
    crawlHealth && (crawlHealth.status === 'degraded' || crawlHealth.status === 'broken');

  const categoryOptions = useMemo(() => {
    const ids = [...new Set(catalog.map((item) => item.category_id).filter(Boolean))];
    return ids
      .map((id) => ({ id, label: CATEGORY_LABELS[id] ?? '기타' }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ko'));
  }, [catalog]);

  const pinnedCount = useMemo(() => catalog.filter((item) => item.is_pinned).length, [catalog]);

  const featuredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    let items = [...catalog].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return b.order_count - a.order_count || a.product_name.localeCompare(b.product_name, 'ko');
    });
    if (categoryFilter === 'pinned') {
      items = items.filter((item) => item.is_pinned);
    } else if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category_id === categoryFilter);
    }
    if (!query) return items;
    return items.filter(
      (item) => item.product_code.includes(query) || item.product_name.toLowerCase().includes(query),
    );
  }, [catalog, catalogSearch, categoryFilter]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function submitAddRequest(input: {
    product_code: string;
    product_name: string;
    image_url?: string;
    unit?: string;
    category_id?: string;
    goods_id?: string;
    quantity: number;
    note?: string;
  }) {
    if (!requireSession('사무용품 신청')) return false;
    if (isClosed) {
      showToast('이번 회차는 이미 제출되었습니다.');
      return false;
    }

    try {
      await addRequest.mutateAsync({
        product_code: input.product_code,
        product_name: input.product_name,
        image_url: input.image_url ?? '',
        unit: input.unit ?? '개',
        category_id: input.category_id,
        goods_id: input.goods_id,
        quantity: input.quantity,
        note: input.note?.trim() ?? '',
        requested_by: authorLabel,
      });
      return true;
    } catch (err) {
      showToast(formatSupabaseClientError(err));
      return false;
    }
  }

  async function handleQuickAdd(item: {
    product_code: string;
    product_name: string;
    image_url: string;
    unit: string;
  }) {
    const ok = await submitAddRequest({
      product_code: item.product_code,
      product_name: item.product_name,
      image_url: item.image_url,
      unit: item.unit,
      quantity: 1,
    });
    if (ok) showToast(`${item.product_name} 1개를 담았습니다.`);
  }

  async function handleTogglePin(item: { id: string; product_name: string; is_pinned: boolean }) {
    if (!isManager) return;
    try {
      await setCatalogPinned.mutateAsync({ id: item.id, isPinned: !item.is_pinned });
      showToast(
        item.is_pinned ? `${item.product_name} 즐겨찾기를 해제했습니다.` : `${item.product_name}을(를) 호텔 공통 즐겨찾기에 고정했습니다.`,
      );
    } catch (err) {
      showToast(formatSupabaseClientError(err));
    }
  }

  async function handleLookup() {
    const code = searchCode.trim();
    if (!code) {
      setLookup({ loading: false, error: '상품코드를 입력해 주세요.', product: null });
      return;
    }
    setLookup({ loading: true, error: null, product: null });
    try {
      const response = await fetch(`/api/office-supplies/lookup?code=${encodeURIComponent(code)}`);
      const payload = (await response.json()) as { product?: OfficetownProduct; error?: string };
      if (!response.ok) {
        setLookup({ loading: false, error: payload.error ?? '조회에 실패했습니다.', product: null });
        return;
      }
      setLookup({ loading: false, error: null, product: payload.product ?? null });
      setSearchCode(payload.product?.productCode ?? code);
    } catch {
      setLookup({ loading: false, error: '상품 조회에 실패했습니다.', product: null });
    }
  }

  async function handleAddFromLookup() {
    if (!lookup.product) return;
    const qty = Math.max(1, Number.parseInt(lookupQty, 10) || 1);
    const ok = await submitAddRequest({
      product_code: lookup.product.productCode,
      product_name: lookup.product.name,
      image_url: lookup.product.imageUrl,
      category_id: lookup.product.categoryId,
      goods_id: lookup.product.goodsId,
      quantity: qty,
      note: lookupNote,
    });
    if (!ok) return;
    setLookup(EMPTY_LOOKUP);
    setLookupNote('');
    setLookupQty('1');
    setSearchCode('');
    showToast('신청 목록에 추가했습니다.');
  }

  async function handleSyncCatalog() {
    setSyncBusy(true);
    try {
      const response = await fetch('/api/office-supplies/catalog/sync', { method: 'POST' });
      const payload = (await response.json()) as { count?: number; error?: string; health?: typeof crawlHealth };
      if (!response.ok) {
        if (payload.health) {
          void queryClient.setQueryData(officeSupplyCrawlHealthQueryKey(), payload.health);
        }
        showToast(payload.error ?? '카탈로그 동기화에 실패했습니다.');
        return;
      }
      await refetch();
      void queryClient.invalidateQueries({ queryKey: officeSupplyCrawlHealthQueryKey() });
      showToast(`오피스타운에서 ${payload.count?.toLocaleString() ?? 0}개 품목을 불러왔습니다.`);
    } catch {
      showToast('카탈로그 동기화에 실패했습니다.');
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleHealthCheck() {
    setHealthBusy(true);
    try {
      const health = await runLiveOfficeSupplyCrawlHealthCheck();
      void queryClient.setQueryData(officeSupplyCrawlHealthQueryKey(), health);
      showToast(
        health.status === 'healthy'
          ? '오피스타운 연동이 정상입니다.'
          : health.status === 'degraded'
            ? '사이트 변경이 의심됩니다.'
            : '오피스타운 연동을 사용할 수 없습니다.',
      );
    } catch {
      showToast('연동 상태 확인에 실패했습니다.');
    } finally {
      setHealthBusy(false);
    }
  }

  async function handleCopyOrder() {
    const ok = await copyOfficeSupplyOrderText(orderLines, activeBatchKey ?? '');
    showToast(ok ? '구매 요청서를 복사했습니다.' : '복사에 실패했습니다.');
  }

  function handlePrintOrder() {
    const ok = printOfficeSupplyOrderSheet(orderLines, activeBatchKey ?? '');
    if (!ok) showToast('인쇄 창을 열지 못했습니다.');
  }

  async function handleSubmitBatch() {
    if (!requireSession('일괄 제출')) return;
    if (!isManager) {
      showToast('담당자만 일괄 제출할 수 있습니다.');
      return;
    }
    if (!orderLines.length) {
      showToast('제출할 신청이 없습니다.');
      return;
    }
    const ok = await confirm({
      title: '사무용품 일괄 제출',
      message: `${batchInfo?.orderDateLabel ?? ''} 발주 회차를 제출할까요?\n제출 후에는 이번 회차 신청을 더 이상 수정할 수 없습니다.`,
      confirmLabel: '제출',
    });
    if (!ok) return;

    try {
      await submitBatch.mutateAsync(authorLabel);
      showToast('이번 회차 신청을 제출했습니다.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '제출에 실패했습니다.');
    }
  }

  if (isLoading) {
    return <p className="empty-state">사무용품 신청을 불러오는 중…</p>;
  }

  if (error) {
    return (
      <p className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
        {formatSupabaseClientError(error)}
      </p>
    );
  }

  return (
    <div className="project-board office-supplies-page" data-ui="project">
      <header className="project-board__header office-supplies-page__header">
        <div>
          <h1 className="project-board__title">{pageMeta?.label ?? '사무용품 신청'}</h1>
          <p className="project-board__desc">격주 수요일 오피스타운 일괄 발주 전에 품목을 모아 둡니다.</p>
        </div>
      </header>

      {batchInfo ? (
        <section className="office-supplies-hero" aria-label="발주 일정 및 검색">
          <div className="office-supplies-hero__top">
            <div className="office-supplies-deadline">
              <p className="office-supplies-deadline__label">다음 일괄 발주</p>
              <div className="office-supplies-deadline__row">
                <strong className="office-supplies-deadline__date">{batchInfo.orderDateLabel}</strong>
                <span
                  className={`office-supplies-deadline__d-day ${deadlineUrgencyClass(batchInfo.daysUntilOrder, batchInfo.isOrderDay)}`}
                >
                  {batchInfo.isOrderDay ? '오늘 마감' : `D-${batchInfo.daysUntilOrder}`}
                </span>
              </div>
            </div>

            <div className="office-supplies-hero__metrics">
              <div className="office-supplies-metric-group" aria-label="신청 수량">
                <div className="office-supplies-metric">
                  <span className="office-supplies-metric__value">{requests.length}</span>
                  <span className="office-supplies-metric__label">신청 건</span>
                </div>
                <div className="office-supplies-metric">
                  <span className="office-supplies-metric__value">{orderLines.length}</span>
                  <span className="office-supplies-metric__label">품목 종</span>
                </div>
              </div>
              <div className="office-supplies-metric-group office-supplies-metric-group--status" aria-label="진행 상태">
                <span className={`office-supplies-status-badge office-supplies-status-badge--${isClosed ? 'done' : 'open'}`}>
                  {isClosed ? '제출 완료' : '접수 중'}
                </span>
                {crawlHealth && crawlHealth.status !== 'healthy' ? (
                  <span className={`office-supplies-status-badge office-supplies-status-badge--${crawlHealth.status}`}>
                    {crawlHealthStatusLabel(crawlHealth.status)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="office-supplies-search-bar">
            <input
              type="search"
              className="input office-supplies-search-bar__input"
              placeholder="품명 또는 상품코드로 검색 (예: 포스트잇, 313890)"
              value={catalogSearch}
              onChange={(event) => setCatalogSearch(event.target.value)}
            />
            <button
              type="button"
              className={`btn btn--ghost office-supplies-search-bar__code${codePanelOpen ? ' is-active' : ''}`}
              onClick={() => setCodePanelOpen((open) => !open)}
            >
              {codePanelOpen ? '코드 입력 닫기' : '상품코드로 추가'}
            </button>
          </div>

          {codePanelOpen ? (
            <section className="office-supplies-code-panel">
              <p className="office-supplies-code-panel__hint">오피스타운 상품코드를 입력하면 품목을 찾아 담을 수 있습니다.</p>
              <div className="office-supplies-lookup">
                <input
                  type="text"
                  className="input"
                  inputMode="numeric"
                  placeholder="예: 313890"
                  value={searchCode}
                  onChange={(event) => setSearchCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleLookup();
                  }}
                />
                <button type="button" className="btn btn--primary btn--sm" disabled={lookup.loading} onClick={() => void handleLookup()}>
                  {lookup.loading ? '조회 중…' : '조회'}
                </button>
              </div>
              {lookup.error ? <p className="office-supplies-error">{lookup.error}</p> : null}
              {lookup.product ? (
                <div className="office-supplies-code-panel__result">
                  <div className="office-supplies-preview">
                    <div className="office-supplies-preview__image">
                      <Image src={lookup.product.imageUrl} alt="" width={64} height={64} unoptimized />
                    </div>
                    <div>
                      <p className="office-supplies-preview__code">{lookup.product.productCode}</p>
                      <p className="office-supplies-preview__name">{lookup.product.name}</p>
                    </div>
                  </div>
                  <div className="office-supplies-code-panel__fields">
                    <label className="field">
                      <span className="field__label">수량</span>
                      <input type="number" min={1} className="input input--sm" value={lookupQty} onChange={(e) => setLookupQty(e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="field__label">비고</span>
                      <input type="text" className="input input--sm" placeholder="선택" value={lookupNote} onChange={(e) => setLookupNote(e.target.value)} />
                    </label>
                    <button type="button" className="btn btn--primary btn--sm" disabled={isClosed || addRequest.isPending} onClick={() => void handleAddFromLookup()}>
                      + 담기
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {isManager ? (
            <details className="office-supplies-admin">
              <summary>담당자 도구</summary>
              <div className="office-supplies-admin__actions">
                <a className="btn btn--outline btn--sm" href={OFFICETOWN_MALL_URL} target="_blank" rel="noreferrer">
                  오피스타운 쇼핑몰 열기
                </a>
                <button type="button" className="btn btn--outline btn--sm" disabled={healthBusy} onClick={() => void handleHealthCheck()}>
                  {healthBusy ? '점검 중…' : '연동 상태 점검'}
                </button>
                <button type="button" className="btn btn--outline btn--sm" disabled={syncBusy} onClick={() => void handleSyncCatalog()}>
                  {syncBusy ? '동기화 중…' : '카탈로그 새로고침'}
                </button>
                {crawlHealth?.status === 'healthy' ? (
                  <span className="office-supplies-admin__note">오피스타운 연동 정상</span>
                ) : null}
              </div>
            </details>
          ) : (
            <p className="office-supplies-hero__link">
              <a href={OFFICETOWN_MALL_URL} target="_blank" rel="noreferrer">
                오피스타운 쇼핑몰에서 상품 확인 →
              </a>
            </p>
          )}
        </section>
      ) : null}

      {showHealthAlert ? (
        <section className={`office-supplies-alert office-supplies-alert--${crawlHealth?.status}`} aria-label="오피스타운 연동 경고">
          <strong>{crawlHealth ? crawlHealthStatusLabel(crawlHealth.status) : ''}</strong>
          <p>{crawlHealth?.issues[0] ?? '오피스타운 사이트 구조를 다시 확인해 주세요.'}</p>
        </section>
      ) : null}

      <div className="office-supplies-workspace">
        <main className="office-supplies-main">
          {catalog.length > 0 ? (
            <div className="office-supplies-filters" role="tablist" aria-label="카테고리">
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === 'all'}
                className={`office-supplies-filter${categoryFilter === 'all' ? ' is-active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                전체
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === 'pinned'}
                className={`office-supplies-filter office-supplies-filter--pinned${categoryFilter === 'pinned' ? ' is-active' : ''}`}
                onClick={() => setCategoryFilter('pinned')}
              >
                즐겨찾기{pinnedCount > 0 ? ` ${pinnedCount}` : ''}
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === category.id}
                  className={`office-supplies-filter${categoryFilter === category.id ? ' is-active' : ''}`}
                  onClick={() => setCategoryFilter(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          ) : null}

          {!featuredCatalog.length ? (
            <div className="office-supplies-empty office-supplies-empty--panel">
              <p>
                {categoryFilter === 'pinned'
                  ? isManager
                    ? '즐겨찾기한 품목이 없습니다. 카드의 별을 눌러 호텔 공통으로 고정할 수 있습니다.'
                    : '즐겨찾기한 품목이 없습니다.'
                  : catalog.length
                    ? '검색 결과가 없습니다.'
                    : '아직 카탈로그가 비어 있습니다.'}
              </p>
              {isManager && !catalog.length ? (
                <button type="button" className="btn btn--primary btn--sm" disabled={syncBusy} onClick={() => void handleSyncCatalog()}>
                  카탈로그 새로고침
                </button>
              ) : null}
            </div>
          ) : (
            <div className="office-supplies-catalog">
              {featuredCatalog.slice(0, 36).map((item) => (
                <article key={item.id} className={`office-supplies-card${item.is_pinned ? ' is-pinned' : ''}`}>
                  {isManager ? (
                    <button
                      type="button"
                      className={`office-supplies-card__pin${item.is_pinned ? ' is-active' : ''}`}
                      aria-label={item.is_pinned ? '즐겨찾기 해제' : '호텔 공통 즐겨찾기 고정'}
                      title={item.is_pinned ? '호텔 공통 즐겨찾기 해제' : '호텔 공통 즐겨찾기 고정'}
                      disabled={setCatalogPinned.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleTogglePin(item);
                      }}
                    >
                      {item.is_pinned ? '★' : '☆'}
                    </button>
                  ) : item.is_pinned ? (
                    <span className="office-supplies-card__pin office-supplies-card__pin--readonly" aria-label="즐겨찾기">
                      ★
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="office-supplies-card__hit"
                    disabled={isClosed || addRequest.isPending}
                    onClick={() =>
                      void handleQuickAdd({
                        product_code: item.product_code,
                        product_name: item.product_name,
                        image_url: item.image_url,
                        unit: item.unit,
                      })
                    }
                  >
                    <div className="office-supplies-card__image">
                      {item.image_url ? (
                        <Image src={item.image_url} alt="" width={96} height={96} unoptimized />
                      ) : (
                        <span className="office-supplies-card__placeholder">이미지 없음</span>
                      )}
                    </div>
                    <div className="office-supplies-card__body">
                      <h3 className="office-supplies-card__name">{item.product_name}</h3>
                      <p className="office-supplies-card__code">{item.product_code}</p>
                      {item.order_count > 0 ? <p className="office-supplies-card__meta">자주 신청 {item.order_count}</p> : null}
                      {item.is_pinned ? <p className="office-supplies-card__meta office-supplies-card__meta--pinned">호텔 공통 즐겨찾기</p> : null}
                    </div>
                    <span className="office-supplies-card__add" aria-hidden="true">
                      +1 담기
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </main>

        <aside className="office-supplies-cart" aria-label="신청 장바구니">
          <header className="office-supplies-cart__head">
            <div>
              <p className="office-supplies-cart__eyebrow">STEP 2</p>
              <h2>이번 회차 신청</h2>
            </div>
            <span className="office-supplies-cart__count">{requests.length}</span>
          </header>

          <div className="office-supplies-cart__body">
            {!requests.length ? (
              <div className="office-supplies-cart__empty">
                <p>품목을 선택하면 여기에 쌓입니다.</p>
                <p className="muted">왼쪽 카드의 <strong>+1 담기</strong>를 눌러 주세요.</p>
              </div>
            ) : (
              <ul className="office-supplies-request-list">
                {requests.map((request) => (
                  <li key={request.id} className={`office-supplies-request-item${request.requested_by === authorLabel ? ' is-mine' : ''}`}>
                    <div className="office-supplies-request-item__main">
                      <strong className="office-supplies-request-item__title">{request.product_name}</strong>
                      <span className="office-supplies-request-item__meta">
                        {request.product_code} · {request.quantity}
                        {request.unit} · {request.requested_by}
                      </span>
                      {request.note ? <span className="muted">{request.note}</span> : null}
                    </div>
                    {!isClosed && request.requested_by === authorLabel ? (
                      <div className="office-supplies-request-item__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          aria-label="수량 1 증가"
                          onClick={() =>
                            void updateRequest.mutateAsync({
                              id: request.id,
                              quantity: request.quantity + 1,
                              note: request.note,
                            })
                          }
                        >
                          +1
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void deleteRequest.mutateAsync(request.id)}>
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="office-supplies-cart__footer">
            {orderLines.length ? (
              <div className="office-supplies-cart__secondary">
                <p className="office-supplies-cart__footer-label">결재 문서 만들기</p>
                <div className="office-supplies-order-actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleCopyOrder()}>
                    결재용 복사
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handlePrintOrder}>
                    인쇄
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreviewOpen((open) => !open)}>
                    {previewOpen ? '미리보기 닫기' : '미리보기'}
                  </button>
                </div>
                {previewOpen ? (
                  <pre className="office-supplies-order-preview">{buildOfficeSupplyOrderText(orderLines, activeBatchKey ?? '')}</pre>
                ) : null}
              </div>
            ) : (
              <p className="office-supplies-cart__footer-hint">품목을 담은 뒤 결재 문서를 만들 수 있습니다.</p>
            )}

            {isManager ? (
              <div className="office-supplies-cart__submit">
                <p className="office-supplies-cart__footer-label">STEP 3 · 담당자 제출</p>
                <button
                  type="button"
                  className="btn btn--primary office-supplies-cart__submit-btn"
                  disabled={isClosed || !orderLines.length || submitBatch.isPending}
                  onClick={() => void handleSubmitBatch()}
                >
                  {isClosed ? '제출 완료됨' : `일괄 제출 (${orderLines.length}품목)`}
                </button>
              </div>
            ) : (
              <p className="office-supplies-cart__footer-hint">담당자가 발주일에 일괄 제출합니다.</p>
            )}
          </footer>
        </aside>
      </div>

      {toast ? <div className="toast-banner">{toast}</div> : null}
    </div>
  );
}
