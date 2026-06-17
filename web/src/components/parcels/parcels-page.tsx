'use client';

import { useMemo, useState } from 'react';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { getParcelSignatureUrl } from '@/lib/parcels/signatures';
import {
  countParcelsForBoardTab,
  filterParcelsForBoard,
  isParcelCompleted,
  PARCEL_ACTIVE_STATUS_FILTERS,
  PARCEL_BOARD_TABS,
  type ParcelActiveStatusFilter,
  type ParcelBoardTab,
} from '@/lib/parcels/filter';
import {
  formatParcelCheckoutDate,
  PARCEL_DIRECTION_LABELS,
  PARCEL_STATUS_LABELS,
  isParcelOverdue,
  type Parcel,
  type ParcelDirection,
  type ParcelInput,
} from '@/lib/parcels/types';
import { useParcels } from '@/lib/parcels/use-parcels';
import { formatSupabaseClientError } from '@/lib/supabase/env';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { ParcelFormModal } from '@/components/parcels/parcel-form-modal';
import { ParcelSignLinkModal } from '@/components/parcels/parcel-sign-link-modal';

function formatReceivedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultDirectionForTab(tab: ParcelBoardTab): ParcelDirection {
  return tab === 'room_to_out' ? 'room_to_out' : 'out_to_room';
}

