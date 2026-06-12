'use client';

import { useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  const hasComments = comments.length > 0;

  if (!hasComments && !attachments.length) {
    return (
      <div className="project-list-row__comments" onClick={(event) => event.stopPropagation()}>
        <CardCommentComposer
          staffName={staffName}
          placeholder="댓글을 입력하세요…"
          disabled={disabled}
          compact
          onSubmit={onAddComment}
        />
      </div>
    );
  }

  return (
    <div className="project-list-row__comments" onClick={(event) => event.stopPropagation()}>
      {hasComments && !expanded ? (
        <button
          type="button"
          className="project-list-row__comment-toggle"
          onClick={() => setExpanded(true)}
        >
          <span className="project-list-row__comment-toggle-label">댓글 {comments.length}개</span>
          {latestComment ? (
            <span className="project-list-row__comment-toggle-preview">
              <span className="project-list-row__comment-author">
                {latestComment.staff_name || latestComment.shift}
              </span>
              <span className="project-list-row__comment-text">{latestComment.content}</span>
              <time className="project-list-row__comment-time" dateTime={latestComment.created_at}>
                {formatTime(latestComment.created_at)}
              </time>
            </span>
          ) : null}
        </button>
      ) : null}

      {hasComments && expanded ? (
        <>
          <div className="project-list-row__comment-thread-head">
            <span className="project-list-row__comment-thread-title">댓글 {comments.length}개</span>
            <button
              type="button"
              className="project-list-row__comment-collapse"
              onClick={() => setExpanded(false)}
            >
              접기
            </button>
          </div>
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
                <time className="project-list-row__comment-time" dateTime={comment.created_at}>
                  {formatTime(comment.created_at)}
                </time>
              </button>
            ))}
          </div>
          {latestComment ? (
            <button
              type="button"
              className="project-list-row__comment-bubble project-list-row__comment-bubble--latest"
              onClick={onOpenComments}
            >
              <span className="project-list-row__comment-author">
                {latestComment.staff_name || latestComment.shift}
              </span>
              <span className="project-list-row__comment-text" title={latestComment.content}>
                {latestComment.content}
              </span>
              <span className="project-list-row__comment-meta">
                <time dateTime={latestComment.created_at}>{formatTime(latestComment.created_at)}</time>
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
        </>
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
