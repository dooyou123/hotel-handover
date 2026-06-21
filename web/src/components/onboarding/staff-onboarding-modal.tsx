'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  STAFF_ONBOARDING_STEPS,
  markStaffOnboardingComplete,
  type StaffOnboardingStep,
} from '@/lib/onboarding/staff-onboarding';
import { useWorkSession } from '@/lib/handover/use-work-session';

export function StaffOnboardingModal() {
  const { session, ready } = useWorkSession();
  const sessionComplete = Boolean(session.group && session.name);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<StaffOnboardingStep>(1);

  const dismiss = useCallback(() => {
    markStaffOnboardingComplete();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('handover-onboarding-v1') === 'done') return;
    setOpen(true);
  }, [ready]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, dismiss]);

  if (!open) return null;

  const current = STAFF_ONBOARDING_STEPS.find((item) => item.step === step) ?? STAFF_ONBOARDING_STEPS[0];
  const isLast = step === 3;

  function next() {
    if (isLast) {
      dismiss();
      return;
    }
    setStep((value) => (value < 3 ? ((value + 1) as StaffOnboardingStep) : value));
  }

  return (
    <div className="staff-onboarding" role="presentation">
      <button type="button" className="staff-onboarding__backdrop" aria-label="닫기" onClick={dismiss} />
      <section
        className="staff-onboarding__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-onboarding-title"
      >
        <header className="staff-onboarding__head">
          <p className="staff-onboarding__eyebrow">신규 직원 안내 · 약 1분</p>
          <h2 id="staff-onboarding-title">{current.title}</h2>
          <div className="staff-onboarding__steps" aria-hidden>
            {STAFF_ONBOARDING_STEPS.map((item) => (
              <span
                key={item.step}
                className={`staff-onboarding__step-dot${item.step === step ? ' is-active' : ''}${
                  item.step < step ? ' is-done' : ''
                }`}
              />
            ))}
          </div>
        </header>

        <div className="staff-onboarding__body">
          <p>{current.body}</p>
          {current.tip ? <p className="staff-onboarding__tip">{current.tip}</p> : null}
          {step === 1 && !sessionComplete ? (
            <p className="staff-onboarding__warn" role="status">
              아직 조·이름이 비어 있습니다. 상단 「지금 근무」에서 선택해 주세요.
            </p>
          ) : null}
        </div>

        <footer className="staff-onboarding__foot">
          <button type="button" className="btn btn--ghost btn--small" onClick={dismiss}>
            나중에
          </button>
          <div className="staff-onboarding__foot-actions">
            {step > 1 ? (
              <button
                type="button"
                className="btn btn--outline btn--small"
                onClick={() => setStep((value) => (value > 1 ? ((value - 1) as StaffOnboardingStep) : value))}
              >
                이전
              </button>
            ) : null}
            {isLast ? (
              <Link href="/help" className="btn btn--ghost btn--small" onClick={dismiss}>
                시작 가이드
              </Link>
            ) : null}
            <button type="button" className="btn btn--primary btn--small" onClick={next}>
              {isLast ? '시작하기' : '다음'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
