'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { QuickFilter } from '@/lib/handover/types';

type HandoverSummaryNovaProps = {
  data: ShiftSummaryData;
  totalCount: number;
  activeFilter?: QuickFilter;
  onFilterSelect?: (filter: QuickFilter) => void;
};

type Tile = {
  id: string;
  label: string;
  count: number;
  tone: 'urgent' | 'warn' | 'progress' | 'done' | 'all';
  filter?: QuickFilter;
};

export function HandoverSummaryNova({
  data,
  totalCount,
  activeFilter,
  onFilterSelect,
}: HandoverSummaryNovaProps) {
  const tiles: Tile[] = [
    { id: 'urgent', label: '긴급', count: data.urgentActive.length, tone: 'urgent' },
    ...(data.unackedUrgent.length > 0
      ? [{ id: 'unacked', label: '미확인 긴급', count: data.unackedUrgent.length, tone: 'warn' as const, filter: 'unacked' as const }]
      : []),
    { id: 'progress', label: '진행중', count: data.progressActive.length, tone: 'progress' },
    ...(data.holdActive.length > 0
      ? [{ id: 'hold', label: '보류', count: data.holdActive.length, tone: 'progress' as const }]
      : []),
    ...(data.staleActive.length > 0
      ? [{ id: 'stale', label: '오래됨', count: data.staleActive.length, tone: 'warn' as const, filter: 'stale' as const }]
      : []),
    ...(data.longHoldActive.length > 0
      ? [
          {
            id: 'hold-long',
            label: '보류 오래됨',
            count: data.longHoldActive.length,
            tone: 'warn' as const,
            filter: 'hold-long' as const,
          },
        ]
      : []),
    { id: 'done', label: '완료', count: data.boardDoneCount, tone: 'done' },
    { id: 'all', label: '전체', count: totalCount, tone: 'all', filter: 'all' },
  ];

  return (
    <section className="nova-handover-summary" aria-label="업무 요약" aria-live="polite">
      {tiles.map((tile) => {
        const interactive = Boolean(onFilterSelect && tile.filter);
        const active = tile.filter && activeFilter === tile.filter;
        const className = `nova-handover-summary__tile nova-handover-summary__tile--${tile.tone}${active ? ' is-active' : ''}`;

        if (!interactive) {
          return (
            <div key={tile.id} className={className}>
              <span className="nova-handover-summary__label">{tile.label}</span>
              <strong key={tile.count} className="nova-handover-summary__count">
                {tile.count}
              </strong>
            </div>
          );
        }

        return (
          <button
            key={tile.id}
            type="button"
            className={className}
            onClick={() => onFilterSelect?.(tile.filter!)}
          >
            <span className="nova-handover-summary__label">{tile.label}</span>
            <strong key={tile.count} className="nova-handover-summary__count">
              {tile.count}
            </strong>
          </button>
        );
      })}
    </section>
  );
}
