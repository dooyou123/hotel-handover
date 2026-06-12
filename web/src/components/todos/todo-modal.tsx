'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import type { Card } from '@/lib/handover/types';
import { describeRecurrence, getSeriesId } from '@/lib/todos/recurrence';
import {
  RECURRENCE_KIND_LABELS,
  TODO_PRIORITY_LABELS,
  type RecurrenceKind,
  type Todo,
  type TodoInput,
  type TodoPriority,
  type TodoSeriesScope,
} from '@/lib/todos/types';

type TodoModalProps = {
  open: boolean;
  todo: Todo | null;
  linkedCard?: Card | null;
  authorLabel: string;
  defaultShift: string;
  defaultName: string;
  staffNames: string[];
  onClose: () => void;
  onSave: (input: TodoInput, id?: string, scope?: TodoSeriesScope) => Promise<void>;
  onDelete?: (id: string, scope?: TodoSeriesScope) => Promise<void>;
  onCreateCard?: () => void | Promise<void>;
};

export function TodoModal({
  open,
  todo,
  linkedCard,
  authorLabel,
  defaultShift,
  defaultName,
  staffNames,
  onClose,
  onSave,
  onDelete,
  onCreateCard,
}: TodoModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'normal' as TodoPriority,
    assignee_shift: defaultShift,
    assignee_name: defaultName,
    author: authorLabel,
    recurrence_kind: 'none' as RecurrenceKind,
    recurrence_interval: 1,
    recurrence_ends_on: '',
  });
  const [saveScope, setSaveScope] = useState<TodoSeriesScope>('one');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecurring = todo ? getSeriesId(todo) !== null : form.recurrence_kind !== 'none';

  useEffect(() => {
    if (!open) return;
    if (todo) {
      setForm({
        title: todo.title,
        description: todo.description,
        due_date: todo.due_date ?? '',
        priority: todo.priority,
        assignee_shift: todo.assignee_shift,
        assignee_name: todo.assignee_name,
        author: todo.author,
        recurrence_kind: todo.recurrence_kind ?? 'none',
        recurrence_interval: todo.recurrence_interval ?? 1,
        recurrence_ends_on: todo.recurrence_ends_on ?? '',
      });
      setSaveScope(getSeriesId(todo) ? 'series_open' : 'one');
    } else {
      setForm({
        title: '',
        description: '',
        due_date: '',
        priority: 'normal',
        assignee_shift: defaultShift,
        assignee_name: defaultName,
        author: authorLabel,
        recurrence_kind: 'none',
        recurrence_interval: 1,
        recurrence_ends_on: '',
      });
      setSaveScope('one');
    }
    setError(null);
  }, [open, todo, authorLabel, defaultShift, defaultName]);

  if (!open) return null;

  const recurrencePreview = describeRecurrence({
    recurrence_kind: form.recurrence_kind,
    recurrence_interval: form.recurrence_interval,
    due_date: form.due_date || null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (form.recurrence_kind !== 'none' && !form.due_date) {
      setError('반복 할일은 시작·기준 마감일을 지정해 주세요.');
      return;
    }
    if (form.recurrence_kind === 'weekly' && (form.recurrence_interval < 1 || form.recurrence_interval > 52)) {
      setError('주 간격은 1~52 사이로 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const input: TodoInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date || null,
        priority: form.priority,
        assignee_shift: form.assignee_shift,
        assignee_name: form.assignee_name,
        author: form.author.trim() || authorLabel,
        recurrence_kind: form.recurrence_kind,
        recurrence_interval: form.recurrence_interval,
        recurrence_ends_on: form.recurrence_ends_on || null,
      };
      const scope = todo && getSeriesId(todo) && saveScope !== 'one' ? saveScope : 'one';
      await onSave(input, todo?.id, scope);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scope: TodoSeriesScope) {
    if (!todo || !onDelete) return;
    await onDelete(todo.id, scope);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{todo ? '할일 수정' : '할일 추가'}</h2>
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
              <span>마감일</span>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>반복</span>
              <select
                value={form.recurrence_kind}
                onChange={(e) => setForm({ ...form, recurrence_kind: e.target.value as RecurrenceKind })}
              >
                {(Object.keys(RECURRENCE_KIND_LABELS) as RecurrenceKind[]).map((key) => (
                  <option key={key} value={key}>
                    {RECURRENCE_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            {form.recurrence_kind !== 'none' ? (
              <>
                {(form.recurrence_kind === 'weekly' || form.recurrence_kind === 'monthly') ? (
                  <label className="field">
                    <span>{form.recurrence_kind === 'weekly' ? '몇 주마다' : '몇 개월마다'}</span>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={form.recurrence_interval}
                      onChange={(e) =>
                        setForm({ ...form, recurrence_interval: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </label>
                ) : (
                  <label className="field">
                    <span>며칠마다</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.recurrence_interval}
                      onChange={(e) =>
                        setForm({ ...form, recurrence_interval: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </label>
                )}
                <p className="field field--full todo-modal__recurrence-hint">
                  {recurrencePreview ?? '마감일을 선택하면 반복 주기가 표시됩니다.'}
                  {' · 완료 시 다음 주기 할일이 자동 생성됩니다.'}
                </p>
                <label className="field">
                  <span>반복 종료일 (선택)</span>
                  <input
                    type="date"
                    value={form.recurrence_ends_on}
                    onChange={(e) => setForm({ ...form, recurrence_ends_on: e.target.value })}
                  />
                </label>
              </>
            ) : null}
            {todo && isRecurring ? (
              <fieldset className="field field--full todo-modal__scope">
                <legend>수정 범위</legend>
                <label className="todo-modal__scope-option">
                  <input
                    type="radio"
                    name="save-scope"
                    checked={saveScope === 'one'}
                    onChange={() => setSaveScope('one')}
                  />
                  이 할일만
                </label>
                <label className="todo-modal__scope-option">
                  <input
                    type="radio"
                    name="save-scope"
                    checked={saveScope === 'series_open'}
                    onChange={() => setSaveScope('series_open')}
                  />
                  시리즈 미완료 전체
                </label>
                <label className="todo-modal__scope-option">
                  <input
                    type="radio"
                    name="save-scope"
                    checked={saveScope === 'series_all'}
                    onChange={() => setSaveScope('series_all')}
                  />
                  시리즈 전체 (완료 포함)
                </label>
              </fieldset>
            ) : null}
            <label className="field">
              <span>우선순위</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TodoPriority })}
              >
                {(Object.keys(TODO_PRIORITY_LABELS) as TodoPriority[]).map((key) => (
                  <option key={key} value={key}>
                    {TODO_PRIORITY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>담당 조</span>
              <select
                value={form.assignee_shift}
                onChange={(e) => setForm({ ...form, assignee_shift: e.target.value })}
              >
                <option value="">미지정</option>
                {WORK_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {formatWorkGroupLabel(group)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>담당자</span>
              <select
                value={form.assignee_name}
                onChange={(e) => setForm({ ...form, assignee_name: e.target.value })}
              >
                <option value="">미지정</option>
                {staffNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>메모</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          {todo ? (
            <div className="todo-modal__link" style={{ marginTop: '0.75rem' }}>
              {linkedCard ? (
                <p className="drawer-section__hint">
                  연결된 인수인계:{' '}
                  <Link href={`/handover?card=${linkedCard.id}`} className="drawer-link">
                    {linkedCard.title}
                  </Link>
                </p>
              ) : onCreateCard ? (
                <button type="button" className="btn btn--ghost btn--small" onClick={() => void onCreateCard()}>
                  인수인계로 등록
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="modal__footer">
            {todo && onDelete ? (
              <div className="todo-modal__delete-actions">
                <button type="button" className="btn btn--ghost btn--danger" onClick={() => void handleDelete('one')}>
                  삭제
                </button>
                {isRecurring ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--ghost btn--danger"
                      onClick={() => void handleDelete('series_open')}
                    >
                      미완료 시리즈 삭제
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--danger"
                      onClick={() => void handleDelete('series_all')}
                    >
                      시리즈 전체 삭제
                    </button>
                  </>
                ) : null}
              </div>
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
