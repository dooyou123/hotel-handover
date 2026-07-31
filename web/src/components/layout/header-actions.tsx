'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type HeaderActionsContextValue = {
  headerActions: ReactNode | null;
  setHeaderActions: (node: ReactNode | null) => void;
};

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const value = useMemo(() => ({ headerActions, setHeaderActions }), [headerActions]);
  return <HeaderActionsContext.Provider value={value}>{children}</HeaderActionsContext.Provider>;
}

export function HeaderActionsSlot() {
  const ctx = useContext(HeaderActionsContext);
  if (!ctx?.headerActions) return null;
  return <div className="header__actions--handover">{ctx.headerActions}</div>;
}

export function useRegisterHeaderActions(node: ReactNode | null) {
  const ctx = useContext(HeaderActionsContext);
  const setHeaderActions = ctx?.setHeaderActions;

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(node);
    return () => setHeaderActions(null);
  }, [node, setHeaderActions]);
}
