'use client';

import { formatTime, getLatestCardComment } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';

type HandoverCardListExtrasProps = {
  card: Card;
};

export function HandoverCardListExtras({ card }: HandoverCardListExtrasProps) {
  const latestComment = getLatestCardComment(card);
  const attachments = card.card_attachments.filter((item) => item.url);

  if (!latestComment && !attachments.length) return null;

  return (
    <div className="project-list-row__extras">
      {latestComment ? (
        <p className="project-list-row__comment">
          <span className="project-list-row__comment-label">댓글</span>
          <span className="project-list-row__comment-text">{latestComment.content}</span>
          <span className="project-list-row__comment-meta">
            {latestComment.staff_name || latestComment.shift}
            {latestComment.created_at ? ` · ${formatTime(latestComment.created_at)}` : ''}
            {card.card_comments.length > 1 ? ` · 외 ${card.card_comments.length - 1}건` : ''}
          </span>
        </p>
      ) : null}
      {attachments.length ? (
        <div className="project-list-row__photos">
          <span className="project-list-row__photos-label">사진 {attachments.length}</span>
          <div className="project-list-row__photo-strip" aria-hidden>
            {attachments.slice(0, 2).map((attachment) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={attachment.id} src={attachment.url} alt="" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
