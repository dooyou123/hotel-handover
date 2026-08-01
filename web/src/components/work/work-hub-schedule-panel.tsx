'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventModal } from '@/components/events/event-modal';
import { TodoModal } from '@/components/todos/todo-modal';
import {
  WorkHubCheckButton,
  WorkHubEmpty,
  WorkHubFilterTabs,
  WorkHubList,
  WorkHubPanel,
  WorkHubRow,
  WorkHubSearch,
  WorkHubSection,
  WorkHubToolbar,
  WorkHubToolbarGroup,
} from '@/components/work/work-hub-list';
import {
  WorkHubMonthCalendar,
  type WorkHubDayItem,
  type WorkHubDayMarks,
} from '@/components/work/work-hub-month-calendar';
import { createClient } from '@/lib/supabase/client';
import { useMonthEvents } from '@/lib/events/use-events';
import type { HotelEvent, HotelEventInput } from '@/lib/events/types';
import { eachEventDateInMonth, isDateInEventRange } from '@/lib/events/event-dates';
import { isArchivedCard } from '@/lib/handover/card-utils';
import { EMPTY_COMPLAINT_REMEDIES } from '@/lib/handover/complaint-remedies';
import type { Priority } from '@/lib/handover/types';
import { useCards } from '@/lib/handover/use-cards';
import { todayDateString } from '@/lib/handover/shift-summary';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { describeRecurrence } from '@/lib/todos/recurrence';
import {
  TODO_PRIORITY_LABELS,
  type Todo,
  type TodoFilter,
  type TodoInput,
  type TodoPriority,
  type TodoSeriesScope,
} from '@/lib/todos/types';
import { useTodos } from '@/lib/todos/use-todos';
import { formatCalendarDateLabel, sortCalendarItemsByDone } from '@/lib/work/calendar-month';
import { formatEventTimeRange } from '@/lib/work-items/merge';
import { isDoneTodoHiddenFromList, matchesEventOpenFilter, matchesTodoOpenFilter } from '@/lib/work-items/schedule-filters';

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'open', label: '미완료 · 최근완료' },
  { id: 'done', label: '완료' },
  { id: 'mine', label: '내 담당' },
];

function isOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.status === 'done') return false;
  return new Date(`${todo.due_date}T23:59:59`).getTime() < Date.now();
}

function todoPriorityToCard(priority: TodoPriority): Priority {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'normal') return 'today';
  return 'info';
}

function eventMatchesFilter(event: HotelEvent, filter: TodoFilter): boolean {
  if (filter === 'done') return Boolean(event.completed_at);
  if (filter === 'open') return matchesEventOpenFilter(event);
  if (filter === 'mine') return false;
  return true;
}

function matchesScheduleText(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(q));
}

