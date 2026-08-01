'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import type { PersonalTask } from '@/lib/personal-tasks/types';
import { TODO_PRIORITY_LABELS, type TodoPriority } from '@/lib/todos/types';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type PromotePersonalTaskModalProps = {
  open: boolean;
  task: PersonalTask | null;
  author: string;
  defaultShift: string;
  defaultName: string;
  staffNames: string[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    priority: TodoPriority;
    assignee_name: string;
    assignee_shift: string;
    due_date: string | null;
    description: string;
    markPersonalDone: boolean;
  }) => Promise<void>;
};

export function PromotePersonalTaskModal({
  open,
  task,
  author,
  defaultShift,
  defaultName,
  staffNames,
  busy = false,
  onClose,
  onSubmit,
}: PromotePersonalTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [priority, setPriority] = useState<TodoPriority>('normal');
  const [assigneeShift, setAssigneeShift] = useState(defaultShift);
  const [assigneeName, setAssigneeName] = useState(defaultName);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [markDone, setMarkDone] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !task) return;
    setPriority('normal');
    setAssigneeShift(defaultShift);
    setAssigneeName(defaultName);
    setDueDate(task.due_date ?? '');
    setDescription(task.description ?? '');
    setMarkDone(true);
    setError(null);
  }, [open, task, defaultShift, defaultName]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open || !task) return null;

  return createPortal(
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--promote" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="promote-task-title">
        <form
          className="modal__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit({
              priority,
              assignee_name: assigneeName,
              assignee_shift: assigneeShift,
              due_date: dueDate || null,
              description,
              markPersonalDone: markDone,
            }).catch((caught) => {
              setError(caught instanceof Error ? caught.message : '공유에 실패했습니다.');
            });
          }}
        >
          <div className="modal__header">
            <h2 id="promote-task-title">팀 업무로 공유</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <p className="promote-task__lead">
            「{task.title}」을(를) 업무 일정(팀 할일)로 등록합니다. 작성자: {author}
          </p>

          <div className="form-grid">
            <label className="field">
              <span>우선순위</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)}>
                {Object.entries(TODO_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>마감일</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className="field">
              <span>담당 조</span>
              <select value={assigneeShift} onChange={(e) => setAssigneeShift(e.target.value)}>
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
              <select value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)}>
                <option value="">미지정</option>
                {staffNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>설명 (선택)</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="field field--full field--checkbox">
              <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
              <span>공유 후 개인 할 일을 완료 처리</span>
            </label>
          </div>

          {error ? <p className="amenity-alert">{error}</p> : null}

          <div className="modal__footer">
            <span />
            <div className="modal__footer-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? '등록 중…' : '팀 업무로 등록'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
