'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CARD_COLUMN_OPTIONS,
  CATEGORY_OPTIONS,
  COLUMN_LABELS,
  HANDOVER_COLUMNS,
  PRIORITY_HINTS,
  PRIORITY_LABELS,
} from '@/lib/handover/constants';
import {
  cardFormSnapshotsEqual,
  clearCardCreateDraft,
  hasCardDraftContent,
  loadCardCreateDraft,
  saveCardCreateDraft,
  type CardFormSnapshot,
} from '@/lib/handover/card-draft';
import { parseDueAt, toDateInputValue, toTimeInputValue } from '@/lib/handover/card-utils';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import type { Card, CardAttachment, CardInput, ColumnId, Priority } from '@/lib/handover/types';
import type { Todo } from '@/lib/todos/types';
import { useCardTemplates, type CardTemplate } from '@/lib/settings/use-settings';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CardCommentComposer } from './card-comment-composer';
import { CardCommentItem } from './card-comment-item';
import { RoutineTemplateBar } from './routine-template-bar';
import { TemplateBar } from './template-bar';

type CardModalView = 'full' | 'comments';

type CardModalProps = {
  open: boolean;
  card: Card | null;
  view?: CardModalView;
  createDraft?: CardInput | null;
  linkedTodo?: Todo | null;
  authorLabel: string;
  defaultShift: string;
  defaultName: string;
  staffNames: string[];
  isManager: boolean;
  onClose: () => void;
  onSave: (input: CardInput, id?: string, options?: { pendingFiles?: File[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddComment?: (cardId: string, content: string) => Promise<void>;
  onUpdateComment?: (cardId: string, commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (cardId: string, commentId: string) => Promise<void>;
  onUploadAttachment?: (cardId: string, file: File) => Promise<void>;
  onDeleteAttachment?: (attachment: CardAttachment) => Promise<void>;
  onCreateTodo?: () => void | Promise<void>;
  onSwitchToFull?: () => void;
  requireSession?: (action: string) => boolean;
};

const emptyForm = (): CardInput => ({
  column_id: 'progress',
  priority: 'today',
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
  view = 'full',
  createDraft,
  linkedTodo,
  authorLabel,
  defaultShift,
  defaultName,
  staffNames,
  isManager,
  onClose,
  onSave,
  onDelete,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onUploadAttachment,
  onDeleteAttachment,
  onCreateTodo,
  onSwitchToFull,
  requireSession,
}: CardModalProps) {
  const [form, setForm] = useState<CardInput>(emptyForm);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const initialSnapshotRef = useRef<CardFormSnapshot | null>(null);
  const overlayPointerDownRef = useRef(false);
  const { data: templates = [] } = useCardTemplates();
  const { confirm } = useConfirmDialog();

  const isDirty = useCallback(() => {
    if (!initialSnapshotRef.current) return false;
    return !cardFormSnapshotsEqual(initialSnapshotRef.current, { form, dueDate, dueTime });
  }, [form, dueDate, dueTime]);

  const requestClose = useCallback(async () => {
    if (isDirty()) {
      const ok = await confirm({
        title: '작성 중인 내용',
        message: '저장하지 않고 닫으면 입력한 내용이 사라집니다.',
        detail: '브라우저에 임시 저장된 새 글은 다음에 「인수인계 추가」를 열면 다시 불러올 수 있습니다.',
        tone: 'warning',
        confirmLabel: '닫기',
        cancelLabel: '계속 작성',
      });
      if (!ok) return;
      if (!card && hasCardDraftContent(form)) {
        saveCardCreateDraft({
          form,
          dueDate,
          dueTime,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    onClose();
  }, [isDirty, confirm, onClose, card, form, dueDate, dueTime]);

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

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') void requestClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, requestClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraftRestored(false);

    let nextForm: CardInput;
    let nextDueDate = '';
    let nextDueTime = '';

    if (card) {
      nextForm = {
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
      };
      nextDueDate = card.due_at ? toDateInputValue(card.due_at) : '';
      nextDueTime = card.due_at ? toTimeInputValue(card.due_at) : '';
    } else if (createDraft) {
      const base = createDraft;
      nextForm = {
        ...base,
        author: base.author || authorLabel,
        assignee_shift: base.assignee_shift || defaultShift,
        assignee_name: base.assignee_name || defaultName,
      };
      nextDueDate = base.due_at ? toDateInputValue(base.due_at) : '';
      nextDueTime = base.due_at ? toTimeInputValue(base.due_at) : '';
    } else {
      const stored = loadCardCreateDraft();
      if (stored && hasCardDraftContent(stored.form)) {
        nextForm = {
          ...stored.form,
          author: stored.form.author || authorLabel,
          assignee_shift: stored.form.assignee_shift || defaultShift,
          assignee_name: stored.form.assignee_name || defaultName,
        };
        nextDueDate = stored.dueDate;
        nextDueTime = stored.dueTime;
        setDraftRestored(true);
      } else {
        const base = emptyForm();
        nextForm = {
          ...base,
          author: authorLabel,
          assignee_shift: defaultShift,
          assignee_name: defaultName,
        };
      }
    }

    setForm(nextForm);
    setDueDate(nextDueDate);
    setDueTime(nextDueTime);
    initialSnapshotRef.current = { form: nextForm, dueDate: nextDueDate, dueTime: nextDueTime };
    setError(null);
    setPendingFiles([]);
    setPendingPreviewUrls((urls) => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }, [open, card, createDraft, authorLabel, defaultShift, defaultName]);

  useEffect(() => {
    if (!open || card) return;
    if (!hasCardDraftContent(form)) return;
    const timer = window.setTimeout(() => {
      saveCardCreateDraft({
        form,
        dueDate,
        dueTime,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, card, form, dueDate, dueTime]);

  if (!open) return null;

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
      if (!card) clearCardCreateDraft();
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

  const commentsOnly = view === 'comments' && !!card;
  const panelTitle = commentsOnly ? '댓글' : card ? '인수인계 수정' : '새 인수인계';

  const statusFields = (
    <div className="form-grid form-grid--compact">
      <label className="field">
        <span>우선순위</span>
        <select
          value={form.priority}
          onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}
          aria-describedby="card-priority-hint"
        >
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span id="card-priority-hint" className="field-hint">
          {PRIORITY_HINTS[form.priority]}
        </span>
      </label>
      <label className="field">
        <span>칸</span>
        <select
          value={form.column_id}
          onChange={(event) => setForm({ ...form, column_id: event.target.value as ColumnId })}
          aria-describedby="card-column-hint"
        >
          {CARD_COLUMN_OPTIONS.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
        <span id="card-column-hint" className="field-hint">
          {HANDOVER_COLUMNS.find((column) => column.id === form.column_id)?.hint}
        </span>
      </label>
      <label className="field">
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
    </div>
  );

  const contentFields = (
    <>
      <label className="field field--prominent">
        <span>제목 *</span>
        <input
          required
          className="field-input--title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </label>
      <label className="field">
        <span>상세</span>
        <textarea
          rows={5}
          className="field-textarea--body"
          value={form.details}
          onChange={(event) => setForm({ ...form, details: event.target.value })}
          placeholder="상황·배경을 구체적으로 적어 주세요"
        />
      </label>
      {form.column_id === 'done' ? (
        <label className="field">
          <span>처리 결과 *</span>
          <textarea
            rows={3}
            value={form.resolution}
            onChange={(event) => setForm({ ...form, resolution: event.target.value })}
            placeholder="어떻게 처리했는지"
          />
        </label>
      ) : null}
      <label className="field">
        <span>다음 조치</span>
        <input
          value={form.next_action}
          onChange={(event) => setForm({ ...form, next_action: event.target.value })}
          placeholder="다음 교대가 할 일"
        />
      </label>
    </>
  );

  const assigneeFields = (
    <div className="form-grid form-grid--compact">
      <label className="field">
        <span>담당 조</span>
        <select
          value={form.assignee_shift}
          onChange={(event) => setForm({ ...form, assignee_shift: event.target.value })}
        >
          <option value="">선택</option>
          {WORK_GROUPS.map((group) => (
            <option key={group} value={group}>
              {formatWorkGroupLabel(group)}
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
        <div className="form-grid form-grid--compact" style={{ marginTop: '0.35rem' }}>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
        </div>
        <p className="card-extra__hint">날짜만 넣으면 23:59로 저장됩니다.</p>
      </div>
      <label className="field field--full">
        <span>작성자</span>
        <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
      </label>
    </div>
  );

  const commentBlock = card ? (
    <section className="drawer-section">
      <h3 className="drawer-section__title">댓글</h3>
      <p className="drawer-section__hint">본문 수정 없이 경과만 남깁니다</p>
      {card.card_comments.length ? (
        <div className="card-comment-list">
          {[...card.card_comments]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((comment) => (
              <CardCommentItem
                key={comment.id}
                comment={comment}
                canManage={isManager || comment.staff_name === defaultName}
                disabled={commentLoading}
                onUpdate={async (content) => {
                  if (!onUpdateComment) return;
                  await onUpdateComment(card.id, comment.id, content);
                }}
                onDelete={async () => {
                  if (!onDeleteComment) return;
                  await onDeleteComment(card.id, comment.id);
                }}
              />
            ))}
        </div>
      ) : null}
      {onAddComment ? (
        <CardCommentComposer
          staffName={defaultName}
          placeholder="댓글을 입력하세요…"
          disabled={commentLoading}
          onSubmit={async (content) => {
            if (!card) return;
            if (requireSession && !requireSession('댓글')) return;
            setCommentLoading(true);
            setError(null);
            try {
              await onAddComment(card.id, content);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : '댓글 등록에 실패했습니다.');
              throw caught;
            } finally {
              setCommentLoading(false);
            }
          }}
        />
      ) : null}
    </section>
  ) : null;

  const attachmentBlock = (
    <section className="drawer-section">
      <h3 className="drawer-section__title">사진 첨부</h3>
      <p className="drawer-section__hint">최대 2장 · 2MB 이하</p>
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
              <button type="button" onClick={() => onDeleteAttachment(attachment)} className="card-attachment__delete">
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
    </section>
  );

  const linkBlock = card ? (
    <section className="drawer-section">
      <h3 className="drawer-section__title">연동</h3>
      {linkedTodo ? (
        <p className="drawer-section__hint">
          연결된 할일:{' '}
          <Link href="/todos" className="drawer-link">
            {linkedTodo.title}
          </Link>
        </p>
      ) : onCreateTodo ? (
        <button type="button" className="btn btn--ghost btn--small" onClick={() => void onCreateTodo()}>
          할일로 등록
        </button>
      ) : null}
    </section>
  ) : null;

  const drawerFormFields = (
    <>
      <section className="drawer-section">
        <h3 className="drawer-section__title">상태</h3>
        {statusFields}
      </section>
      <section className="drawer-section drawer-section--primary">
        <h3 className="drawer-section__title">내용</h3>
        {contentFields}
      </section>
      <section className="drawer-section">
        <h3 className="drawer-section__title">담당 · 마감</h3>
        {assigneeFields}
      </section>
      {commentBlock}
      {attachmentBlock}
      {linkBlock}
      {error ? <p className="amenity-alert drawer-section__error">{error}</p> : null}
    </>
  );

  const generalTemplates = templates.filter((t) => !(t.work_group || '').trim());
  const createDrawerFields = (
    <>
      {defaultShift ? (
        <section className="drawer-section drawer-section--flush">
          <RoutineTemplateBar workGroup={defaultShift} templates={templates} onApply={applyTemplate} />
        </section>
      ) : null}
      {generalTemplates.length ? (
        <section className="drawer-section drawer-section--flush">
          <TemplateBar templates={generalTemplates} onApply={applyTemplate} />
        </section>
      ) : null}
      <section className="drawer-section">
        <h3 className="drawer-section__title">상태</h3>
        {statusFields}
      </section>
      <section className="drawer-section drawer-section--primary">
        <h3 className="drawer-section__title">내용</h3>
        {contentFields}
      </section>
      <section className="drawer-section">
        <h3 className="drawer-section__title">담당 · 마감</h3>
        {assigneeFields}
      </section>
      {attachmentBlock}
      {error ? <p className="amenity-alert drawer-section__error">{error}</p> : null}
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
        <button type="button" onClick={() => void requestClose()} className="btn btn--ghost">
          취소
        </button>
        <button type="submit" disabled={saving} className="btn btn--primary">
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );

  const commentsFooter = (
    <div className="modal__footer">
      <div className="modal__footer-left">
        {onSwitchToFull ? (
          <button type="button" onClick={onSwitchToFull} className="btn btn--ghost btn--small">
            인수인계 전체
          </button>
        ) : null}
      </div>
      <div className="modal__footer-right">
        <button type="button" onClick={() => void requestClose()} className="btn btn--primary">
          닫기
        </button>
      </div>
    </div>
  );

  const panelBody = commentsOnly ? (
    <>
      {commentBlock}
      {error ? <p className="amenity-alert drawer-section__error">{error}</p> : null}
    </>
  ) : card ? (
    drawerFormFields
  ) : (
    createDrawerFields
  );

  const panelHeader = (
    <div className="drawer-panel__header modal__header">
      <div className="drawer-panel__heading">
        {card ? (
          <>
            {!commentsOnly ? (
              <div className="drawer-panel__chips">
                <span className="drawer-chip">{PRIORITY_LABELS[form.priority]}</span>
                <span className="drawer-chip">{COLUMN_LABELS[form.column_id]}</span>
                {form.room ? <span className="drawer-chip drawer-chip--room">객실 {form.room}</span> : null}
              </div>
            ) : null}
            <h2 id="card-panel-title" className="drawer-panel__title">
              {form.title.trim() || '제목 없음'}
            </h2>
            <p className="drawer-panel__mode">{panelTitle}</p>
          </>
        ) : (
          <>
            <h2 id="card-panel-title" className="drawer-panel__title">
              {panelTitle}
            </h2>
            <p className="drawer-panel__mode">
              {createDraft ? '게시판 글에서 불러왔습니다' : '인수인계 항목을 등록합니다'}
            </p>
          </>
        )}
      </div>
      <button type="button" className="icon-btn" onClick={() => void requestClose()} aria-label="닫기">
        ✕
      </button>
    </div>
  );

  return (
    <div
      className="drawer-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) overlayPointerDownRef.current = true;
      }}
      onPointerUp={(event) => {
        if (event.target === event.currentTarget && overlayPointerDownRef.current) {
          void requestClose();
        }
        overlayPointerDownRef.current = false;
      }}
    >
      <aside
        className={`drawer-panel drawer-panel--card${commentsOnly ? ' drawer-panel--comments' : ''}`}
        onPointerDown={() => {
          overlayPointerDownRef.current = false;
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-panel-title"
      >
        {commentsOnly ? (
          <div className="drawer-panel__form">
            {panelHeader}
            <div className="drawer-panel__body">{panelBody}</div>
            {commentsFooter}
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="drawer-panel__form">
            {panelHeader}
            {draftRestored ? (
              <p className="card-draft-notice" role="status">
                이전에 작성하던 내용을 불러왔습니다. 저장하면 임시 저장본이 지워집니다.
              </p>
            ) : null}
            <div className="drawer-panel__body">{panelBody}</div>
            {formFooter}
          </form>
        )}
      </aside>
    </div>
  );
}
