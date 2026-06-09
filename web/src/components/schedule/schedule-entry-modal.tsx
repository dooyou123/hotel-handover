'use client';

import { useEffect, useState } from 'react';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import type { ScheduleEntry } from '@/lib/schedule/parse-csv';
import type { ScheduleEntryInput } from '@/lib/schedule/use-schedule';

type ScheduleEntryModalProps = {
  open: boolean;
  entry: ScheduleEntry | null;
  staffNames: string[];
  defaultDate?: string;
  onClose: () => void;
  onSave: (input: ScheduleEntryInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export function ScheduleEntryModal({
  open,
  entry,
  staffNames,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: ScheduleEntryModalProps) {
  const [form, setForm] = useState<ScheduleEntryInput>({
    work_date: defaultDate ?? new Date().toISOString().slice(0, 10),
    shift: WORK_GROUPS[0],
    staff_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        work_date: entry.work_date,
        shift: entry.shift,
        staff_name: entry.staff_name,
      });
    } else {
      setForm({
        work_date: defaultDate ?? new Date().toISOString().slice(0, 10),
        shift: WORK_GROUPS[0],
        staff_name: staffNames[0] ?? '',
      });
    }
    setError(null);
  }, [open, entry, defaultDate, staffNames]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.staff_name.trim()) {
      setError('직원 이름을 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, staff_name: form.staff_name.trim() }, entry?.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{entry ? '근무 일정 수정' : '근무 일정 추가'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>날짜 *</span>
              <input
                type="date"
                value={form.work_date}
                onChange={(e) => setForm({ ...form, work_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>조 *</span>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                {WORK_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {formatWorkGroupLabel(group)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>직원 *</span>
              <select value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })}>
                <option value="">선택</option>
                {staffNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal__footer">
            {entry && onDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={async () => {
                  if (!entry) return;
                  await onDelete(entry.id);
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
