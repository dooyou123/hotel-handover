'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type MobileNavContextValue = {
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const closeNav = useCallback(() => setOpen(false), []);
  const openNav = useCallback(() => setOpen(true), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeNav();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeNav]);

  return (
    <MobileNavContext.Provider value={{ open, openNav, closeNav }}>{children}</MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider');
  return ctx;
}

export function MobileNavTrigger() {
  const { open, openNav, closeNav } = useMobileNav();
  return (
    <button
      type="button"
      className="nova-mobile-nav-trigger"
      aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={open ? closeNav : openNav}
    >
      <span aria-hidden>☰</span>
    </button>
  );
}

export function MobileNavBackdrop() {
  const { open, closeNav } = useMobileNav();
  if (!open) return null;
  return <button type="button" className="nova-sidebar-backdrop" aria-label="메뉴 닫기" onClick={closeNav} />;
}
