'use client';

import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import type { Notice } from '@/lib/handover/types';

type PinnedNoticesStripProps = {
  notices: Notice[];
  onOpen: (notice: Notice) => void;
};

function noticeTypeLabel(type: Notice['type']): string {
  return type === 'announcement' ? '공지' : '변경';
}

export function PinnedNoticesStrip({ notices, onOpen }: PinnedNoticesStripProps) {
  const pinned = notices.filter((notice) => notice.is_pinned);
  if (!pinned.length) return null;

  return (
    <section className="pinned-notices-strip" aria-label="고정 공지">
      {pinned.map((notice) => {
        const expiry = formatExpiryLabel(notice.expires_at);
        return (
          <button
            key={notice.id}
            type="button"
            className={`pinned-notices-strip__item pinned-notices-strip__item--${notice.type}`}
            onClick={() => onOpen(notice)}
          >
            <span className="pinned-notices-strip__tag">📌 {noticeTypeLabel(notice.type)}</span>
            <span className="pinned-notices-strip__text">{notice.content}</span>
            {expiry ? (
              <span
                className={`pinned-notices-strip__expiry${expiry.soon ? ' pinned-notices-strip__expiry--soon' : ''}`}
              >
                {expiry.text}
              </span>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
