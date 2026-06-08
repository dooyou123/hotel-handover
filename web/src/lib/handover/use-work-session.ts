'use client';

import { useCallback, useEffect, useState } from 'react';
import { SESSION_STORAGE_KEY, WORK_GROUPS } from '@/lib/constants';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import type { WorkSession } from '@/lib/handover/types';

const EMPTY_SESSION: WorkSession = { shift: '', group: '', name: '' };

function normalizeSession(raw: Partial<WorkSession>): WorkSession {
  return {
    shift: raw.shift || '',
    group: raw.group || '',
    name: raw.name || '',
  };
}

/** SessionBar와 동일한 저장소에서 최신 근무 정보를 읽습니다. */
export function readWorkSession(): WorkSession {
  if (typeof window === 'undefined') return EMPTY_SESSION;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
    return normalizeSession(saved);
  } catch {
    return EMPTY_SESSION;
  }
}

function isSessionComplete(session: WorkSession) {
  return Boolean(session.shift && session.group && session.name);
}

export function useWorkSession() {
  const { alert } = useConfirmDialog();
  const [session, setSession] = useState<WorkSession>(EMPTY_SESSION);
  const [ready, setReady] = useState(false);

  const persistSession = useCallback((next: WorkSession) => {
    setSession(next);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('handover-session-change'));
  }, []);

  useEffect(() => {
    function loadFromStorage() {
      setSession(readWorkSession());
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
      const current = readWorkSession();
      if (isSessionComplete(current)) {
        setSession((prev) =>
          prev.shift === current.shift && prev.group === current.group && prev.name === current.name
            ? prev
            : current,
        );
        return true;
      }
      void alert({
        title: '근무 정보 필요',
        message: `교대·조·담당자를 선택한 뒤 ${action}할 수 있습니다.`,
        tone: 'warning',
      });
      return false;
    },
    [alert],
  );

  const authorLabel = isSessionComplete(session)
    ? `${session.shift} · ${session.group}조 · ${session.name}`
    : session.shift && session.name
      ? `${session.shift} · ${session.name}`
      : session.shift;

  return { session, ready, requireSession, authorLabel, persistSession, workGroups: WORK_GROUPS };
}
