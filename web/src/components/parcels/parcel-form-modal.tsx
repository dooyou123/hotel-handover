'use client';

import { useEffect, useState } from 'react';
import type { Parcel, ParcelDirection, ParcelInput, ParcelStatus } from '@/lib/parcels/types';
import { PARCEL_DIRECTION_LABELS, PARCEL_STATUS_LABELS } from '@/lib/parcels/types';
import {
  resolveParcelIdentityMode,
  sanitizeParcelInput,
  validateParcelInput,
  type ParcelIdentityMode,
} from '@/lib/parcels/validate';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';

type ParcelFormModalProps = {
  open: boolean;
  editing: Parcel | null;
  authorLabel: string;
  defaultDirection: ParcelDirection;
  onClose: () => void;
  onSave: (input: ParcelInput) => Promise<void>;
};

const EDIT_STATUS_OPTIONS: ParcelStatus[] = ['stored', 'delivered', 'returned'];

export function ParcelFormModal({
  open,
  editing,
  authorLabel,
  defaultDirection,
  onClose,
  onSave,
}: ParcelFormModalProps) {
  const [identityMode, setIdentityMode] = useState<ParcelIdentityMode>('room');
  const [form, setForm] = useState<ParcelInput>(() => ({
    direction: defaultDirection,
    room_number: '',
    reservation_number: '',
    guest_name: '',
    check_in_date: '',
    checkout_date: '',
    storage_slot: '',
    description: '',
    status: 'stored',
    contact_notes: '',
    notes: '',
    created_by: authorLabel,
    updated_by: authorLabel,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const mode = resolveParcelIdentityMode(editing);
      setIdentityMode(mode);
      setForm({
        direction: editing.direction,
        room_number: editing.room_number,
        reservation_number: editing.reservation_number,
        guest_name: editing.guest_name,
        check_in_date: editing.check_in_date,
        checkout_date: editing.checkout_date,
        storage_slot: editing.storage_slot,
        description: editing.description,
        status: editing.status,
        contact_notes: editing.contact_notes,
        notes: editing.notes,
        created_by: editing.created_by,
        updated_by: authorLabel,
      });
    } else {
      setIdentityMode('room');
      setForm({
        direction: defaultDirection,
        room_number: '',
        reservation_number: '',
        guest_name: '',
        check_in_date: '',
        checkout_date: '',
        storage_slot: '',
        description: '',
        status: 'stored',
        contact_notes: '',
        notes: '',
        created_by: authorLabel,
        updated_by: authorLabel,
      });
    }
    setError(null);
  }, [open, editing, authorLabel, defaultDirection]);

  if (!open) return null;

  function switchIdentityMode(mode: ParcelIdentityMode) {
    setIdentityMode(mode);
    setError(null);
    if (mode === 'room') {
      setForm((prev) => ({ ...prev, reservation_number: '', check_in_date: '' }));
    } else {
      setForm((prev) => ({ ...prev, room_number: '', checkout_date: '' }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = sanitizeParcelInput(form, identityMode);
    const validationError = validateParcelInput(payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay modal-overlay--parcel" {...overlayProps}>
      <div className="modal modal--parcel" {...panelProps} role="dialog" aria-modal="true">
        <form className="modal__form parcel-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal__header">
            <div>
              <h2>{editing ? '기록 수정' : '기록 등록'}</h2>
              <p className="parcel-form__subtitle">객실번호 또는 예약번호 중 하나로 등록합니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="parcel-form__scroll">
            <div className="parcel-form__direction" role="group" aria-label="구분">
              {(Object.keys(PARCEL_DIRECTION_LABELS) as ParcelDirection[]).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className={`parcel-form__direction-btn parcel-form__direction-btn--${direction}${
                    form.direction === direction ? ' is-active' : ''
                  }`}
                  onClick={() => setForm({ ...form, direction })}
                >
                  {PARCEL_DIRECTION_LABELS[direction]}
                </button>
              ))}
            </div>

            <div className="parcel-form__identity" role="group" aria-label="등록 방식">
              <button
                type="button"
                className={`parcel-form__identity-btn${identityMode === 'room' ? ' is-active' : ''}`}
                onClick={() => switchIdentityMode('room')}
              >
                객실번호
              </button>
              <button
                type="button"
                className={`parcel-form__identity-btn${identityMode === 'reservation' ? ' is-active' : ''}`}
                onClick={() => switchIdentityMode('reservation')}
              >
                예약번호 (미체크인)
              </button>
            </div>

            <div className="parcel-form__grid">
              {identityMode === 'room' ? (
                <>
                  <label className="field">
                    <span>객실번호 *</span>
                    <input
                      value={form.room_number}
                      onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                      placeholder="1207"
                      autoFocus
                    />
                  </label>
                  <label className="field">
                    <span>체크아웃</span>
                    <input
                      type="date"
                      value={form.checkout_date}
                      onChange={(e) => setForm({ ...form, checkout_date: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>예약번호 *</span>
                    <input
                      value={form.reservation_number}
                      onChange={(e) => setForm({ ...form, reservation_number: e.target.value })}
                      placeholder="PMS 예약번호"
                      autoFocus
                    />
                  </label>
                  <label className="field">
                    <span>체크인 예정일 *</span>
                    <input
                      type="date"
                      value={form.check_in_date}
                      onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>게스트</span>
                <input
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  placeholder="성명"
                />
              </label>
              <label className="field">
                <span>보관 위치</span>
                <input
                  value={form.storage_slot}
                  onChange={(e) => setForm({ ...form, storage_slot: e.target.value })}
                  placeholder="프론트 보관함 A-3"
                />
              </label>
              {editing ? (
                <label className="field">
                  <span>상태</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ParcelStatus })}
                    disabled={editing.status === 'delivered'}
                  >
                    {EDIT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {PARCEL_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <label className="field field--full">
              <span>내용</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="박스 1개 · 깨지기 쉬움"
              />
            </label>

            <label className="field field--full">
              <span>연락 메모</span>
              <input
                value={form.contact_notes}
                onChange={(e) => setForm({ ...form, contact_notes: e.target.value })}
                placeholder="객실 전화 안 받음 · 문자 발송"
              />
            </label>

            <label className="field field--full">
              <span>메모</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            {error ? <p className="parcel-form__error">{error}</p> : null}
          </div>

          <div className="modal__footer parcel-form__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
