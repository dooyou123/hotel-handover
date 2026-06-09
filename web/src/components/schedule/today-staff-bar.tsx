'use client';

import Link from 'next/link';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useTodaySchedule } from '@/lib/schedule/use-schedule';

function formatWorkDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

type TodayStaffBarProps = {
  variant?: 'default' | 'compact';
};

export function TodayStaffBar({ variant = 'default' }: TodayStaffBarProps) {
  const { data } = useTodaySchedule();
  const { persistSession } = useWorkSession();
  const compact = variant === 'compact';

  if (!data) return null;

  const hasAny = WORK_GROUPS.some((group) => (data.groups[group] ?? []).length > 0);

  function applyStaff(group: string, name: string) {
    persistSession({ shift: group, group, name });
  }

  if (compact) {
    return (
      <section className="today-staff-bar today-staff-bar--compact" aria-live="polite">
        <span className="today-staff-bar__label">오늘 근무</span>
        {!hasAny ? (
          <span className="today-staff-bar__compact-empty">
            스케줄 없음 ·{' '}
            <Link href="/schedule" className="link-btn">
              등록
            </Link>
          </span>
        ) : (
          <div className="today-staff-bar__compact-track">
            {WORK_GROUPS.map((group) => {
              const names = data.groups[group] ?? [];
              if (!names.length) return null;
              return (
                <div key={group} className="today-staff-bar__compact-group">
                  <span className="today-staff-bar__compact-group-label">{formatWorkGroupLabel(group)}</span>
                  {names.map((name) => (
                    <button
                      key={`${group}-${name}`}
                      type="button"
                      onClick={() => applyStaff(group, name)}
                      className="today-staff-chip today-staff-chip--compact"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <span className="today-staff-bar__compact-date">{formatWorkDate(data.work_date)}</span>
      </section>
    );
  }

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
          {WORK_GROUPS.map((group) => {
            const names = data.groups[group] ?? [];
            return (
              <article key={group} className="today-staff-card">
                <span className="today-staff-card__shift">{formatWorkGroupLabel(group)}</span>
                <div className="today-staff-card__names">
                  {names.length ? (
                    names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => applyStaff(group, name)}
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
