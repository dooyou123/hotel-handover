'use client';

import { useState } from 'react';
import { GuestHowToGuide } from '@/components/rate-confirm/guest-how-to-guide';

type GuestPinGateProps = {
  onAuthenticated: () => void;
};

export function GuestPinGate({ onAuthenticated }: GuestPinGateProps) {
  const [email, setEmail] = useState('');
  const [otpPin, setOtpPin] = useState('');
  const [staticPin, setStaticPin] = useState('');
  const [showStatic, setShowStatic] = useState(false);
  const [sending, setSending] = useState(false);
  const [entering, setEntering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/email-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(json.error || '메일 발송에 실패했습니다.');
        return;
      }
      setMessage(json.message || '허용된 메일이면 일회용 PIN을 보냈습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }

  async function enterWithPin(pin: string, withEmail: boolean) {
    setEntering(true);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withEmail ? { pin, email } : { pin }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || 'PIN 확인에 실패했습니다.');
        return;
      }
      onAuthenticated();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setEntering(false);
    }
  }

  return (
    <div className="rc-guest-pin-wrap">
      <GuestHowToGuide variant="gate" />

      <div className="rc-guest-pin-row">
        <form className="rc-guest-pin" onSubmit={(e) => void sendOtp(e)}>
          <h2>일회용 PIN 받기</h2>
          <p className="rc-guest-pin__lead">
            관리자가 등록한 허용 메일을 입력하면, 그 메일로 15분짜리 일회용 PIN이 발송됩니다.
          </p>
          <label className="field">
            <span>허용 이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="front@hotel.com"
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={sending || !email.trim()}>
            {sending ? '보내는 중…' : 'PIN 메일 받기'}
          </button>
          {message ? <p className="rc-status">{message}</p> : null}
        </form>

        <form
          className="rc-guest-pin"
          onSubmit={(e) => {
            e.preventDefault();
            void enterWithPin(otpPin, true);
          }}
        >
          <h2>받은 PIN으로 입장</h2>
          <p className="rc-guest-pin__lead">메일로 받은 6자리 일회용 PIN을 입력하세요.</p>
          <label className="field">
            <span>일회용 PIN</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpPin}
              onChange={(e) => setOtpPin(e.target.value)}
              placeholder="6자리"
              required
              minLength={4}
              maxLength={32}
            />
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={entering || otpPin.trim().length < 4 || !email.trim()}
          >
            {entering ? '확인 중…' : '입장하기'}
          </button>
          <p className="rc-guest-pin__hint">허용 메일을 먼저 입력한 뒤 PIN을 입력하세요.</p>
        </form>
      </div>

      <div className="rc-guest-pin rc-guest-pin--backup">
        <button
          type="button"
          className="rc-guest-pin__backup-toggle"
          aria-expanded={showStatic}
          onClick={() => setShowStatic((prev) => !prev)}
        >
          고정 PIN으로 입장 (백업) {showStatic ? '▾' : '▸'}
        </button>
        {showStatic ? (
          <form
            className="rc-guest-pin__backup-form"
            onSubmit={(e) => {
              e.preventDefault();
              void enterWithPin(staticPin, false);
            }}
          >
            <p className="rc-guest-pin__lead">메일 발송이 안 될 때만 관리자가 알려 준 고정 PIN을 사용하세요.</p>
            <label className="field">
              <span>고정 PIN</span>
              <input
                type="password"
                value={staticPin}
                onChange={(e) => setStaticPin(e.target.value)}
                placeholder="관리자 고정 PIN"
                required
                minLength={4}
                maxLength={32}
              />
            </label>
            <button
              type="submit"
              className="btn btn--outline"
              disabled={entering || staticPin.trim().length < 4}
            >
              {entering ? '확인 중…' : '고정 PIN으로 입장'}
            </button>
          </form>
        ) : null}
      </div>

      {error ? <p className="rc-status rc-status--error">{error}</p> : null}
    </div>
  );
}
