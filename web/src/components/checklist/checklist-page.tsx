'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchChecklistForShift, toggleChecklistItem } from '@/lib/checklist/use-checklist';
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

export function ChecklistPageClient() {
  const { session, requireSession } = useWorkSession();
  const queryClient = useQueryClient();
  const shift = session.shift;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['checklist', DEFAULT_HOTEL_ID, shift],
    queryFn: () => fetchChecklistForShift(shift),
    enabled: Boolean(shift),
  });

  useEffect(() => {
    if (!shift) return;
    const supabase = createClient();
    const channel = supabase
      .channel('checklist-completions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_completions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['checklist', DEFAULT_HOTEL_ID, shift] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, shift]);

  async function handleToggle(itemId: string) {
    if (!requireSession('체크')) {
      refetch();
      return;
    }
    try {
      const result = await toggleChecklistItem(itemId, session.shift, session.name);
      queryClient.setQueryData(['checklist', DEFAULT_HOTEL_ID, shift], result);
    } catch {
      refetch();
    }
  }

  if (!shift) {
    return (
      <section className="checklist-page">
        <p className="empty-state">상단 「지금 근무」에서 교대를 선택하면 체크리스트가 표시됩니다.</p>
      </section>
    );
  }

  const items = data?.items ?? [];
  const completed = items.filter((item) => item.completed).length;
  const metaText = data?.work_date
    ? `${formatWorkDate(data.work_date)} · ${shift} · ${
        items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'
      }`
    : `${shift} · ${items.length ? `${completed}/${items.length} 완료` : '등록된 항목 없음'}`;

  return (
    <section className="checklist-page">
      <div className="checklist-page__header">
        <div>
          <h2>교대 체크리스트</h2>
          <p>오늘 교대마다 확인하는 반복 업무입니다. 상단에서 교대·이름을 선택한 뒤 체크하세요.</p>
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
        </p>
      ) : !items.length ? (
        <div className="checklist-page__list">
          <p className="checklist-empty">
            등록된 체크 항목이 없습니다.{' '}
            <Link href="/settings">설정</Link>에서 추가하세요.
          </p>
        </div>
      ) : (
        <div className="checklist-page__list">
          {items.map((item) => (
            <label
              key={item.id}
              className={`checklist-item checklist-item--page${item.completed ? ' is-done' : ''}`}
            >
              <input type="checkbox" checked={item.completed} onChange={() => handleToggle(item.id)} />
              <span className="checklist-item__body">
                <span className="checklist-item__label">{item.label}</span>
                {item.completed ? (
                  <span className="checklist-item__meta">
                    {item.completed_by} · {formatTime(item.completed_at)}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
