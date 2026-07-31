'use client';

import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PromotePersonalTaskModal } from '@/components/personal-tasks/promote-personal-task-modal';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type { PersonalTask } from '@/lib/personal-tasks/types';
import { usePersonalTasks } from '@/lib/personal-tasks/use-personal-tasks';
import { createClient } from '@/lib/supabase/client';
import { promotePersonalTaskToTeamTodo } from '@/lib/todos/promote-personal-task';

type PersonalTasksPanelProps = {
  variant?: 'aside' | 'page';
  onToast?: (message: string) => void;
  /** 할 일을 인수인계 카드 작성으로 승격 (인수인계 페이지에서만 제공) */
  onPromoteToCard?: (task: PersonalTask) => void;
};

function formatDue(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function isOverdue(task: PersonalTask): boolean {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(`${task.due_date}T23:59:59`).getTime() < Date.now();
}

function localTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isDueTodayOrOverdue(task: PersonalTask): boolean {
  if (task.status === 'done') return false;
  return task.due_date === localTodayString() || isOverdue(task);
}

export function PersonalTasksPanel({ variant = 'page', onToast, onPromoteToCard }: PersonalTasksPanelProps) {
  const queryClient = useQueryClient();
  const { session, requireSession, authorLabel } = useWorkSession();
  const staffName = session.name;
  const { tasks, isLoading, schemaMissing, createTask, toggleTask, deleteTask } = usePersonalTasks(staffName);
  const [draft, setDraft] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [asideExpanded, setAsideExpanded] = useState(false);
  const [promoteTask, setPromoteTask] = useState<PersonalTask | null>(null);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  const openTasks = tasks.filter((task) => task.status === 'open');
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const urgentTasks = openTasks.filter(isDueTodayOrOverdue);
  const compact = variant === 'aside';
  const collapsed = compact && !asideExpanded;
  const visible = collapsed ? urgentTasks : showDone ? tasks : openTasks;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    if (!requireSession('개인 할 일')) return;
    try {
      await createTask.mutateAsync({ title, due_date: dueDate || null });
      setDraft('');
      setDueDate('');
      onToast?.('할 일을 추가했습니다.');
    } catch (caught) {
      onToast?.(caught instanceof Error ? caught.message : '추가에 실패했습니다.');
    }
  }

  if (!staffName) {
    return (
      <p className={compact ? 'personal-tasks__hint' : 'empty-state'}>
        근무 세션에서 이름을 설정하면 개인 할 일을 쓸 수 있습니다.
      </p>
    );
  }

  return (
    <section
      className={`personal-tasks personal-tasks--${variant}${collapsed && urgentTasks.length ? ' personal-tasks--today' : ''}`}
    >
      <div className={compact ? 'aside-card__head' : 'schedule-panel__header'}>
        <div>
          <h3 className={compact ? 'aside-card__title' : undefined}>
            내 할 일
            {compact && urgentTasks.length ? (
              <span className="aside-card__title-badge aside-card__title-badge--warn">
                오늘 {urgentTasks.length}
              </span>
            ) : null}
          </h3>
          {!compact ? <p>{staffName}님만 보는 개인 체크리스트입니다.</p> : null}
        </div>
        {compact ? (
          <div className="personal-tasks__head-actions">
            <button
              type="button"
              className="aside-card__collapse"
              aria-expanded={asideExpanded}
              onClick={() => setAsideExpanded((prev) => !prev)}
            >
              {asideExpanded ? '접기' : `전체 (${openTasks.length})`}
            </button>
            <Link href={buildWorkHubHref('personal')} className="aside-card__link">
              전체
            </Link>
          </div>
        ) : null}
      </div>

      {schemaMissing ? (
        <p className="personal-tasks__hint">DB 마이그레이션 <code>034_personal_tasks.sql</code> 적용이 필요합니다.</p>
      ) : null}

      {!collapsed ? (
        <form className="personal-tasks__composer" onSubmit={handleAdd}>
          <input
            type="text"
            className="personal-tasks__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="할 일 입력…"
            disabled={createTask.isPending}
          />
          <input
            type="date"
            className="personal-tasks__date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="마감일"
          />
          <button type="submit" className="btn btn--primary btn--small" disabled={createTask.isPending || !draft.trim()}>
            추가
          </button>
        </form>
      ) : null}

      {isLoading ? (
        <p className="personal-tasks__hint">불러오는 중…</p>
      ) : !visible.length ? (
        <p className="personal-tasks__hint">
          {collapsed
            ? '오늘 마감인 할 일이 없습니다.'
            : showDone
              ? '할 일이 없습니다.'
              : '미완료 할 일이 없습니다.'}
        </p>
      ) : (
        <ul className="personal-tasks__list">
          {visible.map((task) => (
            <li
              key={task.id}
              className={`personal-tasks__item${task.status === 'done' ? ' is-done' : ''}${isOverdue(task) ? ' is-overdue' : ''}`}
            >
              <button
                type="button"
                className="personal-tasks__check"
                aria-label={task.status === 'done' ? '다시 열기' : '완료'}
                onClick={() => void toggleTask.mutateAsync(task)}
              >
                {task.status === 'done' ? '✓' : ''}
              </button>
              <div className="personal-tasks__body">
                <span className="personal-tasks__title">{task.title}</span>
                {task.due_date ? (
                  <time className="personal-tasks__due">{formatDue(task.due_date)}</time>
                ) : null}
              </div>
              {task.status === 'open' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    if (!requireSession('팀 업무 공유')) return;
                    setPromoteTask(task);
                  }}
                >
                  팀 공유
                </button>
              ) : null}
              {task.status === 'open' && onPromoteToCard ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  title="이 내용으로 인수인계 카드 작성을 시작합니다"
                  onClick={() => onPromoteToCard(task)}
                >
                  카드로
                </button>
              ) : null}
              {!compact ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => void deleteTask.mutateAsync(task.id)}
                >
                  삭제
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {doneTasks.length && compact && asideExpanded ? (
        <button type="button" className="personal-tasks__toggle-done" onClick={() => setShowDone((v) => !v)}>
          {showDone ? '미완료만 보기' : `완료 ${doneTasks.length}건 보기`}
        </button>
      ) : null}

      {!compact && doneTasks.length ? (
        <label className="personal-tasks__show-done">
          <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
          완료 항목 포함 ({doneTasks.length})
        </label>
      ) : null}

      <PromotePersonalTaskModal
        open={Boolean(promoteTask)}
        task={promoteTask}
        author={authorLabel || staffName}
        defaultShift={session.group}
        defaultName={staffName}
        staffNames={staffNames}
        busy={promoteBusy}
        onClose={() => setPromoteTask(null)}
        onSubmit={async (input) => {
          if (!promoteTask) return;
          setPromoteBusy(true);
          try {
            await promotePersonalTaskToTeamTodo(promoteTask, {
              author: authorLabel || staffName,
              ...input,
            });
            await queryClient.invalidateQueries({ queryKey: ['todos', DEFAULT_HOTEL_ID] });
            await queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
            setPromoteTask(null);
            onToast?.('팀 업무 일정에 등록했습니다.');
          } catch (caught) {
            onToast?.(caught instanceof Error ? caught.message : '팀 공유에 실패했습니다.');
            throw caught;
          } finally {
            setPromoteBusy(false);
          }
        }}
      />
    </section>
  );
}
