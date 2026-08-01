'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createClient } from '@/lib/supabase/client';
import { isStaffOnboardingComplete } from '@/lib/onboarding/staff-onboarding';
import {
  fetchDailyHandoverWelcomeHandled,
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
  const { session, ready, persistSession, workGroups } = useWorkSession();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  // 공용 PC — 화면의 이름이 본인이 아닐 때 여기서 바로 바꾼다
  const [editing, setEditing] = useState(false);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [draftGroup, setDraftGroup] = useState('');
  const [draftName, setDraftName] = useState('');
  const sessionComplete = Boolean(session.group && session.name);

  // 이름이 바뀌며 이전 조회 결과가 늦게 도착하는 경우를 무시하기 위한 순번
  const visibilitySeq = useRef(0);
  const sessionName = session.name;

  const evaluateVisibility = useCallback(() => {
    const seq = ++visibilitySeq.current;
    if (!ready || !sessionComplete || !isStaffOnboardingComplete()) {
      setOpen(false);
      return;
    }
    void fetchDailyHandoverWelcomeHandled(sessionName).then((handled) => {
      if (visibilitySeq.current === seq) setOpen(!handled);
    });
  }, [ready, sessionName, sessionComplete]);

  useEffect(() => {
    evaluateVisibility();
    window.addEventListener('handover-onboarding-complete', evaluateVisibility);
    return () => window.removeEventListener('handover-onboarding-complete', evaluateVisibility);
  }, [evaluateVisibility]);

  useEffect(() => {
    if (!open || staffNames.length) return;
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, [open, staffNames.length]);

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
    void markDailyHandoverWelcomeHandled(session.name);
    setOpen(false);
    if (destination === 'brief') {
      router.push('/handover?view=brief');
      return;
    }
    if (pathname !== '/handover') router.push('/handover');
  }

  function startEditing() {
    setDraftGroup(session.group);
    setDraftName(session.name);
    setEditing(true);
  }

  function confirmEditing() {
    if (!draftGroup || !draftName) return;
    persistSession({ shift: draftGroup, group: draftGroup, name: draftName });
    setEditing(false);
    // 세션이 바뀌면 인사말·배경이 새 근무자 기준으로 다시 그려진다.
    // 새 근무자가 오늘 이미 확인했다면 evaluateVisibility가 화면을 닫는다.
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

        {editing ? (
          <>
            <div className="daily-handover-welcome__question">
              <h2 id="daily-handover-welcome-title">근무자 변경</h2>
              <p>본인의 조와 이름을 선택해 주세요.</p>
            </div>

            <div className="daily-handover-welcome__picker">
              <div className="daily-handover-welcome__chips" role="group" aria-label="조 선택">
                {workGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className={`daily-handover-welcome__chip${draftGroup === group ? ' is-active' : ''}`}
                    onClick={() => setDraftGroup(group)}
                  >
                    {group}조
                  </button>
                ))}
              </div>
              <div className="daily-handover-welcome__chips" role="group" aria-label="이름 선택">
                {staffNames.length ? (
                  staffNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`daily-handover-welcome__chip${draftName === name ? ' is-active' : ''}`}
                      onClick={() => setDraftName(name)}
                    >
                      {name}
                    </button>
                  ))
                ) : (
                  <span className="daily-handover-welcome__picker-note">직원 목록을 불러오는 중…</span>
                )}
              </div>
            </div>

            <div className="daily-handover-welcome__actions">
              <button
                type="button"
                className="daily-handover-welcome__primary"
                onClick={confirmEditing}
                disabled={!draftGroup || !draftName}
              >
                이 이름으로 근무 시작
              </button>
              <button
                type="button"
                className="daily-handover-welcome__secondary"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
            </div>
          </>
        ) : (
          <>
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
              <button
                type="button"
                className="daily-handover-welcome__tertiary"
                onClick={startEditing}
              >
                {session.name}님이 아니라면, 이름 변경
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
