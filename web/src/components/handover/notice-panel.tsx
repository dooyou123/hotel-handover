'use client';

import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { formatTime } from '@/lib/handover/card-utils';
import type { Notice, NoticeType } from '@/lib/handover/types';
import { LinkifiedText } from '@/components/ui/linkified-text';

type NoticePanelProps = {
  type: NoticeType;
  title: string;
  hint: string;
  notices: Notice[];
  onAdd: () => void;
  onOpen: (notice: Notice) => void;
  onTogglePin: (notice: Notice) => void;
};

export function NoticePanel({ type, title, hint, notices, onAdd, onOpen, onTogglePin }: NoticePanelProps) {
  const panelClass =
    type === 'announcement' ? 'notice-panel notice-panel--announcement' : 'notice-panel notice-panel--change';

  return (
    <article className={panelClass}>
      <div className="notice-panel__header">
        <div>
          <h2 className="notice-panel__title">{title}</h2>
          <p className="notice-panel__hint">{hint}</p>
        </div>
        <button type="button" onClick={onAdd} className="btn btn--ghost btn--small">
          + {type === 'announcement' ? '공지' : '변경'} 추가
        </button>
      </div>

      <div className="notice-panel__list">
        {notices.length ? (
          notices.map((notice) => {
            const expiry = formatExpiryLabel(notice.expires_at);
            return (
              <div
                key={notice.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(notice)}
                onKeyDown={(event) => event.key === 'Enter' && onOpen(notice)}
                className={`notice-item${notice.is_pinned ? ' notice-item--pinned' : ''}`}
              >
                <div className="notice-item__head">
                  <div className="notice-item__tags">
                    {notice.is_pinned ? <span className="notice-tag notice-tag--pin">📌 고정</span> : null}
                    {expiry ? (
                      <span className={`notice-tag${expiry.soon ? ' notice-tag--expire-soon' : ' notice-tag--expire'}`}>
                        {expiry.text}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(notice);
                    }}
                    className={`notice-pin-btn${notice.is_pinned ? ' is-active' : ''}`}
                    title="고정 토글"
                  >
                    📌
                  </button>
                </div>
                <p className="notice-item__content">
                  <LinkifiedText text={notice.content} as="span" />
                </p>
                <div className="notice-item__meta">
                  <span>{notice.author || '작성자 미입력'}</span>
                  <span>{formatTime(notice.updated_at || notice.created_at)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="notice-empty">
            등록된 {type === 'announcement' ? '업무 공지' : '업무 변경'}이 없습니다.
          </p>
        )}
      </div>
    </article>
  );
}
