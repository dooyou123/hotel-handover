'use client';

import { useCallback, useEffect, useState } from 'react';
import { SESSION_STORAGE_KEY } from '@/lib/constants';
import type { WorkSession } from '@/lib/handover/types';

export function useWorkSession() {
  const [session, setSession] = useState<WorkSession>({ shift: '', name: '' });
  const [ready, setReady] = useState(false);

  const persistSession = useCallback((next: WorkSession) => {
    setSession(next);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('handover-session-change'));
  }, []);

  useEffect(() => {
    function loadFromStorage() {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
        setSession({ shift: saved.shift || '', name: saved.name || '' });
      } catch {
        setSession({ shift: '', name: '' });
      }
    }
    loadFromStorage();
    setReady(true);
    window.addEventListener('handover-session-change', loadFromStorage);
    window.addEventListener('storage', loadFromStorage);
    return () => {
      window.removeEventListener('handover-session-change', loadFromStorage);
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  const requireSession = useCallback(
    (action: string): boolean => {
      if (session.shift && session.name) return true;
      window.alert(`교대와 담당자를 선택한 뒤 ${action}할 수 있습니다.`);
      return false;
    },
    [session.shift, session.name],
  );

  const authorLabel = session.shift && session.name ? `${session.shift} · ${session.name}` : session.shift;

  return { session, ready, requireSession, authorLabel, persistSession };
}
