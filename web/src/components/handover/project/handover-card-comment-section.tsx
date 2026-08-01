'use client';

import { useState } from 'react';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { ImageAnnotateModal } from '@/components/ui/image-annotate-modal';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  formatRelativeTime,
  isCommentDeleted,
  isCommentEdited,
  formatDeletedCommentLabel,
  countActiveCardComments,
  hasActiveCardComments,
} from '@/lib/handover/card-utils';
import type { Card, CardAttachment } from '@/lib/handover/types';
import { CardCommentComposer } from '@/components/handover/card-comment-composer';

type HandoverCardCommentSectionProps = {
  card: Card;
  staffName: string;
  disabled?: boolean;
  /** 없으면 읽기 전용 (보관함처럼 댓글을 더 달 수 없는 곳) */
  onAddComment?: (content: string) => Promise<void>;
  /** 내 댓글 수정 — 없으면 수정 버튼 숨김 */
  onUpdateComment?: (commentId: string, content: string) => Promise<void>;
  /** 내 댓글 삭제 — 없으면 삭제 버튼 숨김 */
  onDeleteComment?: (commentId: string) => Promise<void>;
  /** 사진 그리기 저장 — 없으면 미리보기에 그리기 버튼 숨김 */
  onAnnotateAttachment?: (attachment: CardAttachment, file: File) => Promise<void>;
  onOpenComments?: () => void;
};

export function HandoverCardCommentSection({
  card,
  staffName,
  disabled = false,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onAnnotateAttachment,
  onOpenComments,
}: HandoverCardCommentSectionProps) {
  const { confirm } = useConfirmDialog();
  const comments = [...card.card_comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activeCommentCount = countActiveCardComments(card);
  const hasActiveComments = hasActiveCardComments(card);
  const attachments = card.card_attachments.filter((item) => item.url);
  const [expanded, setExpanded] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const annotateTarget = annotateOpen && previewIndex !== null ? attachments[previewIndex] : null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasComments = comments.length > 0;
  const hiddenCount = comments.length - 1;
  const visibleComments = expanded ? comments : comments.slice(-1);

  if (!hasComments && !attachments.length && !onAddComment) return null;

  async function saveEdit(commentId: string, original: string) {
    if (!onUpdateComment) return;
    const content = draft.trim();
    if (!content || content === original) {
      setEditingId(null);
      return;
    }
    setBusyId(commentId);
    try {
      await onUpdateComment(commentId, content);
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function removeComment(commentId: string) {
    if (!onDeleteComment) return;
    const ok = await confirm({
      title: '댓글 삭제',
      message: '이 댓글을 삭제합니다. 삭제 후에는 내용을 복구할 수 없습니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    setBusyId(commentId);
    try {
      await onDeleteComment(commentId);
    } finally {
      setBusyId(null);
    }
  }

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
              const own = Boolean(staffName) && comment.staff_name === staffName;
              const editing = editingId === comment.id;
              const busy = busyId === comment.id;
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
                    {editing ? (
                      <div className="project-list-row__comment-edit">
                        <textarea
                          className="project-list-row__comment-edit-input"
                          value={draft}
                          rows={3}
                          disabled={busy || disabled}
                          autoFocus
                          onChange={(event) => setDraft(event.target.value)}
                        />
                        <div className="project-list-row__comment-edit-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary btn--small"
                            disabled={busy || !draft.trim()}
                            onClick={() => void saveEdit(comment.id, comment.content)}
                          >
                            {busy ? '저장 중…' : '저장'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="project-list-row__comment-bubble">
                          {deleted ? formatDeletedCommentLabel(comment) : comment.content}
                        </p>
                        <span className="project-list-row__comment-byline">
                          <span className="project-list-row__comment-author">{author}</span>
                          <time dateTime={time.iso} title={time.title}>
                            {time.label}
                          </time>
                          {isCommentEdited(comment) ? <span>수정됨</span> : null}
                          {!deleted && own && onUpdateComment ? (
                            <button
                              type="button"
                              className="project-list-row__comment-action"
                              disabled={busy || disabled}
                              onClick={() => {
                                setDraft(comment.content);
                                setEditingId(comment.id);
                              }}
                            >
                              수정
                            </button>
                          ) : null}
                          {!deleted && own && onDeleteComment ? (
                            <button
                              type="button"
                              className="project-list-row__comment-action project-list-row__comment-action--danger"
                              disabled={busy || disabled}
                              onClick={() => void removeComment(comment.id)}
                            >
                              삭제
                            </button>
                          ) : null}
                        </span>
                      </>
                    )}
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
        onAnnotate={onAnnotateAttachment ? () => setAnnotateOpen(true) : undefined}
      />

      {annotateTarget?.url && onAnnotateAttachment ? (
        <ImageAnnotateModal
          imageUrl={annotateTarget.url}
          filename={annotateTarget.filename ?? undefined}
          onClose={() => setAnnotateOpen(false)}
          onSave={async (file) => {
            await onAnnotateAttachment(annotateTarget, file);
            setAnnotateOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
