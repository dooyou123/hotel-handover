'use client';

import { useEffect, useState } from 'react';
import type { Parcel, ParcelDirection, ParcelInput, ParcelStatus } from '@/lib/parcels/types';
import { PARCEL_DIRECTION_LABELS, PARCEL_STATUS_LABELS } from '@/lib/parcels/types';

type ParcelFormModalProps = {
  open: boolean;
  editing: Parcel | null;
  authorLabel: string;
  defaultDirection: ParcelDirection;
  onClose: () => void;
  onSave: (input: ParcelInput) => Promise<void>;
};

const STATUS_OPTIONS: ParcelStatus[] = ['stored', 'ready', 'delivered', 'returned'];

export function ParcelFormModal({
  open,
  editing,
  authorLabel,
  defaultDirection,
  onClose,
  onSave,
}: ParcelFormModalProps) {
  const [form, setForm] = useState<ParcelInput>(() => ({
    direction: defaultDirection,
    room_number: '',
    guest_name: '',
    checkout_date: '',
    storage_slot: '',
    description: '',
    status: 'stored',
    contact_notes: '',
    notes: '',
    created_by: authorLabel,
    updated_by: authorLabel,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        direction: editing.direction,
        room_number: editing.room_number,
        guest_name: editing.guest_name,
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
      setForm({
        direction: defaultDirection,
        room_number: '',
        guest_name: '',
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
  }, [open, editing, authorLabel, defaultDirection]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay modal-overlay--parcel" onClick={onClose}>
      <div className="modal modal--parcel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <form className="modal__form parcel-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal__header">
            <div>
              <h2>{editing ? '기록 수정' : '기록 등록'}</h2>
              <p className="parcel-form__subtitle">객실·체크아웃·보관 위치를 입력합니다.</p>
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

            <div className="parcel-form__grid">
              <label className="field">
                <span>객실</span>
                <input
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  placeholder="1207"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>게스트</span>
                <input
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  placeholder="성명"
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
              <label className="field">
                <span>보관 위치</span>
                <input
                  value={form.storage_slot}
                  onChange={(e) => setForm({ ...form, storage_slot: e.target.value })}
                  placeholder="프론트 보관함 A-3"
                />
              </label>
              <label className="field">
                <span>상태</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ParcelStatus })}
                  disabled={editing?.status === 'delivered'}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {PARCEL_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
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
