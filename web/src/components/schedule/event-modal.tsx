'use client';

import { useEffect, useState } from 'react';
import { normalizeEventEndDate } from '@/lib/events/event-dates';
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
    end_date: '',
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
        end_date: event.end_date && event.end_date > event.event_date ? event.end_date : '',
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
        end_date: '',
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
    if (form.end_date && form.end_date < form.event_date) {
      setError('종료일은 시작일보다 앞설 수 없습니다.');
      return;
    }
    setSaving(true);
    try {
      const input: HotelEventInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_date: form.event_date,
        end_date: normalizeEventEndDate(form.event_date, form.end_date || null),
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
              <span>시작일 *</span>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>종료일</span>
              <input
                type="date"
                value={form.end_date}
                min={form.event_date}
                placeholder="기간 일정일 때만"
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </label>
            <p className="field field--full drawer-panel__mode">
              종료일을 비우면 하루 일정입니다. 며칠 이상 이어지는 업무는 시작일과 종료일을 모두 지정하세요.
            </p>
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
              <span>시작 시각</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </label>
            <label className="field">
              <span>종료 시각</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </label>
            <label className="field field--full">
              <span>내용</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="사이즈·수량·지시 사항은 Enter로 줄바꿈하거나 1. 2.로 번호를 매겨 주세요."
              />
              <span className="field-hint">줄바꿈과 번호 목록은 목록 화면에 그대로 표시됩니다.</span>
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
