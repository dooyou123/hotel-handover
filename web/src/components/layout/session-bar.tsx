'use client';

import { useEffect, useState } from 'react';
import { SESSION_STORAGE_KEY, WORK_GROUPS, formatSessionLabel } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { StaffXpBadge } from '@/components/layout/staff-xp-badge';
import { UserMenu } from '@/components/layout/user-menu';

type SessionState = {
  shift: string;
  group: string;
  name: string;
};

type SessionBarProps = {
  email: string;
};

export function SessionBar({ email }: SessionBarProps) {
  const [session, setSession] = useState<SessionState>({ shift: '', group: '', name: '' });
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    function loadFromStorage() {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
        const group = saved.group || '';
        setSession({
          shift: saved.shift || group,
          group,
          name: saved.name || '',
        });
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
    const normalized = { ...next, shift: next.group };
    setSession(normalized);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('handover-session-change'));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const ready = Boolean(session.group && session.name);
  const sessionLabel = ready ? formatSessionLabel(session.group, session.name) : '근무 설정 필요';

  return (
    <div className="session-bar session-bar--compact">
      <div className="session-bar__cluster" title={sessionLabel} aria-label={sessionLabel}>
        <select
          className="session-bar__select session-bar__select--narrow"
          value={session.group}
          aria-label="근무 조"
          onChange={(e) => persist({ ...session, group: e.target.value })}
        >
          <option value="">조</option>
          {WORK_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}조
            </option>
          ))}
        </select>
        <select
          className="session-bar__select session-bar__select--name"
          value={session.name}
          aria-label="담당자 이름"
          onChange={(e) => persist({ ...session, name: e.target.value })}
        >
          <option value="">이름</option>
          {staff.map((member) => (
            <option key={member.id} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {session.name ? <StaffXpBadge staffName={session.name} /> : null}

      {email ? <UserMenu email={email} onSignOut={signOut} /> : null}
    </div>
  );
}
