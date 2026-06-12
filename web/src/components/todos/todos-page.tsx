'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PersonalTasksPanel } from '@/components/personal-tasks/personal-tasks-panel';
import { EventModal } from '@/components/schedule/event-modal';
import { createClient } from '@/lib/supabase/client';
import { useMonthEvents } from '@/lib/events/use-events';
import type { HotelEvent, HotelEventInput } from '@/lib/events/types';
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
  type TodoSeriesScope,
} from '@/lib/todos/types';
import { describeRecurrence } from '@/lib/todos/recurrence';
import { useTodos } from '@/lib/todos/use-todos';
import { formatEventTimeRange, mergeWorkScheduleItems, type WorkScheduleItem } from '@/lib/work-items/merge';
import { isDoneTodoHiddenFromList, isPastHotelEvent } from '@/lib/work-items/schedule-filters';
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

type TodoScope = 'team' | 'personal';

export function TodosPageClient() {
  const searchParams = useSearchParams();
  const initialScope = searchParams.get('view') === 'personal' ? 'personal' : 'team';
  const [scope, setScope] = useState<TodoScope>(initialScope);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { session, authorLabel, requireSession } = useWorkSession();
  const { cards, createCard, updateCard } = useCards();
  const { todos, isLoading: todosLoading, error, createTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();
  const {
    events,
    isLoading: eventsLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useMonthEvents(month);
  const [filter, setFilter] = useState<TodoFilter>('open');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'open') return todo.status === 'open';
      if (filter === 'done') return todo.status === 'done';
      if (filter === 'mine') {
        if (!session.name) return false;
        const mine =
          todo.assignee_name === session.name || todo.author === session.name;
        if (!mine) return false;
        if (todo.status === 'done' && isDoneTodoHiddenFromList(todo)) return false;
        return true;
      }
      if (todo.status === 'done' && isDoneTodoHiddenFromList(todo)) return false;
      return true;
    });
  }, [todos, filter, session.name]);

  const { activeItems, pastEvents } = useMemo(() => {
    const eventsForList = filter === 'done' || filter === 'mine' ? [] : events;
    const merged = mergeWorkScheduleItems({
      todos: filteredTodos,
      events: eventsForList,
      month,
    });

    if (filter === 'done') {
      return { activeItems: merged, pastEvents: [] as HotelEvent[] };
    }

    const activeItems: WorkScheduleItem[] = [];
    const pastEvents: HotelEvent[] = [];

    for (const item of merged) {
      if (item.kind === 'event' && isPastHotelEvent(item.event)) {
        pastEvents.push(item.event);
      } else {
        activeItems.push(item);
      }
    }

    return { activeItems, pastEvents };
  }, [filteredTodos, events, month, filter]);

  const openCount = todos.filter((t) => t.status === 'open').length;
  const linkedCard = editingTodo?.linked_card_id
    ? cards.find((card) => card.id === editingTodo.linked_card_id) ?? null
    : null;
  const isLoading = todosLoading || eventsLoading;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleSave(input: TodoInput, id?: string, scope: TodoSeriesScope = 'one') {
    if (!requireSession('할일 저장')) return;
    if (id) {
      await updateTodo.mutateAsync({ id, input, scope });
      showToast(scope === 'one' ? '할일을 수정했습니다.' : '시리즈 할일을 수정했습니다.');
    } else {
      await createTodo.mutateAsync(input);
      showToast('할일을 추가했습니다.');
    }
  }

  async function handleDelete(id: string, scope: TodoSeriesScope = 'one') {
    const todo = todos.find((item) => item.id === id);
    if (todo?.linked_card_id && scope === 'one') {
      await updateCard.mutateAsync({ id: todo.linked_card_id, input: { linked_todo_id: null } });
    }
    await deleteTodo.mutateAsync({ id, scope });
    showToast(
      scope === 'one'
        ? '할일을 삭제했습니다.'
        : scope === 'series_open'
          ? '미완료 시리즈 할일을 삭제했습니다.'
          : '시리즈 전체를 삭제했습니다.',
    );
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
    const result = await toggleTodo.mutateAsync(todo);
    if (todo.status === 'open') {
      await syncLinkedCardOnTodoDone(todo);
      if (result.spawned) {
        showToast(`할일을 완료했습니다. 다음 주기(${result.spawned.due_date}) 할일이 생성되었습니다.`);
        return;
      }
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

  async function handleSaveEvent(input: HotelEventInput, id?: string) {
    if (!requireSession('일정 저장')) return;
    if (id) {
      await updateEvent.mutateAsync({ id, input });
      showToast('일정을 수정했습니다.');
    } else {
      await createEvent.mutateAsync(input);
      showToast('일정을 추가했습니다.');
    }
  }

  async function handleDeleteEvent(id: string) {
    await deleteEvent.mutateAsync(id);
    showToast('일정을 삭제했습니다.');
  }

  return (
    <>
      <section className="todos-page">
        <div className="todos-page__intro">
          <h2>업무 일정</h2>
          <p>
            {scope === 'personal'
              ? '나만 보는 개인 할 일입니다.'
              : '할일과 호텔 일정(교육·VIP·점검 등)을 한곳에서 관리합니다. 조별 근무표는 「근무표」 메뉴를 사용하세요.'}
          </p>
        </div>

        <div className="todos-page__scope" role="tablist" aria-label="업무 일정 종류">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'team'}
            className={`todos-page__scope-btn${scope === 'team' ? ' is-active' : ''}`}
            onClick={() => setScope('team')}
          >
            팀 업무 일정
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'personal'}
            className={`todos-page__scope-btn${scope === 'personal' ? ' is-active' : ''}`}
            onClick={() => setScope('personal')}
          >
            내 할 일
          </button>
        </div>

        {scope === 'personal' ? (
          <article className="schedule-panel">
            <PersonalTasksPanel variant="page" onToast={showToast} />
          </article>
        ) : null}

        {scope === 'team' ? (
          <>
            <div className="todos-page__toolbar">
              <label className="schedule-field todos-page__month">
                <span>조회 월</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
              <div className="todos-page__filters" role="tablist" aria-label="업무 일정 필터">
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
              <div className="todos-page__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    setEditingEvent(null);
                    setEventModalOpen(true);
                  }}
                >
                  + 일정
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => {
                    setEditingTodo(null);
                    setModalOpen(true);
                  }}
                >
                  + 할일
                </button>
              </div>
            </div>

            {isLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : error ? (
              <p className="empty-state" style={{ color: '#b91c1c' }}>
                할일을 불러오지 못했습니다. DB 마이그레이션(015)을 적용했는지 확인해 주세요.
              </p>
            ) : !activeItems.length && !pastEvents.length ? (
              <p className="empty-state">
                {filter === 'open' ? '이 달에 표시할 미완료 업무 일정이 없습니다.' : '표시할 항목이 없습니다.'}
              </p>
            ) : (
              <>
                {activeItems.length ? (
                  <ul className="todo-list">
                    {activeItems.map((item) => {
                      if (item.kind === 'event') {
                        const event = item.event;
                        return (
                          <li key={`event-${event.id}`} className="todo-list__item todo-list__item--event">
                            <span className="todo-list__kind" aria-hidden>
                              일정
                            </span>
                            <button
                              type="button"
                              className="todo-list__body"
                              onClick={() => {
                                setEditingEvent(event);
                                setEventModalOpen(true);
                              }}
                            >
                              <span className="todo-list__title">{event.title}</span>
                              {event.description ? (
                                <span className="todo-list__desc">{event.description}</span>
                              ) : null}
                              <span className="todo-list__meta">
                                <span className="todo-list__kind-inline">{event.category}</span>
                                <span className="todo-list__due">
                                  {formatDueDate(event.event_date)}
                                  {' · '}
                                  {formatEventTimeRange(event.start_time, event.end_time)}
                                </span>
                                {event.author ? <span>· {event.author}</span> : null}
                              </span>
                            </button>
                          </li>
                        );
                      }

                      const todo = item.todo;
                      const card = todo.linked_card_id
                        ? cards.find((linked) => linked.id === todo.linked_card_id)
                        : null;
                      return (
                        <li
                          key={`todo-${todo.id}`}
                          className={[
                            'todo-list__item',
                            todo.status === 'done' ? 'is-done' : '',
                            isOverdue(todo) ? 'is-overdue' : '',
                            todo.priority === 'urgent' ? 'is-urgent' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="todo-list__kind" aria-hidden>
                            할일
                          </span>
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
                              ) : (
                                <span className="todo-list__due">마감 없음</span>
                              )}
                              {describeRecurrence(todo) ? (
                                <span className="todo-list__repeat" title="반복 할일">
                                  🔁 {describeRecurrence(todo)}
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
                ) : null}

                {pastEvents.length ? (
                  <div className="todo-list__past">
                    <button
                      type="button"
                      className="todo-list__past-toggle"
                      aria-expanded={pastEventsExpanded}
                      onClick={() => setPastEventsExpanded((open) => !open)}
                    >
                      <span>지난 일정 {pastEvents.length}건</span>
                      <span className="todo-list__past-toggle-label">
                        {pastEventsExpanded ? '접기' : '펼치기'}
                      </span>
                    </button>
                    {pastEventsExpanded ? (
                      <ul className="todo-list todo-list--past">
                        {pastEvents.map((event) => (
                          <li
                            key={`past-event-${event.id}`}
                            className="todo-list__item todo-list__item--event is-past"
                          >
                            <span className="todo-list__kind" aria-hidden>
                              일정
                            </span>
                            <button
                              type="button"
                              className="todo-list__body"
                              onClick={() => {
                                setEditingEvent(event);
                                setEventModalOpen(true);
                              }}
                            >
                              <span className="todo-list__title">{event.title}</span>
                              {event.description ? (
                                <span className="todo-list__desc">{event.description}</span>
                              ) : null}
                              <span className="todo-list__meta">
                                <span className="todo-list__kind-inline">{event.category}</span>
                                <span className="todo-list__due">
                                  {formatDueDate(event.event_date)}
                                  {' · '}
                                  {formatEventTimeRange(event.start_time, event.end_time)}
                                </span>
                                {event.author ? <span>· {event.author}</span> : null}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
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

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        defaultDate={`${month}-01`}
        authorLabel={authorLabel}
        onClose={() => setEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
