'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { isStaffOnboardingComplete } from '@/lib/onboarding/staff-onboarding';
import {
  hasHandledDailyHandoverWelcome,
  localDateKey,
  markDailyHandoverWelcomeHandled,
  pickDailyHandoverWelcomeBackground,
} from '@/lib/onboarding/daily-handover-welcome';

function formatClock(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatToday(now: Date): string {
  return now.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function DailyHandoverWelcome() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, ready } = useWorkSession();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const sessionComplete = Boolean(session.group && session.name);

  const evaluateVisibility = useCallback(() => {
    if (!ready || !sessionComplete || !isStaffOnboardingComplete()) {
      setOpen(false);
      return;
    }
    setOpen(!hasHandledDailyHandoverWelcome(session));
  }, [ready, session, sessionComplete]);

  useEffect(() => {
    evaluateVisibility();
    window.addEventListener('handover-onboarding-complete', evaluateVisibility);
    return () => window.removeEventListener('handover-onboarding-complete', evaluateVisibility);
  }, [evaluateVisibility]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearInterval(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const sessionLabel = useMemo(
    () => `${session.group}조 · ${session.name}`,
    [session.group, session.name],
  );

  const dateKey = localDateKey(now);
  const background = useMemo(() => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return pickDailyHandoverWelcomeBackground(
      session,
      new Date(year, month - 1, day, 12),
    );
  }, [session, dateKey]);

  if (!open) return null;

  function finish(destination: 'brief' | 'board') {
    markDailyHandoverWelcomeHandled(session);
    setOpen(false);
    if (destination === 'brief') {
      router.push('/handover?view=brief');
      return;
    }
    if (pathname !== '/handover') router.push('/handover');
  }

  return (
    <section
      className="daily-handover-welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-handover-welcome-title"
    >
      <div
        className={`daily-handover-welcome__photo${background.mirrored ? ' is-mirrored' : ''}`}
        style={{ backgroundImage: `url('${background.url}')` }}
        aria-hidden
      />
      <div className="daily-handover-welcome__shade" aria-hidden />

      <div className="daily-handover-welcome__content">
        <div className="daily-handover-welcome__time" aria-label={`현재 시각 ${formatClock(now)}`}>
          {formatClock(now)}
        </div>
        <p className="daily-handover-welcome__date">{formatToday(now)}</p>
        <p className="daily-handover-welcome__staff">{sessionLabel}</p>

        <div className="daily-handover-welcome__question">
          <h2 id="daily-handover-welcome-title">{session.name}님, 오늘 첫 근무인가요?</h2>
          <p>오늘의 인수인계를 확인하시겠습니까?</p>
        </div>

        <div className="daily-handover-welcome__actions">
          <button
            type="button"
            className="daily-handover-welcome__primary"
            onClick={() => finish('brief')}
            autoFocus
          >
            네, 인수인계 확인하기
          </button>
          <button
            type="button"
            className="daily-handover-welcome__secondary"
            onClick={() => finish('board')}
          >
            아니요, 메인 화면으로
          </button>
        </div>
      </div>
    </section>
  );
}
