'use client';

import { useEffect, useState } from 'react';
import { EVENT_CATEGORIES, type HotelEvent, type HotelEventInput } from '@/lib/events/types';

type EventModalProps = {
  open: boolean;
  event: HotelEvent | null;
  defaultDate?: string;
  authorLabel: string;
  onClose: () => void;
  onSave: (input: HotelEventInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

function toTimeValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function EventModal({ open, event, defaultDate, authorLabel, onClose, onSave, onDelete }: EventModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: defaultDate ?? new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    category: '기타' as string,
    author: authorLabel,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        start_time: toTimeValue(event.start_time),
        end_time: toTimeValue(event.end_time),
        category: event.category,
        author: event.author,
      });
    } else {
      setForm({
        title: '',
        description: '',
        event_date: defaultDate ?? new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        category: '기타',
        author: authorLabel,
      });
    }
    setError(null);
  }, [open, event, defaultDate, authorLabel]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const input: HotelEventInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        category: form.category,
        author: form.author.trim() || authorLabel,
      };
      await onSave(input, event?.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{event ? '일정 수정' : '일정 추가'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field field--full">
              <span>제목 *</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="field">
              <span>날짜 *</span>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>구분</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>시작</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </label>
            <label className="field">
              <span>종료</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </label>
            <label className="field field--full">
              <span>내용</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal__footer">
            {event && onDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={async () => {
                  if (!event) return;
                  await onDelete(event.id);
                  onClose();
                }}
              >
                삭제
              </button>
            ) : (
              <span />
            )}
            <div className="modal__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
