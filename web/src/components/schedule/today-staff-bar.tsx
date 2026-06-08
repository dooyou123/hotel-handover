'use client';

import Link from 'next/link';
import { SHIFTS } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useTodaySchedule } from '@/lib/schedule/use-schedule';

function formatWorkDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function TodayStaffBar() {
  const { data } = useTodaySchedule();
  const { persistSession, session } = useWorkSession();

  if (!data) return null;

  const hasAny = SHIFTS.some((shift) => (data.shifts[shift] ?? []).length > 0);

  return (
    <section className="today-staff-bar" aria-live="polite">
      <div className="today-staff-bar__header">
        <div>
          <span className="today-staff-bar__label">오늘 근무</span>
          <p className="today-staff-bar__hint">
            스케줄에 등록된 오늘 담당자입니다. 이름을 누르면 「지금 근무」에 자동 입력됩니다.
          </p>
        </div>
        <span className="today-staff-bar__date">{formatWorkDate(data.work_date)}</span>
      </div>

      {!hasAny ? (
        <p className="today-staff-empty">
          오늘 등록된 근무 스케줄이 없습니다.{' '}
          <Link href="/schedule" className="link-btn">
            스케줄
          </Link>
          에서 CSV를 업로드하세요.
        </p>
      ) : (
        <div className="today-staff-bar__grid">
          {SHIFTS.map((shift) => {
            const names = data.shifts[shift] ?? [];
            return (
              <article key={shift} className="today-staff-card">
                <span className="today-staff-card__shift">{shift}</span>
                <div className="today-staff-card__names">
                  {names.length ? (
                    names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => persistSession({ shift, group: session.group, name })}
                        className="today-staff-chip"
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <span className="today-staff-empty-shift">미등록</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
