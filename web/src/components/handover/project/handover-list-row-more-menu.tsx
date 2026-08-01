'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type HandoverListRowMoreMenuProps = {
  cardTitle: string;
  needsFirstResponse: boolean;
  canSnooze: boolean;
  snoozed: boolean;
  canAssign: boolean;
  staffNames: string[];
  assigneeName: string | null;
  onRecordFirstResponse?: () => void;
  onSnooze?: () => void;
  onUnsnooze?: () => void;
  onAssignChange: (assigneeName: string) => void;
  pinned?: boolean;
  onTogglePin?: () => void;
};

const MENU_MIN_WIDTH = 168;
const VIEWPORT_MARGIN = 8;

function placeMenu(trigger: HTMLElement, menu?: HTMLElement | null): CSSProperties {
  const triggerRect = trigger.getBoundingClientRect();
  const menuWidth = Math.max(menu?.offsetWidth ?? MENU_MIN_WIDTH, MENU_MIN_WIDTH);
  const menuHeight = menu?.offsetHeight ?? 160;
  const gap = 6;

  let top = triggerRect.bottom + gap;
  if (top + menuHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = triggerRect.top - menuHeight - gap;
  }
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - menuHeight - VIEWPORT_MARGIN));

  let left = triggerRect.right - menuWidth;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - menuWidth - VIEWPORT_MARGIN));

  return {
    position: 'fixed',
    top,
    left,
    minWidth: MENU_MIN_WIDTH,
    zIndex: 10000,
  };
}

function getMenuItems(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

export function HandoverListRowMoreMenu({
  cardTitle,
  needsFirstResponse,
  canSnooze,
  snoozed,
  canAssign,
  staffNames,
  assigneeName,
  onRecordFirstResponse,
  onSnooze,
  onUnsnooze,
  onAssignChange,
  pinned = false,
  onTogglePin,
}: HandoverListRowMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>(() => ({ position: 'fixed', visibility: 'hidden' }));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasMenuItems =
    needsFirstResponse ||
    canSnooze ||
    Boolean(onTogglePin) ||
    (canAssign && staffNames.length > 0);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuStyle({
      ...placeMenu(triggerRef.current, menuRef.current),
      visibility: 'visible',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const items = getMenuItems(menuRef.current);
    items[0]?.focus();
  }, [open, updatePosition, needsFirstResponse, canSnooze, canAssign, staffNames.length]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open, closeMenu]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = getMenuItems(menuRef.current);
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      items[next]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[next]?.focus();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  if (!hasMenuItems) return null;

  const menu = open ? (
    <div
      ref={menuRef}
      className="project-list-row__more-menu"
      role="menu"
      style={menuStyle}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleMenuKeyDown}
    >
      {onTogglePin ? (
        <button
          type="button"
          role="menuitem"
          className="project-list-row__more-item"
          title="급하진 않지만 계속 보여야 하는 카드를 진행중 탭 맨 위에 고정합니다"
          onClick={(event) => {
            event.stopPropagation();
            closeMenu();
            onTogglePin();
          }}
        >
          {pinned ? '고정 해제' : '📌 상단 고정'}
        </button>
      ) : null}
      {needsFirstResponse ? (
        <button
          type="button"
          role="menuitem"
          className="project-list-row__more-item"
          onClick={(event) => {
            event.stopPropagation();
            closeMenu();
            onRecordFirstResponse?.();
          }}
        >
          첫 응대
        </button>
      ) : null}
      {canSnooze ? (
        <button
          type="button"
          role="menuitem"
          className="project-list-row__more-item"
          onClick={(event) => {
            event.stopPropagation();
            closeMenu();
            if (snoozed) onUnsnooze?.();
            else onSnooze?.();
          }}
        >
          {snoozed ? '알림 켬' : '2h 알림 끔'}
        </button>
      ) : null}
      {canAssign && staffNames.length ? (
        <div className="project-list-row__more-assign">
          <span className="project-list-row__more-assign-label" id={`assign-label-${cardTitle.slice(0, 8)}`}>
            담당
          </span>
          <button
            type="button"
            role="menuitem"
            className={`project-list-row__more-item${!assigneeName ? ' is-active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onAssignChange('');
            }}
          >
            담당 없음
          </button>
          {staffNames.map((name) => (
            <button
              key={name}
              type="button"
              role="menuitem"
              className={`project-list-row__more-item${assigneeName === name ? ' is-active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                closeMenu();
                onAssignChange(name);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`project-list-row__more${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="project-list-row__more-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="추가 작업"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden>⋯</span>
      </button>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
