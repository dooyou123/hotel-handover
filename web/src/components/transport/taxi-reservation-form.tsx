'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TAXI_DESTINATIONS,
  TAXI_VEHICLE_TYPES,
  calculateTaxiPrice,
  formatTaxiPriceDisplay,
  isKnownDestination,
} from '@/lib/taxi/destinations';
import {
  emptyTaxiBookingInput,
  type TransportBooking,
  type TransportBookingInput,
} from '@/lib/transport/types';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';

type TaxiReservationFormProps = {
  open: boolean;
  editing: TransportBooking | null;
  authorLabel: string;
  defaultDate: string;
  onClose: () => void;
  onSave: (input: TransportBookingInput) => Promise<void>;
};

function formatPreviewPickup(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaxiReservationForm({
  open,
  editing,
  authorLabel,
  defaultDate,
  onClose,
  onSave,
}: TaxiReservationFormProps) {
  const [form, setForm] = useState<TransportBookingInput>(() => emptyTaxiBookingInput(authorLabel, defaultDate));
  const [customDestination, setCustomDestination] = useState(false);
  const [saving, setSaving] = useState(false);
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const dest = editing.destination;
      const known = isKnownDestination(dest);
      setCustomDestination(!known && Boolean(dest));
      setForm({
        booking_date: editing.booking_date,
        pickup_time: editing.pickup_time.slice(0, 5),
        booking_type: 'taxi',
        room_number: editing.room_number,
        guest_name: editing.guest_name,
        booker_name: editing.booker_name || editing.guest_name,
        destination: dest,
        passengers: editing.passengers,
        baggage_count: editing.baggage_count,
        vehicle_type: editing.vehicle_type,
        price: editing.price,
        vehicle_number: editing.vehicle_number,
        contact_phone: editing.contact_phone,
        notes: editing.notes,
        memo: editing.memo || editing.notes,
        status: editing.status,
        author: editing.author,
        created_by: editing.created_by || editing.author,
        updated_by: authorLabel,
      });
    } else {
      setCustomDestination(false);
      setForm(emptyTaxiBookingInput(authorLabel, defaultDate));
    }
  }, [open, editing, authorLabel, defaultDate]);

  const previewTitle = useMemo(() => {
    const room = form.room_number ? `${form.room_number}호` : null;
    const guest = form.booker_name || form.guest_name || null;
    return [room, guest].filter(Boolean).join(' · ') || '새 택시 예약';
  }, [form.room_number, form.booker_name, form.guest_name]);

  const autoPriced = isKnownDestination(form.destination) && Boolean(form.price);

  function setDestination(destination: string) {
    const price = isKnownDestination(destination)
      ? calculateTaxiPrice(destination, form.vehicle_type)
      : form.price;
    setForm((prev) => ({ ...prev, destination, price }));
  }

  function setVehicleType(vehicleType: (typeof TAXI_VEHICLE_TYPES)[number]) {
    const price = isKnownDestination(form.destination)
      ? calculateTaxiPrice(form.destination, vehicleType)
      : form.price;
    setForm((prev) => ({ ...prev, vehicle_type: vehicleType, price }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        booker_name: form.booker_name || form.guest_name,
        updated_by: authorLabel,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay modal-overlay--taxi" {...overlayProps}>
      <div className="modal modal--taxi" {...panelProps}>
        <form onSubmit={handleSubmit} className="modal__form taxi-form">
          <div className="modal__header">
            <div>
              <h2>{editing ? '택시 예약 수정' : '신규 예약 추가'}</h2>
              <p className="taxi-form__subtitle">픽업 정보를 입력하면 요금이 자동 계산됩니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="taxi-form__scroll">
            <div className="taxi-form__preview">
              <strong>{previewTitle}</strong>
              <span>
                {form.destination || '목적지 선택'}
                {form.pickup_time ? ` · ${formatPreviewPickup(form.booking_date, form.pickup_time)}` : ''}
              </span>
              {autoPriced ? (
                <em className="taxi-form__preview-price">{formatTaxiPriceDisplay(form.price)}</em>
              ) : null}
            </div>

            <div className="taxi-form__body">
            <section className="taxi-form__section">
              <h3 className="taxi-form__section-title">픽업 일시</h3>
              <div className="taxi-form__row taxi-form__row--2">
                <label className="field">
                  <span>탑승 날짜</span>
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>탑승 시간</span>
                  <input
                    type="time"
                    value={form.pickup_time}
                    onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
                    required
                  />
                </label>
              </div>
            </section>

            <section className="taxi-form__section">
              <h3 className="taxi-form__section-title">고객</h3>
              <div className="taxi-form__row taxi-form__row--2">
                <label className="field">
                  <span>객실번호</span>
                  <input
                    value={form.room_number}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    placeholder="643"
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  <span>예약자명</span>
                  <input
                    value={form.booker_name}
                    onChange={(e) =>
                      setForm({ ...form, booker_name: e.target.value, guest_name: e.target.value })
                    }
                    placeholder="성함"
                  />
                </label>
              </div>
            </section>

            <section className="taxi-form__section">
              <h3 className="taxi-form__section-title">목적지 · 차종</h3>
              <div className="taxi-form__dest-grid" role="group" aria-label="목적지">
                {TAXI_DESTINATIONS.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    className={`taxi-form__dest-btn${
                      !customDestination && form.destination === dest ? ' is-active' : ''
                    }`}
                    onClick={() => {
                      setCustomDestination(false);
                      setDestination(dest);
                    }}
                  >
                    {dest}
                  </button>
                ))}
                <button
                  type="button"
                  className={`taxi-form__dest-btn taxi-form__dest-btn--other${
                    customDestination ? ' is-active' : ''
                  }`}
                  onClick={() => {
                    setCustomDestination(true);
                    setForm((prev) => ({ ...prev, destination: '', price: '' }));
                  }}
                >
                  기타
                </button>
              </div>
              {customDestination ? (
                <label className="field field--full">
                  <span>목적지 직접 입력</span>
                  <input
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value, price: '' })}
                    placeholder="예: 서울역, 강남역"
                  />
                </label>
              ) : null}

              <div className="field field--full">
                <span>차종</span>
                <div className="taxi-form__vehicle-toggle" role="radiogroup" aria-label="차종">
                  {TAXI_VEHICLE_TYPES.map((vt) => (
                    <button
                      key={vt}
                      type="button"
                      role="radio"
                      aria-checked={form.vehicle_type === vt}
                      className={`taxi-form__vehicle-btn taxi-form__vehicle-btn--${vt === '점보' ? 'jumbo' : 'regular'}${
                        form.vehicle_type === vt ? ' is-active' : ''
                      }`}
                      onClick={() => setVehicleType(vt)}
                    >
                      {vt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="taxi-form__section">
              <h3 className="taxi-form__section-title">요금 · 인원</h3>
              <div className="taxi-form__row taxi-form__row--3">
                <label className="field">
                  <span>요금</span>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder={autoPriced ? undefined : '85000 또는 미터'}
                    readOnly={autoPriced}
                    className={autoPriced ? 'taxi-form__input--readonly' : undefined}
                  />
                  {autoPriced ? (
                    <small className="taxi-form__hint">목적지·차종 기준 자동 적용</small>
                  ) : null}
                </label>
                <label className="field">
                  <span>인원</span>
                  <input
                    type="number"
                    min={1}
                    value={form.passengers}
                    onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="field">
                  <span>짐 (개)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.baggage_count}
                    onChange={(e) => setForm({ ...form, baggage_count: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
            </section>

            <section className="taxi-form__section">
              <h3 className="taxi-form__section-title">배차 · 메모</h3>
              <div className="taxi-form__row taxi-form__row--2">
                <label className="field">
                  <span>차량번호</span>
                  <input
                    value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                    placeholder="배차 후 입력"
                  />
                </label>
                <div className="field">
                  <span>등록 직원</span>
                  <div className="taxi-form__staff-chip">{form.created_by || authorLabel}</div>
                </div>
              </div>
              <label className="field field--full">
                <span>메모</span>
                <textarea
                  rows={2}
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value, notes: e.target.value })}
                  placeholder="기사·프런트 전달 사항"
                />
              </label>
            </section>
            </div>
          </div>

          <div className="modal__footer taxi-form__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? '저장 중…' : editing ? '수정 저장' : '예약 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
