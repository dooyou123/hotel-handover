'use client';

import { useState } from 'react';
import { formatTaxiPriceDisplay } from '@/lib/taxi/destinations';
import {
  cardStatusClass,
  formatCountdownLabel,
  formatPickupCardDate,
  isPickupOverdue,
  isPickupToday,
} from '@/lib/taxi/format';
import { buildWhatsAppMessage, openWhatsApp } from '@/lib/taxi/whatsapp';
import type { SlipLanguage } from '@/lib/taxi/slip';
import { printReservationSlip } from '@/lib/taxi/slip';
import {
  isTransportNeedsInputImminent,
  transportNeedsInput,
  transportNeedsInputMissingLabels,
} from '@/lib/transport/alerts';
import { transportStatusLabel, type TransportBooking, type TransportStatus } from '@/lib/transport/types';

type TaxiReservationCardProps = {
  booking: TransportBooking;
  whatsAppRecipient: string;
  onStatusChange: (status: TransportStatus) => void;
  onInlineUpdate: (patch: { vehicle_number?: string; memo?: string }) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onWhatsAppError: (message: string) => void;
};

const SLIP_LANGS: { value: SlipLanguage; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'ja', label: 'JA' },
  { value: 'zh', label: 'ZH' },
];

const STATUS_BTN_CLASS: Record<TransportStatus, string> = {
  pending: 'taxi-card__status-btn--pending',
  completed: 'taxi-card__status-btn--completed',
  cancelled: 'taxi-card__status-btn--cancelled',
};

