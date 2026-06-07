'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';

type SummaryBarProps = {
  data: ShiftSummaryData;
};

export function SummaryBar({ data }: SummaryBarProps) {
  const stats = [
    data.unackedUrgent.length > 0
      ? { label: '⚠️ 미확인 긴급', count: data.unackedUrgent.length, warn: true }
      : null,
    { label: '🔴 긴급', count: data.urgentActive.length, warn: false },
    { label: '🟡 진행중', count: data.progressActive.length, warn: false },
    { label: '📋 오늘 업무', count: data.todayCards.length, warn: false },
    { label: '✅ 오늘 완료', count: data.doneToday.length, warn: false },
  ].filter(Boolean) as { label: string; count: number; warn: boolean }[];

  return (
    <section className="summary" aria-label="업무 요약">
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
