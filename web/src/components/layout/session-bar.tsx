'use client';

import { useEffect, useState } from 'react';
import { SESSION_STORAGE_KEY, SHIFTS, WORK_GROUPS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useSessionBarActions } from '@/components/layout/session-bar-actions';

type SessionState = {
  shift: string;
  group: string;
  name: string;
};

type SessionBarProps = {
  email: string;
};

export function SessionBar({ email }: SessionBarProps) {
  const { shiftHandlers } = useSessionBarActions();
  const [session, setSession] = useState<SessionState>({ shift: '', group: '', name: '' });
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    function loadFromStorage() {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
        setSession({ shift: saved.shift || '', group: saved.group || '', name: saved.name || '' });
      } catch {
        setSession({ shift: '', group: '', name: '' });
      }
    }
    loadFromStorage();
    window.addEventListener('handover-session-change', loadFromStorage);
    window.addEventListener('storage', loadFromStorage);
    return () => {
      window.removeEventListener('handover-session-change', loadFromStorage);
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaff(data ?? []));
  }, []);

  function persist(next: SessionState) {
    setSession(next);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('handover-session-change'));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const ready = Boolean(session.shift && session.group && session.name);

  return (
    <section className="session-bar">
      <div className="session-bar__info">
        <span className="session-bar__label">지금 근무</span>
        <p className="session-bar__hint">
          교대·조·이름을 선택하면 추가·확인·체크리스트·어메니티 기록에 자동으로 남습니다.
        </p>
      </div>
      <div className="session-bar__controls">
        <label className="session-field">
          <span>교대</span>
          <select
            value={session.shift}
            aria-label="현재 교대"
            onChange={(e) => persist({ ...session, shift: e.target.value })}
          >
            <option value="">선택</option>
            {SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </label>
        <label className="session-field session-field--group">
          <span>조</span>
          <select
            value={session.group}
            aria-label="근무 조"
            onChange={(e) => persist({ ...session, group: e.target.value })}
          >
            <option value="">선택</option>
            {WORK_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}조
              </option>
            ))}
          </select>
        </label>
        <label className="session-field session-field--name">
          <span>담당자</span>
          <select
            value={session.name}
            aria-label="담당자 이름"
            onChange={(e) => persist({ ...session, name: e.target.value })}
          >
            <option value="">선택</option>
            {staff.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        {shiftHandlers.onShiftStart ? (
          <button type="button" className="btn btn--shift" onClick={shiftHandlers.onShiftStart}>
            ▶ 교대 시작
          </button>
        ) : null}
        {shiftHandlers.onShiftEnd ? (
          <button type="button" className="btn btn--shift btn--shift-end" onClick={shiftHandlers.onShiftEnd}>
            ■ 교대 종료
          </button>
        ) : null}
        <div className={`session-bar__status${ready ? ' is-ready' : ''}`}>
          {ready ? `근무 중: ${session.shift} · ${session.group}조 · ${session.name}` : '교대·조·이름을 선택해 주세요'}
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={signOut}>
          로그아웃
        </button>
      </div>
      {email ? <p className="session-bar__hint" style={{ width: '100%', marginTop: '0.5rem' }}>{email}</p> : null}
    </section>
  );
}
