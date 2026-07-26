'use client';

import { useState } from 'react';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import {
  formatTime,
  getLatestActiveCardComment,
  getLatestCardComment,
  isCommentDeleted,
  isCommentEdited,
  formatDeletedCommentLabel,
  countActiveCardComments,
  hasActiveCardComments,
} from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { CardCommentComposer } from '@/components/handover/card-comment-composer';

type HandoverCardCommentSectionProps = {
  card: Card;
  staffName: string;
  disabled?: boolean;
  onAddComment: (content: string) => Promise<void>;
  onOpenComments?: () => void;
  /** true면 최신 미리보기 없이 댓글 전체·작성란을 바로 표시 */
  showAll?: boolean;
};

export function HandoverCardCommentSection({
  card,
  staffName,
  disabled = false,
  onAddComment,
  onOpenComments,
  showAll = false,
}: HandoverCardCommentSectionProps) {
  const comments = [...card.card_comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activeCommentCount = countActiveCardComments(card);
  const hasActiveComments = hasActiveCardComments(card);
  const latestComment = hasActiveComments ? getLatestActiveCardComment(card) : getLatestCardComment(card);
  const attachments = card.card_attachments.filter((item) => item.url);
  const [expanded, setExpanded] = useState(showAll);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const hasComments = comments.length > 0;
  const threadOpen = showAll || expanded;
  const showComposer = !hasComments || threadOpen;

  function commentPreviewText(comment: (typeof comments)[number]): string {
    return isCommentDeleted(comment) ? formatDeletedCommentLabel(comment) : comment.content;
  }

  return (
    <div
      className={[
        'project-list-row__comments',
        hasActiveComments ? 'project-list-row__comments--highlight' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => event.stopPropagation()}
    >
      {hasComments && !threadOpen ? (
        <button
          type="button"
          className={[
            'project-list-row__comment-toggle',
            hasActiveComments ? 'project-list-row__comment-toggle--highlight' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setExpanded(true)}
        >
          <span className="project-list-row__comment-toggle-label">
            {hasActiveComments ? `최신 댓글 · ${activeCommentCount}개` : `댓글 ${comments.length}개`}
          </span>
          {latestComment ? (
            <span className="project-list-row__comment-toggle-preview">
              <span className="project-list-row__comment-author">
                {latestComment.staff_name || latestComment.shift}
              </span>
              <span className="project-list-row__comment-text">{commentPreviewText(latestComment)}</span>
              <time className="project-list-row__comment-time" dateTime={latestComment.created_at}>
                {formatTime(latestComment.created_at)}
              </time>
            </span>
          ) : null}
        </button>
      ) : null}

      {hasComments && threadOpen ? (
        <>
          <div className="project-list-row__comment-thread-head">
            <span className="project-list-row__comment-thread-title">
              {hasActiveComments ? `댓글 ${activeCommentCount}개` : `댓글 ${comments.length}개`}
            </span>
            {!showAll ? (
              <button
                type="button"
                className="project-list-row__comment-collapse"
                onClick={() => setExpanded(false)}
              >
                접기
              </button>
            ) : null}
          </div>
          <div className="project-list-row__comment-thread">
            {comments.map((comment) => (
              <button
                key={comment.id}
                type="button"
                className={[
                  'project-list-row__comment-bubble',
                  isCommentDeleted(comment) ? 'project-list-row__comment-bubble--deleted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={onOpenComments}
              >
                <span className="project-list-row__comment-head">
                  <span className="project-list-row__comment-author">
                    {comment.staff_name || comment.shift}
                  </span>
                  <span className="project-list-row__comment-meta">
                    <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
                    {isCommentEdited(comment) ? ' · 수정됨' : ''}
                  </span>
                </span>
                <span className="project-list-row__comment-text" title={commentPreviewText(comment)}>
                  {commentPreviewText(comment)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {attachments.length ? (
        <div className="project-list-row__photos">
          <span className="project-list-row__photos-label">사진 {attachments.length}</span>
          <div className="project-list-row__photo-strip">
            {attachments.slice(0, 2).map((attachment, attachmentIndex) => (
              <button
                key={attachment.id}
                type="button"
                className="project-list-row__photo-thumb"
                aria-label={`첨부 사진 ${attachmentIndex + 1} 보기`}
                onClick={() => setPreviewIndex(attachmentIndex)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachment.url} alt="" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showComposer ? (
        <CardCommentComposer
          staffName={staffName}
          placeholder="댓글을 입력하세요…"
          disabled={disabled}
          compact
          onSubmit={onAddComment}
        />
      ) : null}

      <ImagePreviewModal
        open={previewIndex !== null}
        attachments={attachments}
        index={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
        onChangeIndex={setPreviewIndex}
      />
    </div>
  );
}