export function ParcelsPageClient() {
  const { authorLabel, requireSession, session } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const [boardTab, setBoardTab] = useState<ParcelBoardTab>('out_to_room');
  const [statusFilter, setStatusFilter] = useState<ParcelActiveStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parcel | null>(null);
  const [signParcel, setSignParcel] = useState<Parcel | null>(null);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { parcels, isLoading, error, createParcel, updateParcel, deleteParcel } = useParcels('all');

  const filtered = useMemo(
    () => filterParcelsForBoard(parcels, boardTab, search, statusFilter),
    [parcels, boardTab, search, statusFilter],
  );

  const tabCounts = useMemo(() => {
    return Object.fromEntries(
      PARCEL_BOARD_TABS.map((tab) => [tab.id, countParcelsForBoardTab(parcels, tab.id)]),
    ) as Record<ParcelBoardTab, number>;
  }, [parcels]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  function openCreate() {
    if (!requireSession('기록 등록')) return;
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(parcel: Parcel) {
    setEditing(parcel);
    setFormOpen(true);
  }

  function openSign(parcel: Parcel) {
    if (!requireSession('인도 서명')) return;
    if (parcel.status === 'delivered' || parcel.status === 'returned') {
      showToast('이미 처리된 항목입니다.');
      return;
    }
    if (parcel.direction !== 'out_to_room') {
      showToast('OUT TO ROOM 항목만 서명 인도할 수 있습니다.');
      return;
    }
    setSignParcel(parcel);
  }

  async function openDetail(parcel: Parcel) {
    setDetailParcel(parcel);
    if (parcel.signature_path) {
      const url = await getParcelSignatureUrl(parcel.signature_path);
      setSignatureUrl(url);
    } else {
      setSignatureUrl(null);
    }
  }

  function closeDetail() {
    setDetailParcel(null);
    setSignatureUrl(null);
  }

  async function handleSave(input: ParcelInput) {
    if (!requireSession('저장')) return;
    try {
      if (editing) {
        await updateParcel.mutateAsync({ id: editing.id, input });
        showToast('수정되었습니다.');
      } else {
        await createParcel.mutateAsync(input);
        showToast('등록되었습니다.');
      }
    } catch (caught) {
      showToast(formatSupabaseClientError(caught));
      throw caught;
    }
  }

  async function handleDelete(parcel: Parcel) {
    const ok = await confirm({
      title: '기록 삭제',
      message: '이 항목을 삭제할까요?',
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteParcel.mutateAsync(parcel.id);
      if (detailParcel?.id === parcel.id) closeDetail();
      showToast('삭제되었습니다.');
    } catch (caught) {
      showToast(formatSupabaseClientError(caught));
    }
  }

  async function markReady(parcel: Parcel) {
    if (!requireSession('상태 변경')) return;
    try {
      await updateParcel.mutateAsync({
        id: parcel.id,
        input: { status: 'ready', updated_by: authorLabel },
      });
      showToast('인도 대기로 변경했습니다.');
    } catch (caught) {
      showToast(formatSupabaseClientError(caught));
    }
  }

  const isCompletedTab = boardTab === 'completed';

  return (
    <section className="parcels-page">
      <header className="parcels-page__header">
        <div>
          <h2 className="parcels-page__title">📦 물건 픽업 장부</h2>
          <p className="parcels-page__desc">OUT TO ROOM · ROOM TO OUT 보관·인도</p>
        </div>
        <button type="button" className="btn btn--primary parcels-page__add-btn" onClick={openCreate}>
          + 기록 등록
        </button>
      </header>

      <p className="parcels-page__hint" role="note">
        인도 완료 항목은 <strong>24시간 후</strong> OUT TO ROOM · ROOM TO OUT 목록에서 숨겨집니다.
        이전 기록은 <strong>완료</strong> 탭에서 검색해 확인하세요.
      </p>

      <div className="parcels-page__filters">
        <input
          type="search"
          className="parcels-page__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isCompletedTab
              ? '객실·이름·체크아웃·내용 검색…'
              : '객실·이름·보관함·내용 검색…'
          }
          aria-label="픽업 장부 검색"
        />
        <div className="parcels-page__status-bar">
          <span className="parcels-page__status-bar-label">구분</span>
          <div className="segmented-control segmented-control--compact segmented-control--wrap">
            {PARCEL_BOARD_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`segmented-control__btn${boardTab === tab.id ? ' is-active' : ''}${
                  tab.id === 'completed' ? ' segmented-control__btn--done' : ''
                }`}
                onClick={() => {
                  setBoardTab(tab.id);
                  if (tab.id === 'completed') setStatusFilter('all');
                }}
              >
                {tab.label}
                {tabCounts[tab.id] > 0 ? ` (${tabCounts[tab.id]})` : ''}
              </button>
            ))}
          </div>
        </div>
        {!isCompletedTab ? (
          <div className="parcels-page__status-bar">
            <span className="parcels-page__status-bar-label">상태</span>
            <div className="segmented-control segmented-control--compact segmented-control--wrap">
              {PARCEL_ACTIVE_STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`segmented-control__btn${statusFilter === opt.id ? ' is-active' : ''}${
                    opt.id === 'overdue' ? ' segmented-control__btn--warning' : ''
                  }`}
                  onClick={() => setStatusFilter(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="empty-state" style={{ color: '#b91c1c' }}>
          {formatSupabaseClientError(error)}
          <br />
          Supabase SQL Editor에서 <code>046</code>·<code>051</code> 마이그레이션을 실행했는지 확인해 주세요.
        </p>
      ) : isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : !filtered.length ? (
        <p className="empty-state">
          {parcels.length
            ? isCompletedTab
              ? '조건에 맞는 완료 항목이 없습니다.'
              : '조건에 맞는 항목이 없습니다.'
            : '등록된 항목이 없습니다.'}
        </p>
      ) : (
        <div className="parcels-page__list">
          {filtered.map((parcel) => {
            const overdue = !isCompletedTab && isParcelOverdue(parcel);
            const completed = isParcelCompleted(parcel);
            const hasCheckout = Boolean(parcel.checkout_date);
            return (
              <article
                key={parcel.id}
                className={[
                  'parcel-card',
                  `parcel-card--${parcel.status}`,
                  `parcel-card--${parcel.direction}`,
                  overdue ? 'parcel-card--overdue' : '',
                  completed ? 'parcel-card--completed' : '',
                  hasCheckout ? 'parcel-card--checkout' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <header className="parcel-card__head">
                  <div className="parcel-card__badges">
                    <span className={`parcel-card__direction parcel-card__direction--${parcel.direction}`}>
                      {PARCEL_DIRECTION_LABELS[parcel.direction]}
                    </span>
                    <span className={`parcel-card__status parcel-card__status--${parcel.status}`}>
                      {PARCEL_STATUS_LABELS[parcel.status]}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="parcel-card__delete"
                    onClick={() => void handleDelete(parcel)}
                    aria-label="기록 삭제"
                  >
                    삭제
                  </button>
                </header>

                <div className={hasCheckout ? 'parcel-card__highlight' : 'parcel-card__identity'}>
                  <p className={`parcel-card__room${hasCheckout ? ' parcel-card__room--emph' : ''}`}>
                    {parcel.room_number ? `${parcel.room_number}호` : '객실 미입력'}
                  </p>
                  <p className={`parcel-card__guest${hasCheckout ? ' parcel-card__guest--emph' : ''}`}>
                    {parcel.guest_name || '게스트 미입력'}
                  </p>
                  {hasCheckout ? (
                    <p className="parcel-card__checkout">
                      체크아웃 {formatParcelCheckoutDate(parcel.checkout_date)}
                    </p>
                  ) : null}
                </div>

                <dl className="parcel-card__meta">
                  {parcel.storage_slot ? (
                    <>
                      <dt>보관</dt>
                      <dd>{parcel.storage_slot}</dd>
                    </>
                  ) : null}
                  {parcel.description ? (
                    <>
                      <dt>내용</dt>
                      <dd>{parcel.description}</dd>
                    </>
                  ) : null}
                  {parcel.contact_notes ? (
                    <>
                      <dt>연락</dt>
                      <dd className="parcel-card__memo">{parcel.contact_notes}</dd>
                    </>
                  ) : null}
                  {parcel.notes ? (
                    <>
                      <dt>메모</dt>
                      <dd className="parcel-card__memo">{parcel.notes}</dd>
                    </>
                  ) : null}
                </dl>

                <p className="parcel-card__time">접수 {formatReceivedAt(parcel.received_at)}</p>
                {overdue ? <p className="parcel-card__overdue">3일 이상 미인도</p> : null}
                {completed ? (
                  <p className="parcel-card__delivered">
                    {parcel.status === 'returned' ? '반송 처리' : '인도 완료'}
                    {parcel.recipient_name ? ` · ${parcel.recipient_name}` : ''}
                    {parcel.delivered_at ? ` · ${formatReceivedAt(parcel.delivered_at)}` : ''}
                  </p>
                ) : null}

                <div className="parcel-card__actions">
                  {!completed ? (
                    <>
                      {parcel.status === 'stored' ? (
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => void markReady(parcel)}>
                          인도 대기
                        </button>
                      ) : null}
                      {parcel.direction === 'out_to_room' ? (
                        <button type="button" className="btn btn--primary btn--small" onClick={() => openSign(parcel)}>
                          인도 서명
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary btn--small"
                          onClick={async () => {
                            if (!requireSession('인도 완료')) return;
                            try {
                              await updateParcel.mutateAsync({
                                id: parcel.id,
                                input: { status: 'delivered', updated_by: authorLabel },
                              });
                              showToast('인도 완료로 처리했습니다.');
                            } catch (caught) {
                              showToast(formatSupabaseClientError(caught));
                            }
                          }}
                        >
                          인도 완료
                        </button>
                      )}
                    </>
                  ) : null}
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => void openDetail(parcel)}>
                    상세
                  </button>
                  {!completed ? (
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => openEdit(parcel)}>
                      수정
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ParcelFormModal
        open={formOpen}
        editing={editing}
        authorLabel={authorLabel}
        defaultDirection={defaultDirectionForTab(boardTab)}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <ParcelSignLinkModal
        open={Boolean(signParcel)}
        parcel={signParcel}
        staffName={authorLabel || session.name}
        onClose={() => setSignParcel(null)}
        onDelivered={(parcel) => {
          showToast(
            `${parcel.room_number ? `${parcel.room_number}호 ` : ''}인도가 완료되었습니다.`,
          );
        }}
        onToast={showToast}
      />

      {detailParcel ? (
        <div className="modal-overlay modal-overlay--parcel" onClick={closeDetail}>
          <div className="modal modal--parcel-detail" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2>상세</h2>
              <button type="button" className="icon-btn" onClick={closeDetail} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="modal__form parcel-detail">
              <dl>
                <dt>구분</dt>
                <dd>{PARCEL_DIRECTION_LABELS[detailParcel.direction]}</dd>
                <dt>객실</dt>
                <dd>{detailParcel.room_number || '—'}</dd>
                <dt>게스트</dt>
                <dd>{detailParcel.guest_name || '—'}</dd>
                <dt>체크아웃</dt>
                <dd>
                  {detailParcel.checkout_date
                    ? formatParcelCheckoutDate(detailParcel.checkout_date)
                    : '—'}
                </dd>
                <dt>상태</dt>
                <dd>{PARCEL_STATUS_LABELS[detailParcel.status]}</dd>
                <dt>보관</dt>
                <dd>{detailParcel.storage_slot || '—'}</dd>
                <dt>내용</dt>
                <dd>{detailParcel.description || '—'}</dd>
                <dt>연락 메모</dt>
                <dd>{detailParcel.contact_notes || '—'}</dd>
                <dt>메모</dt>
                <dd>{detailParcel.notes || '—'}</dd>
                {detailParcel.recipient_name ? (
                  <>
                    <dt>수령자</dt>
                    <dd>{detailParcel.recipient_name}</dd>
                  </>
                ) : null}
                {detailParcel.confirmed_by_staff ? (
                  <>
                    <dt>확인 직원</dt>
                    <dd>{detailParcel.confirmed_by_staff}</dd>
                  </>
                ) : null}
              </dl>

              {signatureUrl ? (
                <div className="parcel-detail__signature">
                  <h3>인도 서명</h3>
                  <img src={signatureUrl} alt="인도 서명" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </section>
  );
}
