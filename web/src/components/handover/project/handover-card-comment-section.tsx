'use client';

import { useState } from 'react';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import {
  formatRelativeTime,
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
  /** 없으면 읽기 전용 (보관함처럼 댓글을 더 달 수 없는 곳) */
  onAddComment?: (content: string) => Promise<void>;
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
  const activeCommentCount = countActiveCardComments(card);
  const hasActiveComments = hasActiveCardComments(card);
  const attachments = card.card_attachments.filter((item) => item.url);
  const [expanded, setExpanded] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const hasComments = comments.length > 0;
  const hiddenCount = comments.length - 1;
  const visibleComments = expanded ? comments : comments.slice(-1);

  if (!hasComments && !attachments.length && !onAddComment) return null;

  return (
    <div
      className={[
        'project-list-row__comments',
        hasActiveComments ? 'project-list-row__comments--highlight' : '',
        hasComments ? '' : 'project-list-row__comments--empty',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => event.stopPropagation()}
    >
      {hasComments ? (
        <div className="project-list-row__comment-feed">
          <div className="project-list-row__comment-feed-head">
            <span className="project-list-row__comment-feed-title">
              댓글 {hasActiveComments ? activeCommentCount : comments.length}개
            </span>
            <span className="project-list-row__comment-feed-actions">
              {expanded ? (
                <>
                  {onOpenComments ? (
                    <button
                      type="button"
                      className="project-list-row__comment-open"
                      onClick={onOpenComments}
                    >
                      댓글 창 열기
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="project-list-row__comment-collapse"
                    onClick={() => setExpanded(false)}
                  >
                    접기
                  </button>
                </>
              ) : hiddenCount > 0 ? (
                <button
                  type="button"
                  className="project-list-row__comment-more"
                  onClick={() => setExpanded(true)}
                >
                  이전 댓글 {hiddenCount}개 더 보기
                </button>
              ) : null}
            </span>
          </div>

          <ul
            className={[
              'project-list-row__comment-list',
              expanded ? 'is-expanded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {visibleComments.map((comment) => {
              const deleted = isCommentDeleted(comment);
              const author = comment.staff_name || comment.shift || '?';
              const time = formatRelativeTime(comment.created_at);
              return (
                <li
                  key={comment.id}
                  className={[
                    'project-list-row__comment-item',
                    deleted ? 'project-list-row__comment-item--deleted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="project-list-row__comment-avatar" aria-hidden>
                    {author.slice(0, 1)}
                  </span>
                  <div className="project-list-row__comment-main">
                    <p className="project-list-row__comment-bubble">
                      {deleted ? formatDeletedCommentLabel(comment) : comment.content}
                    </p>
                    <span className="project-list-row__comment-byline">
                      <span className="project-list-row__comment-author">{author}</span>
                      <time dateTime={time.iso} title={time.title}>
                        {time.label}
                      </time>
                      {isCommentEdited(comment) ? <span>수정됨</span> : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
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

      {onAddComment ? (
        <CardCommentComposer
          staffName={staffName}
          placeholder={hasComments ? '답글 남기기…' : '댓글 남기기…'}
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
