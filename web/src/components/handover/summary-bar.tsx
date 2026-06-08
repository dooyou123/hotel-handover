'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';

type SummaryBarProps = {
  data: ShiftSummaryData;
  totalCount: number;
};

export function SummaryBar({ data, totalCount }: SummaryBarProps) {
  const doneCount = totalCount - data.urgentActive.length - data.progressActive.length;

  const stats = [
    { label: '🔴 긴급', count: data.urgentActive.length, warn: false },
    data.unackedUrgent.length > 0
      ? { label: '⚠️ 미확인 긴급', count: data.unackedUrgent.length, warn: true }
      : null,
    { label: '🟡 진행중', count: data.progressActive.length, warn: false },
    { label: '✅ 완료', count: doneCount, warn: false },
    { label: '전체', count: totalCount, warn: false },
  ].filter(Boolean) as { label: string; count: number; warn: boolean }[];

  return (
    <section className="summary" aria-label="업무 요약" aria-live="polite">
      {stats.map((stat) => (
        <span
          key={stat.label}
          className={`summary__chip${stat.warn ? ' summary__chip--warn' : ''}`}
        >
          {stat.label} <strong>{stat.count}</strong>건
        </span>
      ))}
    </section>
  );
}
