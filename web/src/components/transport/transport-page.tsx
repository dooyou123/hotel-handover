'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { todayDateString } from '@/lib/handover/shift-summary';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { TRANSPORT_TAB_HINTS } from '@/lib/nav/sub-feature-copy';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { dashboardPeriodRange } from '@/lib/taxi/dashboard';
import { pickupDateTime } from '@/lib/taxi/format';
import { fetchTaxiWhatsAppRecipient } from '@/lib/taxi/settings';
import { buildWhatsAppMessage, openWhatsApp } from '@/lib/taxi/whatsapp';
import {
  filterTransportNeedsInput,
  filterTransportNeedsInputImminent,
} from '@/lib/transport/alerts';
import type { TransportBooking, TransportBookingInput, TransportStatus } from '@/lib/transport/types';
import { formatSupabaseClientError } from '@/lib/supabase/env';
import { useTransportBookings } from '@/lib/transport/use-transport';
import { TaxiDashboard } from '@/components/transport/taxi-dashboard';
import { TaxiReservationCard } from '@/components/transport/taxi-reservation-card';
import { TaxiReservationForm } from '@/components/transport/taxi-reservation-form';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useIsManager } from '@/lib/handover/use-cards';

type TaxiTab = 'list' | 'dashboard';
type StatusFilter = 'all' | 'pending' | 'needs_input' | 'completed' | 'cancelled' | 'done_cancelled';

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '진행중' },
  { value: 'needs_input', label: '입력 필요' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
  { value: 'done_cancelled', label: '완료·취소' },
];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;

function isCompletedHiddenFromAll(booking: TransportBooking, now = Date.now()): boolean {
  if (booking.status !== 'completed') return false;
  const completedAt = new Date(booking.updated_at).getTime();
  if (Number.isNaN(completedAt)) return false;
  return now - completedAt > COMPLETED_HIDE_AFTER_MS;
}

