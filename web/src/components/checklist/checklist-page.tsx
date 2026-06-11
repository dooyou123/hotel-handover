'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  fetchChecklistForShift,
  resetChecklistCompletions,
  toggleChecklistItem,
  type ChecklistItemView,
} from '@/lib/checklist/use-checklist';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_HOTEL_ID, formatShiftChecklistTitle } from '@/lib/constants';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

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
}: {
  title: string;
  done: number;
  total: number;
  items: ChecklistItemView[];
  emptyText: string;
  onToggle: (itemId: string) => void;
  onReset?: () => void;
  resetBusy?: boolean;
}) {
  return (
    <section className="checklist-section">
      <div className="checklist-section__header">
        <h3>{title}</h3>
        <div className="checklist-section__actions">
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
              className={`checklist-item checklist-item--page${item.completed ? ' is-done' : ''}`}
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
  const { session, requireSession } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const { group } = session;
  const shift = session.shift || group;
  const ready = Boolean(group);
  const [resettingScope, setResettingScope] = useState<'common' | string | null>(null);

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
      <section className="checklist-page">
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
  const metaText = data?.work_date
    ? `${formatWorkDate(data.work_date)} · ${group}조 · ${
        items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'
      }`
    : `${group}조 · ${items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'}`;

  return (
    <section className="checklist-page">
      <div className="checklist-page__header">
        <div>
          <h2>Shift Check List</h2>
          <p>
            현재 조({formatShiftChecklistTitle(group)}) 항목을 순서대로 확인합니다. Excel 시트와 동일한
            A·B·C조 체크리스트입니다.
          </p>
        </div>
        <Link href="/settings" className="btn btn--ghost">
          항목 관리
        </Link>
      </div>

      <p className="checklist-page__meta">{metaText}</p>

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
              items={commonItems}
              emptyText="공통 항목이 없습니다. 설정에서 추가하세요."
              onToggle={handleToggle}
              onReset={() => void handleReset('common', '공통 확인')}
              resetBusy={resettingScope === 'common'}
            />
          ) : null}
          <ChecklistColumn
            title={formatShiftChecklistTitle(group)}
            done={groupDone}
            total={groupItems.length}
            items={groupItems}
            emptyText={`${formatShiftChecklistTitle(group)} 항목이 없습니다.`}
            onToggle={handleToggle}
            onReset={() => void handleReset(group, formatShiftChecklistTitle(group))}
            resetBusy={resettingScope === group}
          />
        </div>
      )}
    </section>
  );
}
