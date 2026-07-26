'use client';

import { useState } from 'react';

type DayOffGateProps = {
  onAuthenticated: () => void;
};

export function DayOffGate({ onAuthenticated }: DayOffGateProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/day-off/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || '비밀번호 확인에 실패했습니다.');
        return;
      }
      onAuthenticated();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dayoff-gate">
      <form className="dayoff-gate__card" onSubmit={(e) => void submit(e)}>
        <h1>휴무 신청 입장</h1>
        <p className="dayoff-gate__lead">
          관리자가 안내한 공유 비밀번호를 입력한 뒤, 본인 이름으로 휴무 희망일을 신청할 수 있습니다.
        </p>
        <label className="field">
          <span>공유 비밀번호</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="비밀번호"
            required
            minLength={4}
            maxLength={64}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy || pin.trim().length < 4}>
          {busy ? '확인 중…' : '입장하기'}
        </button>
        {error ? <p className="dayoff-error">{error}</p> : null}
      </form>
    </div>
  );
}