export function TransportPageClient() {
  const pageMeta = getNavPageMeta('/transport');
  const searchParams = useSearchParams();
  const { authorLabel, requireSession } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const { data: isManager = false } = useIsManager();
  const today = todayDateString();

  const initialStatusFilter: StatusFilter =
    searchParams.get('filter') === 'needs_input' ? 'needs_input' : 'all';

  const [tab, setTab] = useState<TaxiTab>('list');
  const [fromDate, setFromDate] = useState(() => `${today.slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(() => addDays(today, 90));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransportBooking | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { bookings, isLoading, error: fetchError, createBooking, updateBooking, deleteBooking } =
    useTransportBookings({
      from: fromDate,
      to: toDate,
    });

  const { data: whatsAppRecipient = '' } = useQuery({
    queryKey: ['taxi-whatsapp-recipient'],
    queryFn: () => fetchTaxiWhatsAppRecipient(),
  });

  useEffect(() => {
    if (searchParams.get('filter') === 'needs_input') {
      setStatusFilter('needs_input');
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...bookings];

    if (statusFilter === 'all') {
      const now = Date.now();
      list = list.filter((b) => !isCompletedHiddenFromAll(b, now));
    }

    if (statusFilter === 'pending') {
      list = list.filter((b) => b.status === 'pending');
    } else if (statusFilter === 'needs_input') {
      list = filterTransportNeedsInput(list);
    } else if (statusFilter === 'completed') {
      list = list.filter((b) => b.status === 'completed');
    } else if (statusFilter === 'cancelled') {
      list = list.filter((b) => b.status === 'cancelled');
    } else if (statusFilter === 'done_cancelled') {
      list = list.filter((b) => b.status === 'completed' || b.status === 'cancelled');
    }

    list.sort((a, b) => pickupDateTime(a).getTime() - pickupDateTime(b).getTime());

    if (!q) return list;
    return list.filter((b) => {
      const guest = (b.booker_name || b.guest_name).toLowerCase();
      return (
        b.room_number.toLowerCase().includes(q) ||
        guest.includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const now = Date.now();
    const counts = { all: 0, pending: 0, needs_input: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) {
      if (!isCompletedHiddenFromAll(b, now)) counts.all += 1;
      if (b.status === 'pending') counts.pending += 1;
      else if (b.status === 'completed') counts.completed += 1;
      else if (b.status === 'cancelled') counts.cancelled += 1;
    }
    counts.needs_input = filterTransportNeedsInput(bookings).length;
    return counts;
  }, [bookings]);

  const imminentNeedsInputCount = useMemo(
    () => filterTransportNeedsInputImminent(bookings).length,
    [bookings],
  );

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function openCreate() {
    if (!requireSession('예약 등록')) return;
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(booking: TransportBooking) {
    setEditing(booking);
    setFormOpen(true);
  }

  async function handleSave(input: TransportBookingInput) {
    if (!requireSession('저장')) return;
    try {
      if (editing) {
        await updateBooking.mutateAsync({
          id: editing.id,
          input,
          updatedBy: authorLabel,
        });
        showToast('예약을 수정했습니다.');
      } else {
        const created = await createBooking.mutateAsync({
          ...input,
          author: authorLabel,
          created_by: authorLabel,
          updated_by: authorLabel,
        });
        showToast('예약을 등록했습니다.');
        try {
          openWhatsApp(whatsAppRecipient, buildWhatsAppMessage(created));
        } catch (caught) {
          showToast(caught instanceof Error ? caught.message : 'WhatsApp 번호를 설정해 주세요.');
        }
      }
    } catch (caught) {
      showToast(formatSupabaseClientError(caught));
      throw caught;
    }
  }

  async function handleStatusChange(booking: TransportBooking, status: TransportStatus) {
    if (status === booking.status) return;
    if (status === 'completed') {
      const pickup = pickupDateTime(booking);
      if (pickup.getTime() > Date.now()) {
        const ok = await confirm({
          title: '완료 처리',
          message: '픽업 시간이 아직 지나지 않았습니다. 완료 처리할까요?',
          tone: 'warning',
          confirmLabel: '완료',
        });
        if (!ok) return;
      }
    }
    try {
      const updated = await updateBooking.mutateAsync({
        id: booking.id,
        input: { status },
        updatedBy: authorLabel,
      });
      showToast(`${status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '진행중'} 처리했습니다.`);
      if (status === 'cancelled') {
        try {
          openWhatsApp(whatsAppRecipient, buildWhatsAppMessage(updated));
        } catch {
          /* optional */
        }
      }
    } catch (caught) {
      showToast(formatSupabaseClientError(caught));
    }
  }

  async function handleDelete(booking: TransportBooking) {
    const ok = await confirm({
      title: '예약 삭제',
      message: '이 예약을 삭제할까요?',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    try {
      await deleteBooking.mutateAsync(booking.id);
      showToast('삭제했습니다.');
    } catch {
      showToast('삭제에 실패했습니다.');
    }
  }

  return (
    <>
      <section className="project-board taxi-page">
        <header className="project-board__head">
          <div>
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.description}</p>
          </div>
          <div className="taxi-page__header-actions">
            {isManager ? (
              <Link href="/settings" className="btn btn--ghost btn--xs" title="설정 → 메뉴 탭">
                WhatsApp 설정
              </Link>
            ) : null}
          </div>
        </header>

        <nav className="taxi-page__tabs" aria-label="택시 메뉴">
          <button
            type="button"
            className={`taxi-page__tab${tab === 'list' ? ' is-active' : ''}`}
            onClick={() => setTab('list')}
          >
            예약 목록
          </button>
          <button
            type="button"
            className={`taxi-page__tab${tab === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => {
              const range = dashboardPeriodRange('month', today);
              setFromDate(range.from);
              setToDate(range.to);
              setTab('dashboard');
            }}
          >
            대시보드
          </button>
        </nav>
        <p className="taxi-page__tab-hint">{TRANSPORT_TAB_HINTS[tab]}</p>

        {fetchError ? (
          <div className="taxi-page__alert" role="alert">
            <strong>Supabase 연결 실패</strong>
            <p>{formatSupabaseClientError(fetchError)}</p>
          </div>
        ) : null}

        {tab === 'list' ? (
          <>
            <div className="taxi-page__filters">
              <div className="taxi-page__toolbar">
                <input
                  type="search"
                  className="taxi-page__search"
                  placeholder="이름, 객실, 목적지 검색…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="taxi-page__date-range">
                  <span className="taxi-page__date-range-label">픽업 기간</span>
                  <input
                    type="date"
                    className="taxi-page__date-input"
                    value={fromDate}
                    max={toDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    aria-label="시작일"
                  />
                  <span className="taxi-page__range-sep">~</span>
                  <input
                    type="date"
                    className="taxi-page__date-input"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    aria-label="종료일"
                  />
                  <div className="taxi-page__date-presets">
                    <button
                      type="button"
                      className="taxi-page__date-preset"
                      onClick={() => {
                        setFromDate(today);
                        setToDate(today);
                      }}
                    >
                      오늘
                    </button>
                    <button
                      type="button"
                      className="taxi-page__date-preset"
                      onClick={() => {
                        setFromDate(today);
                        setToDate(addDays(today, 7));
                      }}
                    >
                      7일
                    </button>
                    <button
                      type="button"
                      className="taxi-page__date-preset"
                      onClick={() => {
                        setFromDate(today);
                        setToDate(addDays(today, 90));
                      }}
                    >
                      3개월
                    </button>
                  </div>
                </div>
                <button type="button" className="btn btn--primary taxi-page__add-btn" onClick={openCreate}>
                  + 신규 예약 추가
                </button>
              </div>

              <div className="taxi-page__status-bar">
                <span className="taxi-page__status-bar-label">상태</span>
                <div className="segmented-control segmented-control--compact segmented-control--wrap">
                  {STATUS_FILTER_OPTIONS.map((opt) => {
                    let count: number | null = null;
                    if (opt.value === 'all') count = statusCounts.all;
                    else if (opt.value === 'pending') count = statusCounts.pending;
                    else if (opt.value === 'needs_input') count = statusCounts.needs_input;
                    else if (opt.value === 'completed') count = statusCounts.completed;
                    else if (opt.value === 'cancelled') count = statusCounts.cancelled;
                    else if (opt.value === 'done_cancelled') {
                      count = statusCounts.completed + statusCounts.cancelled;
                    }
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`segmented-control__btn${
                          statusFilter === opt.value ? ' is-active' : ''
                        }${
                          opt.value === 'completed' ? ' segmented-control__btn--positive' : ''
                        }${opt.value === 'cancelled' ? ' segmented-control__btn--negative' : ''}${
                          opt.value === 'needs_input' ? ' segmented-control__btn--warning' : ''
                        }`}
                        onClick={() => setStatusFilter(opt.value)}
                      >
                        {opt.label}
                        {count !== null ? ` (${count})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {imminentNeedsInputCount > 0 ? (
                <p className="taxi-page__needs-input-banner" role="status">
                  30분 이내 픽업 {imminentNeedsInputCount}건 — 객실·게스트·차량번호를 확인해 주세요.
                  {statusFilter !== 'needs_input' ? (
                    <button
                      type="button"
                      className="taxi-page__needs-input-link"
                      onClick={() => setStatusFilter('needs_input')}
                    >
                      입력 필요만 보기
                    </button>
                  ) : null}
                </p>
              ) : null}
            </div>

            {isLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : !filtered.length ? (
              <p className="empty-state">
                {bookings.length
                  ? '조건에 맞는 예약이 없습니다. 상태 필터를 바꿔 보세요.'
                  : '해당 기간에 예약이 없습니다.'}
              </p>
            ) : (
              <div className="taxi-page__grid">
                {filtered.map((booking) => (
                  <TaxiReservationCard
                    key={booking.id}
                    booking={booking}
                    whatsAppRecipient={whatsAppRecipient}
                    onStatusChange={(status) => void handleStatusChange(booking, status)}
                    onInlineUpdate={async (patch) => {
                      await updateBooking.mutateAsync({
                        id: booking.id,
                        input: patch,
                        updatedBy: authorLabel,
                      });
                    }}
                    onEdit={() => openEdit(booking)}
                    onDelete={() => void handleDelete(booking)}
                    onWhatsAppError={showToast}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          isLoading ? (
            <p className="empty-state">불러오는 중…</p>
          ) : (
            <TaxiDashboard
              bookings={bookings}
              today={today}
              fromDate={fromDate}
              toDate={toDate}
              onPeriodChange={(from, to) => {
                setFromDate(from);
                setToDate(to);
              }}
              onSwitchToList={() => setTab('list')}
            />
          )
        )}

      </section>

      <TaxiReservationForm
        open={formOpen}
        editing={editing}
        authorLabel={authorLabel}
        defaultDate={today}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
