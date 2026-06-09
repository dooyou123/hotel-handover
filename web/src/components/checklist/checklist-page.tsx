'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchChecklistForShift, toggleChecklistItem, type ChecklistItemView } from '@/lib/checklist/use-checklist';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';

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

function ChecklistColumn({
  title,
  done,
  total,
  items,
  emptyText,
  onToggle,
}: {
  title: string;
  done: number;
  total: number;
  items: ChecklistItemView[];
  emptyText: string;
  onToggle: (itemId: string) => void;
}) {
  return (
    <section className="checklist-section">
      <div className="checklist-section__header">
        <h3>{title}</h3>
        <span className="checklist-section__count">
          {total ? `${done}/${total}` : '—'}
        </span>
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
                <span className="checklist-item__label">{item.label}</span>
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
  const queryClient = useQueryClient();
  const { group } = session;
  const shift = session.shift || group;
  const ready = Boolean(group);

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
      const result = await toggleChecklistItem(itemId, session.shift, session.group, session.name);
      queryClient.setQueryData(['checklist', DEFAULT_HOTEL_ID, shift, group], result);
    } catch {
      refetch();
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
          <h2>교대 체크리스트</h2>
          <p>
            <strong>공통</strong> 항목은 전 조가 확인하고, <strong>조 전용</strong> 항목은 해당 조만
            체크합니다.
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
        <div className="checklist-sections checklist-sections--grid">
          <ChecklistColumn
            title="공통 확인"
            done={commonDone}
            total={commonItems.length}
            items={commonItems}
            emptyText="공통 항목이 없습니다. 설정에서 추가하세요."
            onToggle={handleToggle}
          />
          <ChecklistColumn
            title={`${group}조 전용`}
            done={groupDone}
            total={groupItems.length}
            items={groupItems}
            emptyText={`${group}조 전용 항목이 없습니다.`}
            onToggle={handleToggle}
          />
        </div>
      )}
    </section>
  );
}
