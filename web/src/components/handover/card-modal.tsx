'use client';

import { useEffect, useState } from 'react';
import { CATEGORY_OPTIONS, HANDOVER_COLUMNS, PRIORITY_LABELS } from '@/lib/handover/constants';
import { parseDueAt, toDateInputValue, toTimeInputValue } from '@/lib/handover/card-utils';
import { SHIFTS } from '@/lib/constants';
import type { Card, CardAttachment, CardInput, ColumnId, Priority } from '@/lib/handover/types';
import { formatTime } from '@/lib/handover/card-utils';
import { useCardTemplates, type CardTemplate } from '@/lib/settings/use-settings';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { TemplateBar } from './template-bar';

type CardModalProps = {
  open: boolean;
  card: Card | null;
  authorLabel: string;
  defaultShift: string;
  defaultName: string;
  staffNames: string[];
  isManager: boolean;
  onClose: () => void;
  onSave: (input: CardInput, id?: string, options?: { pendingFiles?: File[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddComment?: (cardId: string, content: string) => Promise<void>;
  onUploadAttachment?: (cardId: string, file: File) => Promise<void>;
  onDeleteAttachment?: (attachment: CardAttachment) => Promise<void>;
  requireSession?: (action: string) => boolean;
};

const emptyForm = (): CardInput => ({
  column_id: 'urgent',
  priority: 'urgent',
  category: '기타',
  room: '',
  title: '',
  details: '',
  resolution: '',
  next_action: '',
  author: '',
  assignee_shift: '',
  assignee_name: '',
  due_at: null,
});

export function CardModal({
  open,
  card,
  authorLabel,
  defaultShift,
  defaultName,
  staffNames,
  isManager,
  onClose,
  onSave,
  onDelete,
  onAddComment,
  onUploadAttachment,
  onDeleteAttachment,
  requireSession,
}: CardModalProps) {
  const [form, setForm] = useState<CardInput>(emptyForm);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: templates = [] } = useCardTemplates();
  const { confirm } = useConfirmDialog();

  function applyTemplate(template: CardTemplate) {
    setForm((prev) => ({
      ...prev,
      priority: template.priority,
      column_id: template.column_id,
      category: template.category,
      title: template.title || prev.title,
      next_action: template.next_action,
      details: template.details,
    }));
  }

  const isDrawer = Boolean(card);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isDrawer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isDrawer]);

  useEffect(() => {
    if (!open) return;
    if (card) {
      setForm({
        column_id: card.column_id,
        priority: card.priority,
        category: card.category,
        room: card.room,
        title: card.title,
        details: card.details,
        resolution: card.resolution,
        next_action: card.next_action,
        author: card.author,
        assignee_shift: card.assignee_shift,
        assignee_name: card.assignee_name,
        due_at: card.due_at,
      });
      setDueDate(card.due_at ? toDateInputValue(card.due_at) : '');
      setDueTime(card.due_at ? toTimeInputValue(card.due_at) : '');
    } else {
      setForm({
        ...emptyForm(),
        author: authorLabel,
        assignee_shift: defaultShift,
        assignee_name: defaultName,
      });
      setDueDate('');
      setDueTime('');
    }
    setError(null);
    setCommentInput('');
    setPendingFiles([]);
    setPendingPreviewUrls((urls) => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }, [open, card, authorLabel, defaultShift, defaultName]);

  if (!open) return null;

  async function submitComment() {
    if (!card || !onAddComment) return;
    if (requireSession && !requireSession('댓글')) return;
    const content = commentInput.trim();
    if (!content) return;
    setCommentLoading(true);
    setError(null);
    try {
      await onAddComment(card.id, content);
      setCommentInput('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '댓글 등록에 실패했습니다.');
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (form.column_id === 'done' && !form.resolution.trim()) {
      setError('완료 칸으로 저장하려면 처리 결과를 입력해 주세요.');
      return;
    }

    const dueAt = parseDueAt(dueDate, dueTime);
    if ((dueDate.trim() || dueTime.trim()) && !dueAt) {
      setError('마감 날짜·시간 형식이 올바르지 않습니다.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          ...form,
          room: form.room.trim(),
          title: form.title.trim(),
          details: form.details.trim(),
          resolution: form.resolution.trim(),
          next_action: form.next_action.trim(),
          author: form.author.trim() || authorLabel,
          assignee_name: form.assignee_name.trim(),
          due_at: dueAt,
        },
        card?.id,
        card ? undefined : { pendingFiles },
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!card || !isManager) return;
    const ok = await confirm({
      title: '인수인계 삭제',
      message: '이 인수인계를 삭제합니다.',
      detail: '삭제하면 복구할 수 없습니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete(card.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const savedAttachmentCount = card?.card_attachments.length ?? 0;
  const totalAttachmentCount = savedAttachmentCount + pendingFiles.length;
  const canAddAttachment = totalAttachmentCount < 2 && onUploadAttachment;

  function addPendingFile(file: File) {
    if (totalAttachmentCount >= 2) {
      setError('사진은 카드당 최대 2장까지 등록할 수 있습니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 등록할 수 있습니다.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('이미지는 2MB 이하만 등록할 수 있습니다.');
      return;
    }
    setError(null);
    setPendingFiles((prev) => [...prev, file]);
    setPendingPreviewUrls((prev) => [...prev, URL.createObjectURL(file)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviewUrls((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  }

  async function handleAttachmentPick(file: File) {
    if (requireSession && !requireSession('사진 첨부')) return;
    if (card) {
      setAttachmentLoading(true);
      setError(null);
      try {
        await onUploadAttachment!(card.id, file);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '첨부에 실패했습니다.');
      } finally {
        setAttachmentLoading(false);
      }
      return;
    }
    addPendingFile(file);
  }

  const panelTitle = card ? '인수인계 수정' : '새 인수인계';

  const formFields = (
    <>
          {!card ? <TemplateBar templates={templates} onApply={applyTemplate} /> : null}

          <div className="form-grid">
            <label className="field">
              <span>우선순위</span>
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>칸</span>
              <select
                value={form.column_id}
                onChange={(event) => setForm({ ...form, column_id: event.target.value as ColumnId })}
              >
                {HANDOVER_COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>카테고리</span>
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>객실</span>
              <input
                value={form.room}
                onChange={(event) => setForm({ ...form, room: event.target.value })}
                placeholder="예: 1205"
              />
            </label>
            <label className="field field--full">
              <span>제목 *</span>
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="field field--full">
              <span>상세</span>
              <textarea
                rows={3}
                value={form.details}
                onChange={(event) => setForm({ ...form, details: event.target.value })}
              />
            </label>
            {form.column_id === 'done' ? (
              <label className="field field--full">
                <span>처리 결과 *</span>
                <textarea
                  rows={2}
                  value={form.resolution}
                  onChange={(event) => setForm({ ...form, resolution: event.target.value })}
                />
              </label>
            ) : null}
            <label className="field field--full">
              <span>다음 조치</span>
              <input
                value={form.next_action}
                onChange={(event) => setForm({ ...form, next_action: event.target.value })}
              />
            </label>
            <label className="field">
              <span>담당 교대</span>
              <select
                value={form.assignee_shift}
                onChange={(event) => setForm({ ...form, assignee_shift: event.target.value })}
              >
                <option value="">선택</option>
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>담당자</span>
              <select
                value={form.assignee_name}
                onChange={(event) => setForm({ ...form, assignee_name: event.target.value })}
              >
                <option value="">선택</option>
                {staffNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field field--full">
              <span>마감 (선택)</span>
              <div className="form-grid" style={{ marginTop: '0.35rem' }}>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                />
              </div>
              <p className="card-extra__hint">날짜만 넣으면 23:59로 저장됩니다.</p>
            </div>
          </div>

          <div className="card-extra">
            {card ? (
              <div className="card-extra__block">
                <div className="card-extra__header">
                  <span>댓글</span>
                  <span className="card-extra__hint">본문 수정 없이 경과만 남깁니다</span>
                </div>
                {card.card_comments.length ? (
                  [...card.card_comments]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((comment) => (
                      <div key={comment.id} className="card-comment">
                        <p className="card-comment__content">{comment.content}</p>
                        <p className="card-comment__meta">
                          {comment.shift} · {comment.staff_name} · {formatTime(comment.created_at)}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="card-extra__empty">아직 댓글이 없습니다.</p>
                )}
                <div className="card-comment-form">
                  <input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="예: 23:40 엔지니어링 도착"
                    onKeyDown={async (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        await submitComment();
                      }
                    }}
                  />
                  <button type="button" disabled={commentLoading} onClick={submitComment} className="btn btn--ghost btn--small">
                    등록
                  </button>
                </div>
              </div>
            ) : null}

            <div className="card-extra__block">
              <div className="card-extra__header">
                <span>사진 첨부</span>
                <span className="card-extra__hint">최대 2장 · 2MB 이하</span>
              </div>
              <div className="card-attachments">
                {card?.card_attachments.map((attachment) => (
                  <div key={attachment.id} className="card-attachment">
                    {attachment.url ? (
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={attachment.url} alt={attachment.filename} />
                      </a>
                    ) : null}
                    {onDeleteAttachment ? (
                      <button
                        type="button"
                        onClick={() => onDeleteAttachment(attachment)}
                        className="card-attachment__delete"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                ))}
                {pendingPreviewUrls.map((url, index) => (
                  <div key={url} className="card-attachment">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={pendingFiles[index]?.name ?? '첨부 예정'} />
                    <button type="button" onClick={() => removePendingFile(index)} className="card-attachment__delete">
                      제거
                    </button>
                  </div>
                ))}
              </div>
              {canAddAttachment ? (
                <label className="card-upload-btn">
                  + 사진 추가
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={attachmentLoading || saving}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      await handleAttachmentPick(file);
                    }}
                  />
                </label>
              ) : null}
              {!card && pendingFiles.length > 0 ? (
                <p className="card-extra__hint">저장하면 선택한 사진이 함께 등록됩니다.</p>
              ) : null}
            </div>
          </div>

          <label className="field field--full">
            <span>작성자</span>
            <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
          </label>

          {error ? <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
    </>
  );

  const formFooter = (
    <div className="modal__footer">
      <div className="modal__footer-left">
        {card && isManager ? (
          <button type="button" onClick={handleDelete} disabled={saving} className="btn btn--danger">
            삭제
          </button>
        ) : null}
      </div>
      <div className="modal__footer-right">
        <button type="button" onClick={onClose} className="btn btn--ghost">
          취소
        </button>
        <button type="submit" disabled={saving} className="btn btn--primary">
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );

  if (isDrawer) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <aside
          className="drawer-panel"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-panel-title"
        >
          <form noValidate onSubmit={handleSubmit} className="drawer-panel__form">
            <div className="drawer-panel__header modal__header">
              <div>
                <h2 id="card-panel-title">{panelTitle}</h2>
                {card?.room ? <p className="drawer-panel__subtitle">객실 {card.room}</p> : null}
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="drawer-panel__body">{formFields}</div>
            {formFooter}
          </form>
        </aside>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2 id="card-panel-title">{panelTitle}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
          {formFields}
          {formFooter}
        </form>
      </div>
    </div>
  );
}
