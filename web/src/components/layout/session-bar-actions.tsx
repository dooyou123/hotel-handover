'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ShiftHandlers = {
  onShiftStart?: () => void;
  onShiftEnd?: () => void;
};

type SessionBarActionsContextValue = {
  shiftHandlers: ShiftHandlers;
  setShiftHandlers: (handlers: ShiftHandlers) => void;
};

const SessionBarActionsContext = createContext<SessionBarActionsContextValue | null>(null);

export function SessionBarActionsProvider({ children }: { children: ReactNode }) {
  const [shiftHandlers, setShiftHandlers] = useState<ShiftHandlers>({});
  const value = useMemo(
    () => ({ shiftHandlers, setShiftHandlers }),
    [shiftHandlers],
  );
  return <SessionBarActionsContext.Provider value={value}>{children}</SessionBarActionsContext.Provider>;
}

export function useSessionBarActions() {
  const ctx = useContext(SessionBarActionsContext);
  if (!ctx) throw new Error('useSessionBarActions must be used within SessionBarActionsProvider');
  return ctx;
}

export function useRegisterShiftHandlers(handlers: ShiftHandlers) {
  const { setShiftHandlers } = useSessionBarActions();

  useEffect(() => {
    setShiftHandlers(handlers);
    return () => setShiftHandlers({});
  }, [handlers.onShiftStart, handlers.onShiftEnd, setShiftHandlers]);
}
