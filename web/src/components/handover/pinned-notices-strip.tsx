'use client';

import Link from 'next/link';
import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import type { Notice } from '@/lib/handover/types';
import { filterNoticesForFeed } from '@/lib/notices/status';

type PinnedNoticesStripProps = {
  notices: Notice[];
};

export function PinnedNoticesStrip({ notices }: PinnedNoticesStripProps) {
  const pinned = filterNoticesForFeed(notices).filter((notice) => notice.is_pinned);
  if (!pinned.length) return null;

  return (
    <section className="pinned-notices-strip" aria-label="고정 공지">
      {pinned.map((notice) => {
        const expiry = formatExpiryLabel(notice.expires_at);
        return (
          <Link
            key={notice.id}
            href={`/notices?channel=${notice.type}&id=${notice.id}`}
            className={`pinned-notices-strip__item pinned-notices-strip__item--${notice.type}`}
          >
            <span className="pinned-notices-strip__tag">📌 {noticeTypeShort(notice.type)}</span>
            <span className="pinned-notices-strip__text">{notice.content.split('\n')[0]}</span>
            {expiry ? (
              <span
                className={`pinned-notices-strip__expiry${expiry.soon ? ' pinned-notices-strip__expiry--soon' : ''}`}
              >
                {expiry.text}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link href="/notices" className="pinned-notices-strip__more">
        게시판 전체 →
      </Link>
    </section>
  );
}
