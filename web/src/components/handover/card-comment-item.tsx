'use client';

import { useState } from 'react';
import { formatTime, isCommentEdited } from '@/lib/handover/card-utils';
import type { CardComment } from '@/lib/handover/types';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type CardCommentItemProps = {
  comment: CardComment;
  canManage: boolean;
  disabled?: boolean;
  onUpdate: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function CardCommentItem({
  comment,
  canManage,
  disabled = false,
  onUpdate,
  onDelete,
}: CardCommentItemProps) {
  const { confirm } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [loading, setLoading] = useState(false);

  async function saveEdit() {
    const content = draft.trim();
    if (!content || content === comment.content) {
      setEditing(false);
      setDraft(comment.content);
      return;
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
    const ok = await confirm({
      title: '댓글 삭제',
      message: '이 댓글을 삭제합니다.',
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

  const edited = isCommentEdited(comment);

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
          <p className="card-comment__content">{comment.content}</p>
          <div className="card-comment__foot">
            <p className="card-comment__meta">
              {comment.shift} · {comment.staff_name} · {formatTime(comment.created_at)}
              {edited ? <span className="card-comment__edited">수정됨</span> : null}
            </p>
            {canManage ? (
              <div className="card-comment__actions">
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
                <button
                  type="button"
                  className="card-comment__action card-comment__action--danger"
                  onClick={() => void handleDelete()}
                  disabled={loading || disabled}
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
