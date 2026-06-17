'use client';

import { useMemo, useState } from 'react';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { getParcelSignatureUrl } from '@/lib/parcels/signatures';
import {
  PARCEL_STATUS_LABELS,
  isParcelOverdue,
  type Parcel,
  type ParcelInput,
} from '@/lib/parcels/types';
import { type ParcelStatusFilter, useParcels } from '@/lib/parcels/use-parcels';
import { formatSupabaseClientError } from '@/lib/supabase/env';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { ParcelFormModal } from '@/components/parcels/parcel-form-modal';
import { ParcelSignLinkModal } from '@/components/parcels/parcel-sign-link-modal';

const FILTER_OPTIONS: { id: ParcelStatusFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'stored', label: '보관 중' },
  { id: 'ready', label: '인도 대기' },
  { id: 'overdue', label: '장기 미인도' },
  { id: 'delivered', label: '인도 완료' },
  { id: 'returned', label: '반송' },
];

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

export function ParcelsPageClient() {
  const { authorLabel, requireSession, session } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const [statusFilter, setStatusFilter] = useState<ParcelStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parcel | null>(null);
  const [signParcel, setSignParcel] = useState<Parcel | null>(null);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { parcels, isLoading, error, createParcel, updateParcel, deleteParcel } = useParcels(statusFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = parcels;

    if (statusFilter === 'overdue') {
      list = list.filter((parcel) => isParcelOverdue(parcel));
    } else if (statusFilter !== 'all') {
      list = list.filter((parcel) => parcel.status === statusFilter);
    }

    if (!q) return list;
    return list.filter((parcel) => {
      return (
        parcel.room_number.toLowerCase().includes(q) ||
        parcel.guest_name.toLowerCase().includes(q) ||
        parcel.carrier.toLowerCase().includes(q) ||
        parcel.storage_slot.toLowerCase().includes(q) ||
        parcel.tracking_number.toLowerCase().includes(q)
      );
    });
  }, [parcels, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: parcels.length,
      stored: parcels.filter((p) => p.status === 'stored').length,
      ready: parcels.filter((p) => p.status === 'ready').length,
      overdue: parcels.filter((p) => isParcelOverdue(p)).length,
      delivered: parcels.filter((p) => p.status === 'delivered').length,
    };
  }, [parcels]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  function openCreate() {
    if (!requireSession('택배 등록')) return;
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
      showToast('이미 처리된 택배입니다.');
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
      title: '택배 삭제',
      message: '이 택배 기록을 삭제할까요?',
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

  return (
    <section className="parcels-page">
      <header className="parcels-page__header">
        <div>
          <h2 className="parcels-page__title">📦 택배 · 우편</h2>
          <p className="parcels-page__desc">보관·인도·서명 확인</p>
        </div>
        <button type="button" className="btn btn--primary parcels-page__add-btn" onClick={openCreate}>
          + 택배 등록
        </button>
      </header>

      <div className="parcels-page__filters">
        <input
          type="search"
          className="parcels-page__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="객실·이름·택배사·보관함 검색…"
          aria-label="택배 검색"
        />
        <div className="parcels-page__status-bar">
          <span className="parcels-page__status-bar-label">상태</span>
          <div className="segmented-control segmented-control--compact segmented-control--wrap">
          {FILTER_OPTIONS.map((opt) => {
            let count: number | null = null;
            if (opt.id in counts) count = counts[opt.id as keyof typeof counts];
            return (
              <button
                key={opt.id}
                type="button"
                className={`segmented-control__btn${statusFilter === opt.id ? ' is-active' : ''}${
                  opt.id === 'overdue' ? ' segmented-control__btn--warning' : ''
                }`}
                onClick={() => setStatusFilter(opt.id)}
              >
                {opt.label}
                {count !== null && opt.id !== 'all' ? ` (${count})` : ''}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {error ? (
        <p className="empty-state" style={{ color: '#b91c1c' }}>
          {formatSupabaseClientError(error)}
          <br />
          Supabase SQL Editor에서 <code>046_parcels_delivery.sql</code> 마이그레이션을 실행했는지 확인해 주세요.
        </p>
      ) : isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : !filtered.length ? (
        <p className="empty-state">
          {parcels.length ? '조건에 맞는 택배가 없습니다.' : '등록된 택배가 없습니다.'}
        </p>
      ) : (
        <div className="parcels-page__list">
          {filtered.map((parcel) => {
            const overdue = isParcelOverdue(parcel);
            return (
              <article
                key={parcel.id}
                className={`parcel-card parcel-card--${parcel.status}${overdue ? ' parcel-card--overdue' : ''}`}
              >
                <header className="parcel-card__head">
                  <div>
                    <span className="parcel-card__room">{parcel.room_number ? `${parcel.room_number}호` : '—'}</span>
                    <span className="parcel-card__guest">{parcel.guest_name || '게스트 미입력'}</span>
                  </div>
                  <span className={`parcel-card__status parcel-card__status--${parcel.status}`}>
                    {PARCEL_STATUS_LABELS[parcel.status]}
                  </span>
                </header>

                <dl className="parcel-card__meta">
                  {parcel.carrier ? (
                    <>
                      <dt>택배사</dt>
                      <dd>{parcel.carrier}</dd>
                    </>
                  ) : null}
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
                </dl>

                <p className="parcel-card__time">접수 {formatReceivedAt(parcel.received_at)}</p>
                {overdue ? <p className="parcel-card__overdue">3일 이상 미인도</p> : null}
                {parcel.status === 'delivered' && parcel.recipient_name ? (
                  <p className="parcel-card__delivered">
                    인도 · {parcel.recipient_name}
                    {parcel.delivered_at ? ` · ${formatReceivedAt(parcel.delivered_at)}` : ''}
                  </p>
                ) : null}

                <div className="parcel-card__actions">
                  {parcel.status !== 'delivered' && parcel.status !== 'returned' ? (
                    <>
                      {parcel.status === 'stored' ? (
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => void markReady(parcel)}>
                          인도 대기
                        </button>
                      ) : null}
                      <button type="button" className="btn btn--primary btn--small" onClick={() => openSign(parcel)}>
                        인도 서명
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => void openDetail(parcel)}>
                    상세
                  </button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => openEdit(parcel)}>
                    수정
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small btn--danger-text"
                    onClick={() => void handleDelete(parcel)}
                  >
                    삭제
                  </button>
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
            `${parcel.room_number ? `${parcel.room_number}호 ` : ''}택배 인도가 완료되었습니다.`,
          );
        }}
        onToast={showToast}
      />

      {detailParcel ? (
        <div className="modal-overlay modal-overlay--parcel" onClick={closeDetail}>
          <div className="modal modal--parcel-detail" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2>택배 상세</h2>
              <button type="button" className="icon-btn" onClick={closeDetail} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="modal__form parcel-detail">
              <dl>
                <dt>객실</dt>
                <dd>{detailParcel.room_number || '—'}</dd>
                <dt>게스트</dt>
                <dd>{detailParcel.guest_name || '—'}</dd>
                <dt>상태</dt>
                <dd>{PARCEL_STATUS_LABELS[detailParcel.status]}</dd>
                <dt>택배사</dt>
                <dd>{detailParcel.carrier || '—'}</dd>
                <dt>보관</dt>
                <dd>{detailParcel.storage_slot || '—'}</dd>
                <dt>운송장</dt>
                <dd>{detailParcel.tracking_number || '—'}</dd>
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
