'use client';

import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { formatTime } from '@/lib/handover/card-utils';
import { noticeTypeLabel } from '@/lib/handover/notice-utils';
import type { Notice } from '@/lib/handover/types';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type NoticeDetailModalProps = {
  notice: Notice | null;
  onClose: () => void;
  onEdit?: (notice: Notice) => void;
};

export function NoticeDetailModal({ notice, onClose, onEdit }: NoticeDetailModalProps) {
  if (!notice) return null;

  const expiry = formatExpiryLabel(notice.expires_at);

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <article
        className="modal modal--notice-read"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="notice-read-title"
      >
        <header className="notice-read__header">
          <div className="notice-read__tags">
            <span className={`notice-read__type notice-read__type--${notice.type}`}>
              {noticeTypeLabel(notice.type)}
            </span>
            {notice.is_pinned ? <span className="notice-read__pin">📌 고정</span> : null}
            {expiry ? (
              <span className={`notice-read__expiry${expiry.soon ? ' notice-read__expiry--soon' : ''}`}>
                {expiry.text}
              </span>
            ) : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <h2 id="notice-read-title" className="notice-read__title">
          {notice.content.split('\n')[0]?.trim() || '공지'}
        </h2>

        <div className="notice-read__meta">
          <span>{notice.author || '작성자 미입력'}</span>
          <span aria-hidden>·</span>
          <time dateTime={notice.updated_at || notice.created_at}>
            {formatTime(notice.updated_at || notice.created_at)}
          </time>
        </div>

        <LinkifiedText text={notice.content} className="notice-read__body" />

        <footer className="notice-read__footer">
          {onEdit ? (
            <button type="button" className="btn btn--ghost" onClick={() => onEdit(notice)}>
              수정
            </button>
          ) : null}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            닫기
          </button>
        </footer>
      </article>
    </div>
  );
}