export function TaxiReservationCard({
  booking,
  whatsAppRecipient,
  onStatusChange,
  onInlineUpdate,
  onEdit,
  onDelete,
  onWhatsAppError,
}: TaxiReservationCardProps) {
  const [editingField, setEditingField] = useState<'vehicle_number' | 'memo' | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const countdown = formatCountdownLabel(booking);
  const guest = booking.booker_name || booking.guest_name;
  const memo = booking.memo || booking.notes;
  const isJumbo = booking.vehicle_type === '점보';
  const isToday = isPickupToday(booking);
  const isCancelled = booking.status === 'cancelled';
  const needsInput = transportNeedsInput(booking);
  const needsInputImminent = isTransportNeedsInputImminent(booking);
  const missingLabels = transportNeedsInputMissingLabels(booking);

  function startInline(field: 'vehicle_number' | 'memo') {
    if (isCancelled) return;
    setEditingField(field);
    setDraft(field === 'vehicle_number' ? booking.vehicle_number : memo);
  }

  async function commitInline() {
    if (!editingField) return;
    setSaving(true);
    try {
      await onInlineUpdate(
        editingField === 'vehicle_number' ? { vehicle_number: draft } : { memo: draft },
      );
      setEditingField(null);
    } finally {
      setSaving(false);
    }
  }

  function handleWhatsApp() {
    try {
      openWhatsApp(whatsAppRecipient, buildWhatsAppMessage(booking));
    } catch (caught) {
      onWhatsAppError(caught instanceof Error ? caught.message : 'WhatsApp 전송에 실패했습니다.');
    }
  }

  return (
    <article
      className={`taxi-card ${cardStatusClass(booking.status, booking)}${
        isJumbo ? ' taxi-card--jumbo' : ' taxi-card--regular'
      }${needsInputImminent ? ' taxi-card--needs-input' : ''}`}
    >
      <div
        className={`taxi-card__banner${
          isJumbo ? ' taxi-card__banner--jumbo' : ' taxi-card__banner--regular'
        }`}
      >
        <div className="taxi-card__banner-meta">
          <span className="taxi-card__visual-type">{isJumbo ? '점보' : '일반'}</span>
          {countdown ? <span className="taxi-card__countdown">{countdown}</span> : null}
          {needsInputImminent ? (
            <span className="taxi-card__needs-input-badge">입력 필요</span>
          ) : null}
          <span className={`taxi-card__status-pill taxi-card__status-pill--${booking.status}`}>
            {transportStatusLabel(booking.status)}
          </span>
        </div>
        <p className="taxi-card__banner-dest">{booking.destination || '목적지 미입력'}</p>
        <p className={`taxi-card__banner-time${isToday ? ' taxi-card__banner-time--today' : ''}`}>
          {isToday ? <span className="taxi-card__today-tag">오늘</span> : null}
          <span>{formatPickupCardDate(booking)}</span>
        </p>
      </div>

      <div className="taxi-card__body">
        <header className="taxi-card__head">
          <div className="taxi-card__identity">
            <span className="taxi-card__room">{booking.room_number ? `${booking.room_number}호` : '—'}</span>
            <span className="taxi-card__guest">{guest || '예약자 미입력'}</span>
          </div>
        </header>

        {isPickupOverdue(booking) ? (
          <p className="taxi-card__warning">픽업 시간이 지났습니다</p>
        ) : null}

        {needsInput && !isCancelled ? (
          <p className={`taxi-card__warning${needsInputImminent ? ' taxi-card__warning--urgent' : ''}`}>
            {needsInputImminent
              ? `30분 이내 픽업 — ${missingLabels.join('·')} 미입력`
              : `필수 정보 누락: ${missingLabels.join('·')}`}
          </p>
        ) : null}

        <div className="taxi-card__chips">
          <span
            className={`taxi-card__chip taxi-card__chip--vehicle${
              isJumbo ? ' taxi-card__chip--jumbo' : ''
            }`}
          >
            {isJumbo ? '점보' : '일반'}
          </span>
          <span className="taxi-card__chip">{formatTaxiPriceDisplay(booking.price)}</span>
          <span className="taxi-card__chip taxi-card__chip--muted">
            {booking.passengers}명 · 짐 {booking.baggage_count}개
          </span>
        </div>

        <div className="taxi-card__fields">
          <label className="taxi-card__field">
            <span>차량번호</span>
            {editingField === 'vehicle_number' ? (
              <input
                autoFocus
                value={draft}
                disabled={saving}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commitInline()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitInline();
                  if (e.key === 'Escape') setEditingField(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="taxi-card__field-btn"
                disabled={isCancelled}
                onClick={() => startInline('vehicle_number')}
              >
                {booking.vehicle_number || '입력'}
              </button>
            )}
          </label>
          <label className="taxi-card__field">
            <span>메모</span>
            {editingField === 'memo' ? (
              <textarea
                autoFocus
                rows={2}
                value={draft}
                disabled={saving}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commitInline()}
              />
            ) : (
              <button
                type="button"
                className="taxi-card__field-btn taxi-card__field-btn--memo"
                disabled={isCancelled}
                onClick={() => startInline('memo')}
              >
                {memo || '없음'}
              </button>
            )}
          </label>
        </div>

        <div className="taxi-card__actions">
          <button type="button" className="taxi-card__action taxi-card__action--wa" onClick={handleWhatsApp}>
            WhatsApp
          </button>
          <div className="taxi-card__print-wrap">
            <button
              type="button"
              className="taxi-card__action"
              onClick={() => setPrintOpen((v) => !v)}
            >
              인쇄
            </button>
            {printOpen ? (
              <div className="taxi-card__print-menu">
                {SLIP_LANGS.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => {
                      const ok = printReservationSlip(booking, lang.value);
                      setPrintOpen(false);
                      if (!ok) {
                        onWhatsAppError('인쇄 창을 열지 못했습니다. 브라우저 팝업 차단을 해제해 주세요.');
                      }
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="taxi-card__action" onClick={onEdit}>
            수정
          </button>
          <button
            type="button"
            className="taxi-card__action taxi-card__action--danger"
            onClick={onDelete}
          >
            삭제
          </button>
        </div>

        <div className="taxi-card__status-row" role="group" aria-label="예약 상태">
          {(['pending', 'completed', 'cancelled'] as TransportStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={`taxi-card__status-btn ${STATUS_BTN_CLASS[status]}${
                booking.status === status ? ' is-active' : ''
              }`}
              onClick={() => onStatusChange(status)}
            >
              {transportStatusLabel(status)}
            </button>
          ))}
        </div>

        <footer className="taxi-card__footer">
          {booking.updated_by || booking.created_by || '—'}
        </footer>
      </div>
    </article>
  );
}
