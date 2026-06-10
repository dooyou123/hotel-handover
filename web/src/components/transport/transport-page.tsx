'use client';

import { useMemo, useState } from 'react';
import { todayDateString } from '@/lib/handover/shift-summary';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  TRANSPORT_STATUSES,
  TRANSPORT_TYPES,
  formatPickupDateTime,
  transportStatusLabel,
  transportTypeLabel,
  type TransportBooking,
  type TransportBookingInput,
  type TransportStatus,
  type TransportType,
} from '@/lib/transport/types';
import { useTransportBookings } from '@/lib/transport/use-transport';

function emptyForm(author: string, date: string): TransportBookingInput {
  return {
    booking_date: date,
    pickup_time: '09:00',
    booking_type: 'taxi',
    room_number: '',
    guest_name: '',
    destination: '',
    passengers: 1,
    contact_phone: '',
    notes: '',
    status: 'pending',
    author,
  };
}

export function TransportPageClient() {
  const { authorLabel, requireSession } = useWorkSession();
  const [workDate, setWorkDate] = useState(() => todayDateString());
  const { bookings, isLoading, createBooking, updateBooking, deleteBooking } = useTransportBookings(workDate);
  const [editing, setEditing] = useState<TransportBooking | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm('', workDate));
  const [toast, setToast] = useState<string | null>(null);

  const pending = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openCreate() {
    if (!requireSession('예약 등록')) return;
    setEditing(null);
    setForm(emptyForm(authorLabel, workDate));
    setFormOpen(true);
  }

  function openEdit(booking: TransportBooking) {
    setEditing(booking);
    setForm({
      booking_date: booking.booking_date,
      pickup_time: booking.pickup_time.slice(0, 5),
      booking_type: booking.booking_type,
      room_number: booking.room_number,
      guest_name: booking.guest_name,
      destination: booking.destination,
      passengers: booking.passengers,
      contact_phone: booking.contact_phone,
      notes: booking.notes,
      status: booking.status,
      author: booking.author,
    });
    setFormOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!requireSession('저장')) return;
    try {
      if (editing) {
        await updateBooking.mutateAsync({ id: editing.id, input: form });
        showToast('예약을 수정했습니다.');
      } else {
        await createBooking.mutateAsync({ ...form, author: authorLabel });
        showToast('예약을 등록했습니다.');
      }
      setFormOpen(false);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    }
  }

  async function markStatus(booking: TransportBooking, status: TransportStatus) {
    try {
      await updateBooking.mutateAsync({ id: booking.id, input: { status } });
      showToast(status === 'done' ? '완료 처리했습니다.' : '취소했습니다.');
    } catch {
      showToast('상태 변경에 실패했습니다.');
    }
  }

  return (
    <>
      <section className="transport-page">
        <header className="transport-page__header">
          <div>
            <h2>픽업 · 택시 예약</h2>
            <p>당일 픽업·택시·공항 이동 예약을 기록합니다.</p>
          </div>
          <div className="transport-page__actions">
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} aria-label="예약 날짜" />
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              예약 추가
            </button>
          </div>
        </header>

        <div className="transport-page__stats">
          <span>예약 <strong>{pending.length}</strong>건</span>
          <span>전체 <strong>{bookings.length}</strong>건</span>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : !bookings.length ? (
          <p className="empty-state">등록된 예약이 없습니다.</p>
        ) : (
          <div className="transport-list">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className={`transport-card transport-card--${booking.status}`}
              >
                <div className="transport-card__head">
                  <strong>{formatPickupDateTime(booking.booking_date, booking.pickup_time)}</strong>
                  <span className="transport-card__type">{transportTypeLabel(booking.booking_type)}</span>
                  <span className="transport-card__status">{transportStatusLabel(booking.status)}</span>
                </div>
                <p className="transport-card__route">
                  {booking.room_number ? `${booking.room_number}호 · ` : ''}
                  {booking.guest_name || '고객 미입력'}
                  {booking.destination ? ` → ${booking.destination}` : ''}
                </p>
                <p className="transport-card__meta">
                  {booking.passengers}명
                  {booking.contact_phone ? ` · ${booking.contact_phone}` : ''}
                </p>
                {booking.notes ? <p className="transport-card__notes">{booking.notes}</p> : null}
                <div className="transport-card__actions">
                  <button type="button" className="btn btn--ghost btn--xs" onClick={() => openEdit(booking)}>
                    수정
                  </button>
                  {booking.status === 'pending' ? (
                    <>
                      <button type="button" className="btn btn--outline btn--xs" onClick={() => markStatus(booking, 'done')}>
                        완료
                      </button>
                      <button type="button" className="btn btn--ghost btn--xs" onClick={() => markStatus(booking, 'cancelled')}>
                        취소
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => deleteBooking.mutateAsync(booking.id).then(() => showToast('삭제했습니다.'))}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="modal__form">
              <div className="modal__header">
                <h2>{editing ? '예약 수정' : '예약 추가'}</h2>
                <button type="button" className="icon-btn" onClick={() => setFormOpen(false)} aria-label="닫기">
                  ✕
                </button>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>날짜</span>
                  <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />
                </label>
                <label className="field">
                  <span>시간</span>
                  <input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} required />
                </label>
                <label className="field">
                  <span>유형</span>
                  <select value={form.booking_type} onChange={(e) => setForm({ ...form, booking_type: e.target.value as TransportType })}>
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>상태</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TransportStatus })}>
                    {TRANSPORT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>객실</span>
                  <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="802" />
                </label>
                <label className="field">
                  <span>고객명</span>
                  <input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
                </label>
                <label className="field field--full">
                  <span>목적지</span>
                  <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="인천공항 T1" />
                </label>
                <label className="field">
                  <span>인원</span>
                  <input type="number" min={1} value={form.passengers} onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) || 1 })} />
                </label>
                <label className="field">
                  <span>연락처</span>
                  <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </label>
                <label className="field field--full">
                  <span>비고</span>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </label>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setFormOpen(false)}>취소</button>
                <button type="submit" className="btn btn--primary">저장</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
