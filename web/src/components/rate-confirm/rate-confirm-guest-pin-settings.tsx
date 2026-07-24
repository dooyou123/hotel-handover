'use client';

import { useEffect, useState } from 'react';
import { useIsManager } from '@/lib/handover/use-cards';

export function RateConfirmGuestPinSettings() {
  const { data: isManager = false } = useIsManager();
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [mailConfigured, setMailConfigured] = useState(false);
  const [mailFromEmail, setMailFromEmail] = useState('');
  const [mailApiKeyMasked, setMailApiKeyMasked] = useState<string | null>(null);
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', { credentials: 'include' });
      const json = (await res.json()) as {
        configured?: boolean;
        updatedAt?: string | null;
        emails?: string[];
        mailConfigured?: boolean;
        mailFromEmail?: string | null;
        mailApiKeyMasked?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || '설정을 불러오지 못했습니다.');
        return;
      }
      setConfigured(Boolean(json.configured));
      setUpdatedAt(json.updatedAt ?? null);
      setEmails(json.emails ?? []);
      setMailConfigured(Boolean(json.mailConfigured));
      setMailFromEmail(json.mailFromEmail ?? '');
      setMailApiKeyMasked(json.mailApiKeyMasked ?? null);
      setResendFromEmail(json.mailFromEmail ?? '');
      setResendApiKey('');
    } catch {
      setError('설정을 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    if (!isManager) return;
    void refresh();
  }, [isManager]);

  if (!isManager) return null;

  async function savePin() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = (await res.json()) as { configured?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error || '저장에 실패했습니다.');
        return;
      }
      setConfigured(Boolean(json.configured));
      setUpdatedAt(new Date().toISOString());
      setPin('');
      setMessage('백업용 고정 PIN을 저장했습니다.');
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function clearPin() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || '해제에 실패했습니다.');
        return;
      }
      setConfigured(false);
      setUpdatedAt(new Date().toISOString());
      setMessage('고정 PIN을 해제했습니다.');
    } catch {
      setError('해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function addEmail() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addEmail: emailDraft }),
      });
      const json = (await res.json()) as { emails?: string[]; error?: string };
      if (!res.ok) {
        setError(json.error || '메일 추가에 실패했습니다.');
        return;
      }
      setEmails(json.emails ?? []);
      setEmailDraft('');
      setMessage('허용 메일을 추가했습니다.');
    } catch {
      setError('메일 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function removeEmail(email: string) {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeEmail: email }),
      });
      const json = (await res.json()) as { emails?: string[]; error?: string };
      if (!res.ok) {
        setError(json.error || '메일 삭제에 실패했습니다.');
        return;
      }
      setEmails(json.emails ?? []);
      setMessage('허용 메일을 삭제했습니다.');
    } catch {
      setError('메일 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function saveMail() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resendApiKey: resendApiKey.trim() || undefined,
          resendFromEmail: resendFromEmail.trim(),
        }),
      });
      const json = (await res.json()) as {
        mailConfigured?: boolean;
        mailFromEmail?: string | null;
        mailApiKeyMasked?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || '메일 설정 저장에 실패했습니다.');
        return;
      }
      setMailConfigured(Boolean(json.mailConfigured));
      setMailFromEmail(json.mailFromEmail ?? '');
      setMailApiKeyMasked(json.mailApiKeyMasked ?? null);
      setResendFromEmail(json.mailFromEmail ?? '');
      setResendApiKey('');
      setMessage('메일 발송 설정을 저장했습니다.');
    } catch {
      setError('메일 설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function clearMail() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/rate-confirm/guest/pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearMail: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || '메일 설정 해제에 실패했습니다.');
        return;
      }
      setMailConfigured(false);
      setMailFromEmail('');
      setMailApiKeyMasked(null);
      setResendApiKey('');
      setResendFromEmail('');
      setMessage('메일 발송 설정을 해제했습니다.');
    } catch {
      setError('메일 설정 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const canSaveMail =
    Boolean(resendFromEmail.trim()) && (Boolean(resendApiKey.trim()) || Boolean(mailApiKeyMasked));

  return (
    <article className="rc-guest-pin-admin">
      <h3>게스트 접속 설정</h3>
      <p className="rc-muted">
        허용된 메일로만 일회용 PIN을 보냅니다. 고정 PIN은 메일 장애 시 백업용입니다.
      </p>

      <div className="rc-guest-pin-admin__section">
        <h4>메일 발송 (Resend)</h4>
        <p className={mailConfigured ? 'rc-muted' : 'rc-status rc-status--error'}>
          {mailConfigured
            ? `상태: 설정됨${mailApiKeyMasked ? ` · 키 ${mailApiKeyMasked}` : ''}${
                mailFromEmail ? ` · 발신 ${mailFromEmail}` : ''
              }`
            : '상태: 미설정 — 저장하기 전에는 게스트에게 PIN 메일이 발송되지 않습니다.'}
        </p>
        <p className="rc-muted">
          Resend(resend.com)에서 API 키와 인증된 발신 주소를 만든 뒤 아래에 저장하세요. API 키는 다시
          표시되지 않습니다.
        </p>
        <label className="field">
          <span>Resend API 키</span>
          <input
            type="password"
            value={resendApiKey}
            onChange={(e) => setResendApiKey(e.target.value)}
            placeholder={mailApiKeyMasked ? `저장된 키 유지 (${mailApiKeyMasked})` : 're_…'}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>발신 메일</span>
          <input
            type="text"
            value={resendFromEmail}
            onChange={(e) => setResendFromEmail(e.target.value)}
            placeholder="noreply@yourdomain.com"
            autoComplete="off"
          />
        </label>
        <div className="rc-guest-pin-admin__row">
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={loading || !canSaveMail}
            onClick={() => void saveMail()}
          >
            저장
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={loading || !mailConfigured}
            onClick={() => void clearMail()}
          >
            해제
          </button>
        </div>
      </div>

      <div className="rc-guest-pin-admin__section">
        <h4>허용 메일</h4>
        <div className="rc-guest-pin-admin__row">
          <label className="field">
            <span>이메일 추가</span>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="front@hotel.com"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={loading || !emailDraft.trim()}
            onClick={() => void addEmail()}
          >
            추가
          </button>
        </div>
        {emails.length ? (
          <ul className="rc-guest-pin-admin__emails">
            {emails.map((email) => (
              <li key={email}>
                <span>{email}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  disabled={loading}
                  onClick={() => void removeEmail(email)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rc-muted">등록된 메일이 없습니다. 추가해야 게스트가 PIN 메일을 받을 수 있습니다.</p>
        )}
      </div>

      <div className="rc-guest-pin-admin__section">
        <h4>백업용 고정 PIN</h4>
        <p className="rc-muted">
          상태: {configured ? '설정됨' : '미설정'}
          {updatedAt
            ? ` · ${new Date(updatedAt).toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
        </p>
        <div className="rc-guest-pin-admin__row">
          <label className="field">
            <span>새 PIN (4~32자)</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="예: 4829"
              minLength={4}
              maxLength={32}
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={loading || pin.trim().length < 4}
            onClick={() => void savePin()}
          >
            저장
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={loading || !configured}
            onClick={() => void clearPin()}
          >
            해제
          </button>
        </div>
      </div>

      {message ? <p className="rc-status">{message}</p> : null}
      {error ? <p className="rc-status rc-status--error">{error}</p> : null}
    </article>
  );
}
