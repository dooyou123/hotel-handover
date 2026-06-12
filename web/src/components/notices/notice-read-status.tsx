'use client';

import { noticeReadSummary } from '@/lib/notices/reads';
import { useNoticeReads } from '@/lib/notices/use-notice-reads';
import type { Notice } from '@/lib/handover/types';

type NoticeReadStatusProps = {
  notice: Notice;
  activeStaffNames: string[];
  currentStaffName: string;
};

export function NoticeReadStatus({ notice, activeStaffNames, currentStaffName }: NoticeReadStatusProps) {
  const { data: reads = [] } = useNoticeReads(notice.is_pinned ? [notice.id] : []);

  if (!notice.is_pinned || !activeStaffNames.length) return null;

  const { read, unread } = noticeReadSummary(notice.id, reads, activeStaffNames);
  const mineRead = read.includes(currentStaffName.trim());

  return (
    <div className="notice-read-status">
      <p className="notice-read-status__title">
        📌 필독 확인 · {read.length}/{activeStaffNames.length}명
        {mineRead ? <span className="notice-read-status__mine"> · 내 확인 완료</span> : null}
      </p>
      {unread.length ? (
        <p className="notice-read-status__unread">
          미확인: <strong>{unread.join(', ')}</strong>
        </p>
      ) : (
        <p className="notice-read-status__done">전원 확인했습니다.</p>
      )}
    </div>
  );
}
