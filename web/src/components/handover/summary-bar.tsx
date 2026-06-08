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
  const doneCount = totalCount - data.urgentActive.length - data.progressActive.length;

  const stats: {
    label: string;
    count: number;
    warn: boolean;
    filter?: QuickFilter;
  }[] = [
    { label: '🔴 긴급', count: data.urgentActive.length, warn: false, filter: 'all' },
    data.unackedUrgent.length > 0
      ? { label: '⚠️ 미확인 긴급', count: data.unackedUrgent.length, warn: true, filter: 'unacked' }
      : null,
    { label: '🟡 진행중', count: data.progressActive.length, warn: false, filter: 'all' },
    { label: '✅ 완료', count: doneCount, warn: false, filter: 'all' },
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
        const isInteractive = Boolean(onFilterSelect && stat.filter && stat.filter !== 'all');
        const isActive = stat.filter && activeFilter === stat.filter;

        if (!isInteractive) {
          return (
            <span
              key={stat.label}
              className={`summary__chip${stat.warn ? ' summary__chip--warn' : ''}`}
            >
              {stat.label} <strong>{stat.count}</strong>건
            </span>
          );
        }

        return (
          <button
            key={stat.label}
            type="button"
            className={`summary__chip summary__chip--button${stat.warn ? ' summary__chip--warn' : ''}${isActive ? ' is-active' : ''}`}
            onClick={() => onFilterSelect?.(stat.filter!)}
          >
            {stat.label} <strong>{stat.count}</strong>건
          </button>
        );
      })}
    </section>
  );
}
