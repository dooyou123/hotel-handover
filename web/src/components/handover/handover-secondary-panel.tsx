'use client';

import { useState, type ReactNode } from 'react';

type HandoverSecondaryPanelProps = {
  children: ReactNode;
  noticeCount: number;
};

export function HandoverSecondaryPanel({ children, noticeCount }: HandoverSecondaryPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="handover-secondary">
      <button
        type="button"
        className="handover-secondary__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="handover-secondary__label">오늘 근무 · 연락처 · 공지</span>
        {noticeCount > 0 ? (
          <span className="handover-secondary__badge">공지 {noticeCount}건</span>
        ) : null}
        <span className="handover-secondary__chevron" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open ? <div className="handover-secondary__body">{children}</div> : null}
    </section>
  );
}
