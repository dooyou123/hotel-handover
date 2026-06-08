'use client';

import { useEffect, useRef, useState } from 'react';

type UserMenuProps = {
  email: string;
  onSignOut: () => void;
};

function displayName(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.length > 12 ? `${local.slice(0, 11)}…` : local;
}

export function UserMenu({ email, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = (email[0] ?? '?').toUpperCase();

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-menu__avatar" aria-hidden>
          {initial}
        </span>
        <span className="user-menu__name">{displayName(email)}</span>
      </button>
      {open ? (
        <div className="user-menu__panel" role="menu">
          <p className="user-menu__email">{email}</p>
          <button type="button" className="user-menu__action" role="menuitem" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}
