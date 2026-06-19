'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  fetchChecklistForShift,
  completeChecklistScope,
  resetChecklistCompletions,
  toggleChecklistItem,
  type ChecklistItemView,
} from '@/lib/checklist/use-checklist';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_HOTEL_ID, formatShiftChecklistTitle } from '@/lib/constants';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { NightRegisterPanel } from '@/components/checklist/night-register-panel';
import { ChecklistMemoPanel } from '@/components/checklist/checklist-memo-panel';
import { ChecklistProgressBar } from '@/components/checklist/checklist-progress-bar';

function formatWorkDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function ChecklistLabel({ label }: { label: string }) {
  const hintIndex = label.indexOf('\n[참고]');
  if (hintIndex < 0) {
    return <span className="checklist-item__label">{label}</span>;
  }
  return (
    <span className="checklist-item__label">
      <span className="checklist-item__text">{label.slice(0, hintIndex)}</span>
      <span className="checklist-item__hint">{label.slice(hintIndex + 1)}</span>
    </span>
  );
}

function ChecklistColumn({
  title,
  done,
  total,
  items,
  emptyText,
  onToggle,
  onReset,
  resetBusy,
  onCompleteAll,
  completeBusy,
  highlightItemId,
}: {
  title: string;
  done: number;
  total: number;
  items: ChecklistItemView[];
  emptyText: string;
  onToggle: (itemId: string) => void;
  onReset?: () => void;
  resetBusy?: boolean;
  onCompleteAll?: () => void;
  completeBusy?: boolean;
  highlightItemId?: string | null;
}) {
  const incomplete = total - done;
  return (
    <section className="checklist-section">
      <div className="checklist-section__header">
        <div className="checklist-section__title">
          <h3>{title}</h3>
          {total > 0 ? (
            <ChecklistProgressBar done={done} total={total} label={`${title} 완료`} compact />
          ) : null}
        </div>
        <div className="checklist-section__actions">
          {onCompleteAll && incomplete > 0 ? (
            <button
              type="button"
              className="checklist-section__complete-all"
              onClick={onCompleteAll}
              disabled={completeBusy}
            >
              {completeBusy ? '처리 중…' : `미완료 ${incomplete}건 체크`}
            </button>
          ) : null}
          {onReset && done > 0 ? (
            <button
              type="button"
              className="checklist-section__reset"
              onClick={onReset}
              disabled={resetBusy}
            >
              {resetBusy ? '초기화 중…' : '초기화'}
            </button>
          ) : null}
          <span className="checklist-section__count">{total ? `${done}/${total}` : '—'}</span>
        </div>
      </div>
      <div className="checklist-page__list checklist-page__list--column">
        {items.length ? (
          items.map((item) => (
            <label
              key={item.id}
              id={`checklist-item-${item.id}`}
              className={`checklist-item checklist-item--page${item.completed ? ' is-done' : ''}${
                highlightItemId === item.id ? ' is-focus' : ''
              }`}
            >
              <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)} />
              <span className="checklist-item__body">
                <ChecklistLabel label={item.label} />
                {item.completed ? (
                  <span className="checklist-item__meta">
                    {item.completed_by} · {formatTime(item.completed_at)}
                  </span>
                ) : null}
              </span>
            </label>
          ))
        ) : (
          <p className="checklist-empty">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export function ChecklistPageClient() {
  const pageMeta = getNavPageMeta('/checklist');
  const { session, requireSession, authorLabel } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const [toast, setToast] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { group } = session;
  const shift = session.shift || group;
  const ready = Boolean(group);
  const [resettingScope, setResettingScope] = useState<'common' | string | null>(null);
  const [completingScope, setCompletingScope] = useState<'common' | string | null>(null);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const lastScrolledItemId = useRef<string | null>(null);

  const clearHighlight = useCallback(() => {
    window.setTimeout(() => setHighlightItemId(null), 1600);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['checklist', DEFAULT_HOTEL_ID, shift, group],
    queryFn: () => fetchChecklistForShift(shift, group),
    enabled: ready,
  });

  useEffect(() => {
    if (!ready) return;
    const supabase = createClient();
    const channel = supabase
      .channel('checklist-completions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_completions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['checklist', DEFAULT_HOTEL_ID, shift, group] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, shift, group, ready]);

  const incompleteIds = useMemo(() => {
    if (!ready || !data?.items?.length) return [];
    const commonItems = data.items.filter((item) => item.work_group === 'common');
    const groupItems = data.items.filter((item) => item.work_group === group);
    return [...commonItems, ...groupItems].filter((item) => !item.completed).map((item) => item.id);
  }, [data?.items, group, ready]);

  const scrollToNextIncomplete = useCallback(() => {
    if (!incompleteIds.length) {
      setToast('모든 항목을 완료했습니다.');
      window.setTimeout(() => setToast(null), 2200);
      return;
    }

    const lastId = lastScrolledItemId.current;
    const lastIndex = lastId ? incompleteIds.indexOf(lastId) : -1;
    const nextId =
      lastIndex >= 0 && lastIndex < incompleteIds.length - 1
        ? incompleteIds[lastIndex + 1]
        : incompleteIds[0];

    lastScrolledItemId.current = nextId;
    setHighlightItemId(nextId);
    clearHighlight();

    window.requestAnimationFrame(() => {
      document.getElementById(`checklist-item-${nextId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [clearHighlight, incompleteIds]);

  useEffect(() => {
    if (!ready) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'n' && event.key !== 'N') return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      event.preventDefault();
      scrollToNextIncomplete();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ready, scrollToNextIncomplete]);

  async function handleToggle(itemId: string) {
    if (!requireSession('체크')) {
      refetch();
      return;
    }
    try {
      const result = await toggleChecklistItem(itemId, shift, group, session.name);
      queryClient.setQueryData(['checklist', DEFAULT_HOTEL_ID, shift, group], result);
    } catch {
      refetch();
    }
  }

  async function handleCompleteAll(scope: 'common' | string, label: string, count: number) {
    if (!requireSession('체크')) return;
    const ok = await confirm({
      title: `${label} 일괄 체크`,
      message: `미완료 ${count}건을 모두 체크합니다. 계속할까요?`,
      tone: 'warning',
      confirmLabel: '모두 체크',
    });
    if (!ok) return;

    setCompletingScope(scope);
    try {
      const result = await completeChecklistScope(scope, shift, group, session.name);
      queryClient.setQueryData(['checklist', DEFAULT_HOTEL_ID, shift, group], result);
      setToast(`${label} 미완료 ${count}건을 체크했습니다.`);
      window.setTimeout(() => setToast(null), 2200);
    } catch {
      refetch();
    } finally {
      setCompletingScope(null);
    }
  }

  async function handleReset(scope: 'common' | string, label: string) {
    if (!requireSession('체크리스트 초기화')) return;
    const ok = await confirm({
      title: `${label} 초기화`,
      message: `오늘 ${label} 체크를 모두 해제합니다. 계속할까요?`,
      tone: 'warning',
      confirmLabel: '초기화',
    });
    if (!ok) return;

    setResettingScope(scope);
    try {
      const result = await resetChecklistCompletions(scope, shift, group);
      queryClient.setQueryData(['checklist', DEFAULT_HOTEL_ID, shift, group], result);
    } catch {
      refetch();
    } finally {
      setResettingScope(null);
    }
  }

  if (!ready) {
    return (
      <section className="project-board checklist-page">
        <header className="project-board__head">
          <div>
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.description}</p>
          </div>
        </header>
        <p className="empty-state">상단 「지금 근무」에서 조와 담당자를 선택하면 체크리스트가 표시됩니다.</p>
      </section>
    );
  }

  const items = data?.items ?? [];
  const commonItems = items.filter((item) => item.work_group === 'common');
  const groupItems = items.filter((item) => item.work_group === group);
  const commonDone = commonItems.filter((item) => item.completed).length;
  const groupDone = groupItems.filter((item) => item.completed).length;
  const completed = items.filter((item) => item.completed).length;
  const incompleteCount = items.length - completed;

  const displayCommonItems = showIncompleteOnly
    ? commonItems.filter((item) => !item.completed)
    : commonItems;
  const displayGroupItems = showIncompleteOnly
    ? groupItems.filter((item) => !item.completed)
    : groupItems;

  const metaText = data?.work_date
    ? `${formatWorkDate(data.work_date)} · ${group}조 · ${
        items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'
      }`
    : `${group}조 · ${items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'}`;

  return (
    <section className="project-board checklist-page">
      <header className="project-board__head">
        <div>
          <h1>{pageMeta.label}</h1>
          <p>{pageMeta.description}</p>
        </div>
        <Link href="/settings" className="btn btn--ghost">
          항목 관리
        </Link>
      </header>

      <p className="checklist-page__meta">{metaText}</p>

      {items.length > 0 ? (
        <div className="checklist-page__progress">
          <ChecklistProgressBar done={completed} total={items.length} label="오늘 체크리스트 완료도" />
          <div className="checklist-page__tools">
            <button
              type="button"
              className={`checklist-page__filter${showIncompleteOnly ? ' is-active' : ''}`}
              onClick={() => setShowIncompleteOnly((prev) => !prev)}
              aria-pressed={showIncompleteOnly}
            >
              미완료만 보기
              {incompleteCount > 0 ? ` (${incompleteCount})` : ''}
            </button>
            <button
              type="button"
              className="btn btn--outline btn--small"
              onClick={scrollToNextIncomplete}
              disabled={!incompleteCount}
              title="키보드 N"
            >
              다음 미완료 ↓ (N)
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : error ? (
        <p className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
          체크리스트를 불러오지 못했습니다.
          <br />
          Supabase SQL Editor에서 005_feedback_checklist_groups.sql 마이그레이션을 실행했는지 확인해 주세요.
        </p>
      ) : !items.length ? (
        <div className="checklist-page__list">
          <p className="checklist-empty">
            등록된 체크 항목이 없습니다.{' '}
            <Link href="/settings" className="link-btn">
              설정
            </Link>
            에서 공통·조별 항목을 추가하세요.
          </p>
        </div>
      ) : (
        <div
          className={`checklist-sections${
            commonItems.length ? ' checklist-sections--grid' : ' checklist-sections--single'
          }`}
        >
          {commonItems.length ? (
            <ChecklistColumn
              title="공통 확인"
              done={commonDone}
              total={commonItems.length}
              items={displayCommonItems}
              emptyText={
                showIncompleteOnly && commonDone === commonItems.length
                  ? '공통 항목을 모두 완료했습니다.'
                  : '공통 항목이 없습니다. 설정에서 추가하세요.'
              }
              onToggle={handleToggle}
              onCompleteAll={() =>
                void handleCompleteAll('common', '공통 확인', commonItems.length - commonDone)
              }
              completeBusy={completingScope === 'common'}
              onReset={() => void handleReset('common', '공통 확인')}
              resetBusy={resettingScope === 'common'}
              highlightItemId={highlightItemId}
            />
          ) : null}
          <ChecklistColumn
            title={formatShiftChecklistTitle(group)}
            done={groupDone}
            total={groupItems.length}
            items={displayGroupItems}
            emptyText={
              showIncompleteOnly && groupDone === groupItems.length
                ? `${formatShiftChecklistTitle(group)} 항목을 모두 완료했습니다.`
                : `${formatShiftChecklistTitle(group)} 항목이 없습니다.`
            }
            onToggle={handleToggle}
            onCompleteAll={() =>
              void handleCompleteAll(group, formatShiftChecklistTitle(group), groupItems.length - groupDone)
            }
            completeBusy={completingScope === group}
            onReset={() => void handleReset(group, formatShiftChecklistTitle(group))}
            resetBusy={resettingScope === group}
            highlightItemId={highlightItemId}
          />
        </div>
      )}

      {data?.work_date ? (
        <ChecklistMemoPanel
          workDate={data.work_date}
          shift={shift}
          workGroup={group}
          authorLabel={authorLabel}
          requireSession={requireSession}
          onSaved={(message) => {
            setToast(message);
            window.setTimeout(() => setToast(null), 2500);
          }}
        />
      ) : null}

      {group === 'C' && data?.work_date ? (
        <NightRegisterPanel
          workDate={data.work_date}
          authorLabel={authorLabel}
          requireSession={requireSession}
          onSaved={(message) => {
            setToast(message);
            window.setTimeout(() => setToast(null), 2500);
          }}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