function addDays(isoDate: string, delta: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shortDateLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${Number(match[2])}/${Number(match[3])}`;
}

function weekdayLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('ko-KR', { weekday: 'short' });
}

function UpcomingDateBadge({ date }: { date: string }) {
  return (
    <span className="work-hub-schedule__upcoming-date" aria-label={formatCalendarDateLabel(date)}>
      <strong>{shortDateLabel(date)}</strong>
      <small>{weekdayLabel(date)}</small>
    </span>
  );
}

export function WorkHubSchedulePanel() {
  const searchParams = useSearchParams();
  const today = todayDateString();
  const todayMonth = today.slice(0, 7);
  const [month, setMonth] = useState(todayMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<TodoFilter>('open');
  const [textQuery, setTextQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const openedDeepLinkRef = useRef<string | null>(null);

  const { session, authorLabel, requireSession } = useWorkSession();
  const { cards, createCard, updateCard } = useCards();
  const { todos, isLoading: todosLoading, error, createTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();
  const {
    events,
    isLoading: eventsLoading,
    createEvent,
    updateEvent,
    toggleEventComplete,
    deleteEvent,
  } = useMonthEvents(month);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  useEffect(() => {
    const date = searchParams.get('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSelectedDate(date);
      setMonth(date.slice(0, 7));
    }

    const todoId = searchParams.get('todo');
    const eventId = searchParams.get('event');
    const deepLinkKey = todoId ? `todo:${todoId}` : eventId ? `event:${eventId}` : null;
    if (!deepLinkKey || openedDeepLinkRef.current === deepLinkKey) return;

    setFilter('all');
    if (todoId) {
      const todo = todos.find((item) => item.id === todoId);
      if (!todo) return;
      if (todo.due_date) {
        setSelectedDate(todo.due_date);
        setMonth(todo.due_date.slice(0, 7));
      }
      setEditingTodo(todo);
      setModalOpen(true);
      openedDeepLinkRef.current = deepLinkKey;
      return;
    }
    if (eventId) {
      const event = events.find((item) => item.id === eventId);
      if (!event) return;
      setSelectedDate(event.event_date);
      setMonth(event.event_date.slice(0, 7));
      setEditingEvent(event);
      setEventModalOpen(true);
      openedDeepLinkRef.current = deepLinkKey;
    }
  }, [searchParams, todos, events]);

  useEffect(() => {
    setSelectedDate((current) => {
      if (current.startsWith(month)) return current;
      if (today.startsWith(month)) return today;
      return `${month}-01`;
    });
  }, [month, today]);

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'open') {
        if (!matchesTodoOpenFilter(todo)) return false;
      } else if (filter === 'done') {
        if (todo.status !== 'done') return false;
      } else if (filter === 'mine') {
        if (!session.name) return false;
        const mine = todo.assignee_name === session.name || todo.author === session.name;
        if (!mine) return false;
        if (todo.status === 'done' && isDoneTodoHiddenFromList(todo)) return false;
      } else if (todo.status === 'done' && isDoneTodoHiddenFromList(todo)) {
        return false;
      }
      return matchesScheduleText(textQuery, [
        todo.title,
        todo.description,
        todo.assignee_name,
        todo.author,
      ]);
    });
  }, [todos, filter, session.name, textQuery]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (!eventMatchesFilter(event, filter)) return false;
        return matchesScheduleText(textQuery, [
          event.title,
          event.description,
          event.category,
          event.author,
        ]);
      }),
    [events, filter, textQuery],
  );

  const undatedTodos = useMemo(
    () =>
      filteredTodos.filter(
        (todo) => !todo.due_date && (filter !== 'open' || matchesTodoOpenFilter(todo)),
      ),
    [filteredTodos, filter],
  );

  const dayMarks = useMemo(() => {
    const marks = new Map<string, WorkHubDayMarks>();
    function ensure(date: string): WorkHubDayMarks {
      let row = marks.get(date);
      if (!row) {
        row = { todo: false, event: false, urgent: false };
        marks.set(date, row);
      }
      return row;
    }
    filteredEvents.forEach((event) => {
      eachEventDateInMonth(event, month).forEach((date) => {
        const row = ensure(date);
        row.event = true;
      });
    });
    filteredTodos.forEach((todo) => {
      if (!todo.due_date || !todo.due_date.startsWith(month)) return;
      const row = ensure(todo.due_date);
      row.todo = true;
      if (todo.priority === 'urgent' && todo.status !== 'done') row.urgent = true;
    });
    return marks;
  }, [filteredEvents, filteredTodos, month]);

  // 달력 날짜 칸에 제목으로 표시할 항목들 — 긴급 먼저, 완료는 뒤로
  const dayItems = useMemo(() => {
    const map = new Map<string, WorkHubDayItem[]>();
    function push(date: string, item: WorkHubDayItem) {
      const list = map.get(date);
      if (list) list.push(item);
      else map.set(date, [item]);
    }
    filteredEvents.forEach((event) => {
      eachEventDateInMonth(event, month).forEach((date) => {
        push(date, {
          id: `event-${event.id}-${date}`,
          label: event.title,
          tone: 'event',
          done: Boolean(event.completed_at),
        });
      });
    });
    filteredTodos.forEach((todo) => {
      if (!todo.due_date || !todo.due_date.startsWith(month)) return;
      push(todo.due_date, {
        id: `todo-${todo.id}`,
        label: todo.title,
        tone: todo.priority === 'urgent' && todo.status !== 'done' ? 'urgent' : 'todo',
        done: todo.status === 'done',
      });
    });
    const toneRank = (tone: WorkHubDayItem['tone']) =>
      tone === 'urgent' ? 0 : tone === 'event' ? 1 : 2;
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          Number(a.done ?? false) - Number(b.done ?? false) || toneRank(a.tone) - toneRank(b.tone),
      ),
    );
    return map;
  }, [filteredEvents, filteredTodos, month]);

  const selectedEvents = useMemo(
    () =>
      sortCalendarItemsByDone(
        filteredEvents.filter((event) => isDateInEventRange(selectedDate, event)),
        (event) => Boolean(event.completed_at),
      ),
    [filteredEvents, selectedDate],
  );

  const selectedTodos = useMemo(
    () =>
      sortCalendarItemsByDone(
        filteredTodos.filter((todo) => todo.due_date === selectedDate),
        (todo) => todo.status === 'done',
      ),
    [filteredTodos, selectedDate],
  );

  const upcomingRange = useMemo(() => {
    const start = selectedDate < today ? today : addDays(selectedDate, 1);
    const end = addDays(start, 13);
    return { start, end };
  }, [selectedDate, today]);

  const upcomingEvents = useMemo(() => {
    const items: Array<{ date: string; event: HotelEvent }> = [];
    for (const event of filteredEvents) {
      if (event.completed_at) continue;
      let cursor = upcomingRange.start;
      while (cursor <= upcomingRange.end) {
        if (isDateInEventRange(cursor, event)) {
          items.push({ date: cursor, event });
          break;
        }
        cursor = addDays(cursor, 1);
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date) || a.event.title.localeCompare(b.event.title));
  }, [filteredEvents, upcomingRange]);

  const upcomingTodos = useMemo(
    () =>
      filteredTodos
        .filter(
          (todo) =>
            todo.status !== 'done' &&
            todo.due_date &&
            todo.due_date >= upcomingRange.start &&
            todo.due_date <= upcomingRange.end,
        )
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [filteredTodos, upcomingRange],
  );

  const upcomingCount = upcomingEvents.length + upcomingTodos.length;

  const openCount = todos.filter((t) => t.status === 'open').length;
  const linkedCard = editingTodo?.linked_card_id
    ? cards.find((card) => card.id === editingTodo.linked_card_id) ?? null
    : null;
  const isLoading = todosLoading || eventsLoading;
  const selectedCount = selectedEvents.length + selectedTodos.length;

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
        ...EMPTY_COMPLAINT_REMEDIES,
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

  async function handleToggleEvent(event: HotelEvent) {
    if (!requireSession('일정 완료')) return;
    await toggleEventComplete.mutateAsync(event);
    showToast(event.completed_at ? '일정을 다시 열었습니다.' : '일정을 완료했습니다.');
  }

  async function handleDeleteEvent(id: string) {
    await deleteEvent.mutateAsync(id);
    showToast('일정을 삭제했습니다.');
  }

  function openNewEvent() {
    setEditingEvent(null);
    setEventModalOpen(true);
  }

  function openNewTodo() {
    setEditingTodo(null);
    setModalOpen(true);
  }

  return (
    <>
      <WorkHubPanel>
        <WorkHubToolbar>
          <WorkHubToolbarGroup className="work-hub-schedule__toolbar-group">
            <WorkHubFilterTabs
              ariaLabel="업무 일정 필터"
              items={FILTERS.map((item) => ({
                id: item.id,
                label: item.label,
                count: item.id === 'open' ? openCount : undefined,
              }))}
              value={filter}
              onChange={setFilter}
            />
            <WorkHubSearch
              value={textQuery}
              onChange={setTextQuery}
              placeholder="제목·내용·담당 검색…"
              ariaLabel="할일·일정 내용 검색"
            />
          </WorkHubToolbarGroup>
        </WorkHubToolbar>

        {isLoading ? (
          <WorkHubEmpty>불러오는 중…</WorkHubEmpty>
        ) : error ? (
          <WorkHubEmpty>할일을 불러오지 못했습니다. DB 마이그레이션(015)을 적용했는지 확인해 주세요.</WorkHubEmpty>
        ) : (
          <>
            <div className="work-hub-schedule__split">
              <div className="work-hub-schedule__cal">
                <WorkHubMonthCalendar
                  month={month}
                  selectedDate={selectedDate}
                  dayMarks={dayMarks}
                  dayItems={dayItems}
                  onMonthChange={setMonth}
                  onSelectDate={setSelectedDate}
                />
              </div>

              <div className="work-hub-schedule__detail">
                <WorkHubSection
                  id="work-hub-schedule-day"
                  title={formatCalendarDateLabel(selectedDate)}
                  aside={
                    <div className="work-hub-schedule__day-actions">
                      {selectedCount ? (
                        <span className="work-hub__count">{selectedCount}건</span>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--outline btn--small"
                        onClick={openNewEvent}
                      >
                        + 일정
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={openNewTodo}
                      >
                        + 할일
                      </button>
                    </div>
                  }
                >
                  {selectedCount ? (
                    <WorkHubList>
                      {selectedEvents.map((event) => {
                        const isDone = Boolean(event.completed_at);
                        return (
                          <WorkHubRow
                            key={`event-${event.id}`}
                            tone="event"
                            kind={event.category || '일정'}
                            title={event.title}
                            meta={formatEventTimeRange(event.start_time, event.end_time) || '종일'}
                            rowClassName={isDone ? 'is-done' : undefined}
                            leading={
                              <WorkHubCheckButton
                                checked={isDone}
                                label={isDone ? '완료 취소' : '완료'}
                                onClick={() => void handleToggleEvent(event)}
                              />
                            }
                            onClick={() => {
                              setEditingEvent(event);
                              setEventModalOpen(true);
                            }}
                          />
                        );
                      })}
                      {selectedTodos.map((todo) => {
                        const card = todo.linked_card_id
                          ? cards.find((linked) => linked.id === todo.linked_card_id)
                          : null;
                        return (
                          <WorkHubRow
                            key={`todo-${todo.id}`}
                            tone={todo.priority === 'urgent' ? 'urgent' : 'todo'}
                            liClassName={isOverdue(todo) ? 'is-overdue' : undefined}
                            kind="할일"
                            title={todo.title}
                            meta={
                              <>
                                {TODO_PRIORITY_LABELS[todo.priority]}
                                {describeRecurrence(todo) ? ` · ${describeRecurrence(todo)}` : ''}
                                {todo.assignee_name ? ` · ${todo.assignee_name}` : ''}
                                {card ? ' · 인수인계 연동' : ''}
                              </>
                            }
                            rowClassName={todo.status === 'done' ? 'is-done' : undefined}
                            leading={
                              <WorkHubCheckButton
                                checked={todo.status === 'done'}
                                label={todo.status === 'done' ? '완료 취소' : '완료'}
                                onClick={() => void handleToggle(todo)}
                              />
                            }
                            onClick={() => {
                              setEditingTodo(todo);
                              setModalOpen(true);
                            }}
                          />
                        );
                      })}
                    </WorkHubList>
                  ) : upcomingCount ? (
                    <div className="work-hub-schedule__upcoming">
                      <WorkHubEmpty>
                        {formatCalendarDateLabel(selectedDate)}에는 등록된 할일·일정이 없습니다.
                      </WorkHubEmpty>
                      <div className="work-hub-schedule__upcoming-head">
                        <span className="work-hub-schedule__upcoming-label">다가오는 일정</span>
                        <span className="work-hub-schedule__upcoming-note">
                          이후 2주 · {upcomingCount}건
                        </span>
                      </div>
                      <WorkHubList>
                        {upcomingEvents.map(({ date, event }) => (
                          <WorkHubRow
                            key={`up-event-${event.id}-${date}`}
                            tone="event"
                            liClassName="work-hub-schedule__upcoming-item"
                            leading={<UpcomingDateBadge date={date} />}
                            kind={event.category || '일정'}
                            title={event.title}
                            meta={formatEventTimeRange(event.start_time, event.end_time) || '종일'}
                            onClick={() => {
                              setSelectedDate(date);
                              setMonth(date.slice(0, 7));
                              setEditingEvent(event);
                              setEventModalOpen(true);
                            }}
                          />
                        ))}
                        {upcomingTodos.map((todo) => (
                          <WorkHubRow
                            key={`up-todo-${todo.id}`}
                            tone={todo.priority === 'urgent' ? 'urgent' : 'todo'}
                            liClassName="work-hub-schedule__upcoming-item"
                            leading={todo.due_date ? <UpcomingDateBadge date={todo.due_date} /> : undefined}
                            kind="할일"
                            title={todo.title}
                            meta={
                              <>
                                {TODO_PRIORITY_LABELS[todo.priority]}
                                {todo.assignee_name ? ` · ${todo.assignee_name}` : ''}
                              </>
                            }
                            onClick={() => {
                              if (todo.due_date) {
                                setSelectedDate(todo.due_date);
                                setMonth(todo.due_date.slice(0, 7));
                              }
                              setEditingTodo(todo);
                              setModalOpen(true);
                            }}
                          />
                        ))}
                      </WorkHubList>
                    </div>
                  ) : (
                    <WorkHubEmpty>
                      선택한 날짜와 앞으로 2주간 등록된 할일·일정이 없습니다. 오른쪽 위 버튼으로
                      추가해 보세요.
                    </WorkHubEmpty>
                  )}
                </WorkHubSection>
              </div>
            </div>

            {undatedTodos.length ? (
              <WorkHubSection id="work-hub-schedule-undated" title="마감 없음">
                <WorkHubList>
                  {undatedTodos.map((todo) => (
                    <WorkHubRow
                      key={`undated-${todo.id}`}
                      tone={todo.priority === 'urgent' ? 'urgent' : 'todo'}
                      kind="할일"
                      title={todo.title}
                      meta={
                        <>
                          {TODO_PRIORITY_LABELS[todo.priority]}
                          {describeRecurrence(todo) ? ` · ${describeRecurrence(todo)}` : ''}
                        </>
                      }
                      rowClassName={todo.status === 'done' ? 'is-done' : undefined}
                      leading={
                        <WorkHubCheckButton
                          checked={todo.status === 'done'}
                          label={todo.status === 'done' ? '완료 취소' : '완료'}
                          onClick={() => void handleToggle(todo)}
                        />
                      }
                      onClick={() => {
                        setEditingTodo(todo);
                        setModalOpen(true);
                      }}
                    />
                  ))}
                </WorkHubList>
              </WorkHubSection>
            ) : null}
          </>
        )}
      </WorkHubPanel>

      <TodoModal
        open={modalOpen}
        todo={editingTodo}
        linkedCard={linkedCard}
        authorLabel={authorLabel}
        defaultShift={session.shift}
        defaultName={session.name}
        defaultDueDate={selectedDate}
        staffNames={staffNames}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onCreateCard={editingTodo ? () => handleCreateCardFromTodo(editingTodo) : undefined}
      />

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        authorLabel={authorLabel}
        defaultDate={selectedDate}
        onClose={() => setEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </>
  );
}
