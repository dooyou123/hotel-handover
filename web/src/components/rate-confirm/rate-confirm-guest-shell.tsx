'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GuestPinGate } from '@/components/rate-confirm/guest-pin-gate';
import { GuestHowToGuide } from '@/components/rate-confirm/guest-how-to-guide';
import { RateConfirmPageClient } from '@/components/rate-confirm/rate-confirm-page';

export function RateConfirmGuestShell() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/rate-confirm/guest/session', { credentials: 'include' });
      const json = (await res.json()) as { authenticated?: boolean };
      setAuthenticated(Boolean(json.authenticated));
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function endSession() {
    await fetch('/api/rate-confirm/guest/session', {
      method: 'DELETE',
      credentials: 'include',
    });
    setAuthenticated(false);
  }

  return (
    <div className="rc-guest-shell">
      <header className="rc-guest-shell__bar">
        <div>
          <p className="rc-guest-shell__eyebrow">Guest access</p>
          <strong>객실료 컨펌</strong>
        </div>
        <div className="rc-guest-shell__actions">
          <Link href="/login" className="btn btn--ghost btn--small">
            로그인으로
          </Link>
          {authenticated ? (
            <button type="button" className="btn btn--outline btn--small" onClick={() => void endSession()}>
              게스트 세션 종료
            </button>
          ) : null}
        </div>
      </header>

      {checking ? (
        <p className="rc-status rc-status--loading">세션 확인 중…</p>
      ) : authenticated ? (
        <>
          <GuestHowToGuide variant="workspace" />
          <RateConfirmPageClient mode="guest" />
        </>
      ) : (
        <GuestPinGate onAuthenticated={() => setAuthenticated(true)} />
      )}
    </div>
  );
}
