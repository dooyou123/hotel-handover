'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { QuickFilter } from '@/lib/handover/types';

type SummaryBarProps = {
  data: ShiftSummaryData;
  totalCount: number;
  activeFilter?: QuickFilter;
  onFilterSelect?: (filter: QuickFilter) => void;
};

export function SummaryBar({ data, totalCount, activeFilter, onFilterSelect }: SummaryBarProps) {
  const doneCount = data.boardDoneCount;

  function chipTone(label: string): string {
    if (label.includes('미확인')) return '';
    if (label.includes('긴급')) return 'summary__chip--urgent';
    if (label.includes('진행중')) return 'summary__chip--progress';
    if (label.includes('완료')) return 'summary__chip--done';
    if (label === '전체') return 'summary__chip--all';
    return '';
  }

  const stats: {
    label: string;
    count: number;
    warn: boolean;
    filter?: QuickFilter;
  }[] = [
    { label: '🔴 긴급', count: data.urgentActive.length, warn: false },
    data.unackedUrgent.length > 0
      ? { label: '⚠️ 미확인 긴급', count: data.unackedUrgent.length, warn: true, filter: 'unacked' }
      : null,
    { label: '🟡 진행중', count: data.progressActive.length, warn: false },
    ...(data.holdActive.length > 0
      ? [{ label: '⏸ 보류', count: data.holdActive.length, warn: false }]
      : []),
    { label: '✅ 완료', count: doneCount, warn: false },
    { label: '전체', count: totalCount, warn: false, filter: 'all' },
  ].filter(Boolean) as {
    label: string;
    count: number;
    warn: boolean;
    filter?: QuickFilter;
  }[];

  return (
    <section className="summary" aria-label="업무 요약" aria-live="polite">
      {stats.map((stat) => {
        const isInteractive = Boolean(onFilterSelect && stat.filter);
        const isActive = stat.filter && activeFilter === stat.filter;

        const tone = chipTone(stat.label);

        if (!isInteractive) {
          return (
            <span
              key={stat.label}
              className={`summary__chip${tone ? ` ${tone}` : ''}${stat.warn ? ' summary__chip--warn' : ''}`}
            >
              {stat.label} <strong>{stat.count}</strong>건
            </span>
          );
        }

        return (
          <button
            key={stat.label}
            type="button"
            className={`summary__chip summary__chip--button${tone ? ` ${tone}` : ''}${stat.warn ? ' summary__chip--warn' : ''}${isActive ? ' is-active' : ''}`}
            onClick={() => onFilterSelect?.(stat.filter!)}
          >
            {stat.label} <strong>{stat.count}</strong>건
          </button>
        );
      })}
    </section>
  );
}
