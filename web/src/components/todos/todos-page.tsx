'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isArchivedCard } from '@/lib/handover/card-utils';
import type { Priority } from '@/lib/handover/types';
import { useCards } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  TODO_PRIORITY_LABELS,
  type Todo,
  type TodoFilter,
  type TodoInput,
  type TodoPriority,
} from '@/lib/todos/types';
import { useTodos } from '@/lib/todos/use-todos';
import { TodoModal } from './todo-modal';

function formatDueDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function isOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.status === 'done') return false;
  const due = new Date(`${todo.due_date}T23:59:59`);
  return due.getTime() < Date.now();
}

function todoPriorityToCard(priority: TodoPriority): Priority {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'normal') return 'today';
  return 'info';
}

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'open', label: '미완료' },
  { id: 'done', label: '완료' },
  { id: 'mine', label: '내 담당' },
];

export function TodosPageClient() {
  const { session, authorLabel, requireSession } = useWorkSession();
  const { cards, createCard, updateCard } = useCards();
  const { todos, isLoading, error, createTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();
  const [filter, setFilter] = useState<TodoFilter>('open');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  const visible = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'open') return todo.status === 'open';
      if (filter === 'done') return todo.status === 'done';
      if (filter === 'mine') {
        if (!session.name) return false;
        return todo.assignee_name === session.name || todo.author === session.name;
      }
      return true;
    });
  }, [todos, filter, session.name]);

  const openCount = todos.filter((t) => t.status === 'open').length;
  const linkedCard = editingTodo?.linked_card_id
    ? cards.find((card) => card.id === editingTodo.linked_card_id) ?? null
    : null;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleSave(input: TodoInput, id?: string) {
    if (!requireSession('할일 저장')) return;
    if (id) {
      await updateTodo.mutateAsync({ id, input });
      showToast('할일을 수정했습니다.');
    } else {
      await createTodo.mutateAsync(input);
      showToast('할일을 추가했습니다.');
    }
  }

  async function handleDelete(id: string) {
    const todo = todos.find((item) => item.id === id);
    if (todo?.linked_card_id) {
      await updateCard.mutateAsync({ id: todo.linked_card_id, input: { linked_todo_id: null } });
    }
    await deleteTodo.mutateAsync(id);
    showToast('할일을 삭제했습니다.');
  }

  async function syncLinkedCardOnTodoDone(todo: Todo) {
    if (!todo.linked_card_id) return;
    const linked = cards.find((card) => card.id === todo.linked_card_id);
    if (linked && linked.column_id !== 'done' && !isArchivedCard(linked)) {
      const resolution = linked.next_action?.trim() || linked.details?.trim() || '할일 완료 연동';
      await updateCard.mutateAsync({
        id: linked.id,
        input: { column_id: 'done', resolution },
      });
    }
  }

  async function handleToggle(todo: Todo) {
    await toggleTodo.mutateAsync(todo);
    if (todo.status === 'open') {
      await syncLinkedCardOnTodoDone(todo);
    }
    showToast(todo.status === 'done' ? '할일을 다시 열었습니다.' : '할일을 완료했습니다.');
  }

  async function handleCreateCardFromTodo(todo: Todo) {
    if (!requireSession('인수인계 등록')) return;
    if (todo.linked_card_id) {
      showToast('이미 연동된 인수인계가 있습니다.');
      return;
    }
    try {
      const created = await createCard.mutateAsync({
        column_id: 'progress',
        priority: todoPriorityToCard(todo.priority),
        category: '기타',
        room: '',
        title: todo.title,
        details: todo.description,
        resolution: '',
        next_action: '',
        author: authorLabel,
        assignee_shift: todo.assignee_shift || session.shift,
        assignee_name: todo.assignee_name || session.name,
        due_at: todo.due_date ? `${todo.due_date}T12:00:00` : null,
      });
      await updateCard.mutateAsync({ id: created.id, input: { linked_todo_id: todo.id } });
      await updateTodo.mutateAsync({ id: todo.id, input: { linked_card_id: created.id } });
      showToast('인수인계로 등록했습니다.');
    } catch {
      showToast('인수인계 등록에 실패했습니다.');
    }
  }

  return (
    <>
      <section className="todos-page">
        <div className="todos-page__intro">
          <h2>할일 관리</h2>
          <p>교대·개인 업무를 체크리스트처럼 관리합니다. 인수인계 카드와 연동할 수 있습니다.</p>
        </div>

        <div className="todos-page__toolbar">
          <div className="todos-page__filters" role="tablist" aria-label="할일 필터">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`todos-page__filter${filter === item.id ? ' is-active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === 'open' && openCount > 0 ? ` ${openCount}` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => {
              setEditingTodo(null);
              setModalOpen(true);
            }}
          >
            + 할일 추가
          </button>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : error ? (
          <p className="empty-state" style={{ color: '#b91c1c' }}>
            할일을 불러오지 못했습니다. DB 마이그레이션(015)을 적용했는지 확인해 주세요.
          </p>
        ) : !visible.length ? (
          <p className="empty-state">
            {filter === 'open' ? '미완료 할일이 없습니다.' : '표시할 할일이 없습니다.'}
          </p>
        ) : (
          <ul className="todo-list">
            {visible.map((todo) => {
              const card = todo.linked_card_id
                ? cards.find((item) => item.id === todo.linked_card_id)
                : null;
              return (
                <li
                  key={todo.id}
                  className={[
                    'todo-list__item',
                    todo.status === 'done' ? 'is-done' : '',
                    isOverdue(todo) ? 'is-overdue' : '',
                    todo.priority === 'urgent' ? 'is-urgent' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="todo-list__check"
                    aria-label={todo.status === 'done' ? '완료 취소' : '완료'}
                    onClick={() => handleToggle(todo)}
                  >
                    {todo.status === 'done' ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    className="todo-list__body"
                    onClick={() => {
                      setEditingTodo(todo);
                      setModalOpen(true);
                    }}
                  >
                    <span className="todo-list__title">{todo.title}</span>
                    {todo.description ? <span className="todo-list__desc">{todo.description}</span> : null}
                    <span className="todo-list__meta">
                      <span className={`todo-list__priority todo-list__priority--${todo.priority}`}>
                        {TODO_PRIORITY_LABELS[todo.priority]}
                      </span>
                      {todo.due_date ? (
                        <span className={isOverdue(todo) ? 'todo-list__due is-overdue' : 'todo-list__due'}>
                          마감 {formatDueDate(todo.due_date)}
                        </span>
                      ) : null}
                      {todo.assignee_name ? <span>담당 {todo.assignee_name}</span> : null}
                      {todo.author ? <span>· {todo.author}</span> : null}
                      {card ? (
                        <Link
                          href={`/handover?card=${card.id}`}
                          className="todo-list__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          인수인계 연동
                        </Link>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TodoModal
        open={modalOpen}
        todo={editingTodo}
        linkedCard={linkedCard}
        authorLabel={authorLabel}
        defaultShift={session.shift}
        defaultName={session.name}
        staffNames={staffNames}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onCreateCard={editingTodo ? () => handleCreateCardFromTodo(editingTodo) : undefined}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
