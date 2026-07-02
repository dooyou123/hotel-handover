'use client';

import { useState } from 'react';
import {
  formatCommentActorLabel,
  formatDeletedCommentLabel,
  formatEditedCommentLabel,
  formatTime,
  isCommentDeleted,
  isCommentEdited,
} from '@/lib/handover/card-utils';
import type { CardComment } from '@/lib/handover/types';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { LinkifiedText } from '@/components/ui/linkified-text';

type CardCommentItemProps = {
  comment: CardComment;
  currentStaffName: string;
  canManage: boolean;
  disabled?: boolean;
  onUpdate: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

function isOwnComment(comment: CardComment, staffName: string): boolean {
  return Boolean(staffName) && comment.staff_name === staffName;
}

export function CardCommentItem({
  comment,
  currentStaffName,
  canManage,
  disabled = false,
  onUpdate,
  onDelete,
}: CardCommentItemProps) {
  const { confirm } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const deleted = isCommentDeleted(comment);
  const own = isOwnComment(comment, currentStaffName);

  async function saveEdit() {
    const content = draft.trim();
    if (!content || content === comment.content) {
      setEditing(false);
      setDraft(comment.content);
      return;
    }

    if (!own) {
      const ok = await confirm({
        title: '다른 사람 댓글 수정',
        message: `${formatCommentActorLabel(comment.shift, comment.staff_name)}님이 작성한 댓글을 수정합니다.`,
        detail: `「${comment.content.slice(0, 120)}${comment.content.length > 120 ? '…' : ''}」\n\n변경 내용은 활동 기록에 남습니다.`,
        tone: 'warning',
        confirmLabel: '수정 계속',
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      await onUpdate(content);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!own) return;

    const ok = await confirm({
      title: '댓글 삭제',
      message: '이 댓글을 삭제합니다. 삭제 후에는 내용을 복구할 수 없습니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setDraft(comment.content);
    setEditing(false);
  }

  async function copyCommentText() {
    if (deleted) return;
    try {
      await navigator.clipboard.writeText(comment.content);
    } catch {
      // ignore
    }
  }

  const edited = isCommentEdited(comment);

  if (deleted) {
    return (
      <article className="card-comment card-comment--deleted">
        <p className="card-comment__content card-comment__content--deleted">{formatDeletedCommentLabel(comment)}</p>
        <div className="card-comment__foot">
          <p className="card-comment__meta">
            <span className="card-comment__meta-author">
              {formatCommentActorLabel(comment.shift, comment.staff_name)}
            </span>
            <time className="card-comment__meta-time" dateTime={comment.created_at}>
              {formatTime(comment.created_at)}
            </time>
            {comment.deleted_at ? (
              <time className="card-comment__meta-time" dateTime={comment.deleted_at}>
                · 삭제 {formatTime(comment.deleted_at)}
              </time>
            ) : null}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card-comment">
      {editing ? (
        <div className="card-comment__edit">
          <textarea
            className="card-comment__edit-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            disabled={loading || disabled}
            autoFocus
          />
          <div className="card-comment__edit-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={cancelEdit} disabled={loading}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => void saveEdit()}
              disabled={loading || !draft.trim()}
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="card-comment__content">
            <LinkifiedText text={comment.content} as="span" />
          </p>
            <div className="card-comment__foot">
            <p className="card-comment__meta">
              <span className="card-comment__meta-author">
                {formatCommentActorLabel(comment.shift, comment.staff_name)}
              </span>
              <time className="card-comment__meta-time" dateTime={comment.created_at}>
                {formatTime(comment.created_at)}
              </time>
              {edited ? <span className="card-comment__edited">{formatEditedCommentLabel(comment)}</span> : null}
            </p>
            <div className="card-comment__actions">
              <button
                type="button"
                className="card-comment__action"
                onClick={() => void copyCommentText()}
                disabled={loading || disabled}
              >
                복사
              </button>
              {canManage ? (
                <button
                  type="button"
                  className="card-comment__action"
                  onClick={() => {
                    setDraft(comment.content);
                    setEditing(true);
                  }}
                  disabled={loading || disabled}
                >
                  수정
                </button>
              ) : null}
              {canManage && own ? (
                <button
                  type="button"
                  className="card-comment__action card-comment__action--danger"
                  onClick={() => void handleDelete()}
                  disabled={loading || disabled}
                >
                  삭제
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </article>
  );
}
