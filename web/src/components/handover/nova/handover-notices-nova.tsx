'use client';

import Link from 'next/link';
import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import type { Notice } from '@/lib/handover/types';

type HandoverNoticesNovaProps = {
  notices: Notice[];
};

export function HandoverNoticesNova({ notices }: HandoverNoticesNovaProps) {
  const pinned = notices.filter((notice) => notice.is_pinned);
  if (!pinned.length) return null;

  return (
    <section className="nova-handover-notices" aria-label="고정 공지">
      {pinned.map((notice) => {
        const expiry = formatExpiryLabel(notice.expires_at);
        return (
          <Link
            key={notice.id}
            href={`/notices?channel=${notice.type}&id=${notice.id}`}
            className={`nova-handover-notices__item nova-handover-notices__item--${notice.type}`}
          >
            <span className="nova-handover-notices__tag">{noticeTypeShort(notice.type)}</span>
            <span className="nova-handover-notices__text">{notice.content.split('\n')[0]}</span>
            {expiry ? (
              <span className={`nova-handover-notices__expiry${expiry.soon ? ' is-soon' : ''}`}>
                {expiry.text}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link href="/notices" className="nova-handover-notices__more">
        게시판 전체
      </Link>
    </section>
  );
}
