'use client';

import { formatTime, getLatestCardComment, isCommentEdited } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { CardCommentComposer } from '@/components/handover/card-comment-composer';

type HandoverCardCommentSectionProps = {
  card: Card;
  staffName: string;
  disabled?: boolean;
  onAddComment: (content: string) => Promise<void>;
  onOpenComments?: () => void;
};

export function HandoverCardCommentSection({
  card,
  staffName,
  disabled = false,
  onAddComment,
  onOpenComments,
}: HandoverCardCommentSectionProps) {
  const comments = [...card.card_comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latestComment = getLatestCardComment(card);
  const attachments = card.card_attachments.filter((item) => item.url);

  return (
    <div className="project-list-row__comments" onClick={(event) => event.stopPropagation()}>
      {comments.length > 1 ? (
        <div className="project-list-row__comment-thread">
          {comments.slice(0, -1).map((comment) => (
            <button
              key={comment.id}
              type="button"
              className="project-list-row__comment-bubble"
              onClick={onOpenComments}
            >
              <span className="project-list-row__comment-author">{comment.staff_name || comment.shift}</span>
              <span className="project-list-row__comment-text">{comment.content}</span>
            </button>
          ))}
        </div>
      ) : null}

      {latestComment ? (
        <button
          type="button"
          className="project-list-row__comment-bubble project-list-row__comment-bubble--latest"
          onClick={onOpenComments}
        >
          <span className="project-list-row__comment-author">{latestComment.staff_name || latestComment.shift}</span>
          <span className="project-list-row__comment-text" title={latestComment.content}>
            {latestComment.content}
          </span>
          <span className="project-list-row__comment-meta">
            {formatTime(latestComment.created_at)}
            {isCommentEdited(latestComment) ? ' · 수정됨' : ''}
            {comments.length > 1 ? ` · 외 ${comments.length - 1}건` : ''}
          </span>
        </button>
      ) : null}

      <CardCommentComposer
        staffName={staffName}
        placeholder="댓글을 입력하세요…"
        disabled={disabled}
        compact
        onSubmit={onAddComment}
      />

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
