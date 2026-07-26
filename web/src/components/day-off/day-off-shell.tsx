'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DayOffGate } from '@/components/day-off/day-off-gate';
import { DayOffPicker } from '@/components/day-off/day-off-picker';

export function DayOffShell() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/day-off/session', { credentials: 'include' });
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
    await fetch('/api/day-off/session', {
      method: 'DELETE',
      credentials: 'include',
    });
    setAuthenticated(false);
  }

  return (
    <div className="dayoff-shell">
      <header className="dayoff-shell__bar">
        <div>
          <strong>휴무 신청</strong>
        </div>
        <div className="dayoff-shell__actions">
          {authenticated ? (
            <button type="button" className="btn btn--outline btn--small" onClick={() => void endSession()}>
              세션 종료
            </button>
          ) : (
            <Link href="/login" className="btn btn--ghost btn--small">
              관리자
            </Link>
          )}
        </div>
      </header>

      {checking ? (
        <p className="dayoff-status">세션 확인 중…</p>
      ) : authenticated ? (
        <DayOffPicker />
      ) : (
        <DayOffGate onAuthenticated={() => setAuthenticated(true)} />
      )}
    </div>
  );
}
