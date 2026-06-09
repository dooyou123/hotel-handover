'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import type { Card } from '@/lib/handover/types';
import {
  TODO_PRIORITY_LABELS,
  type Todo,
  type TodoInput,
  type TodoPriority,
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
  onSave: (input: TodoInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
    } else {
      setForm({
        title: '',
        description: '',
        due_date: '',
        priority: 'normal',
        assignee_shift: defaultShift,
        assignee_name: defaultName,
        author: authorLabel,
      });
    }
    setError(null);
  }, [open, todo, authorLabel, defaultShift, defaultName]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
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
      };
      await onSave(input, todo?.id);
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
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={async () => {
                  if (!todo) return;
                  await onDelete(todo.id);
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
