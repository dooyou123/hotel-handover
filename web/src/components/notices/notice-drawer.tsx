'use client';

import { useEffect, useState } from 'react';
import { SHIFTS } from '@/lib/constants';
import { formatTime } from '@/lib/handover/card-utils';
import { noticeListTitle, noticeTypeLabel } from '@/lib/handover/notice-utils';
import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import type { Notice, NoticeInput, NoticeType } from '@/lib/handover/types';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export type NoticeDrawerMode = 'read' | 'edit' | 'create';

type NoticeDrawerProps = {
  open: boolean;
  mode: NoticeDrawerMode;
  notice: Notice | null;
  defaultType: NoticeType;
  authorLabel: string;
  isManager: boolean;
  onClose: () => void;
  onModeChange: (mode: NoticeDrawerMode) => void;
  onSave: (input: NoticeInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePin?: (notice: Notice) => Promise<void>;
};

export function NoticeDrawer({
  open,
  mode,
  notice,
  defaultType,
  authorLabel,
  isManager,
  onClose,
  onModeChange,
  onSave,
  onDelete,
  onTogglePin,
}: NoticeDrawerProps) {
  const [form, setForm] = useState<NoticeInput>({
    type: defaultType,
    content: '',
    author: '',
    is_pinned: false,
    expires_at: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
    if (mode === 'read' && notice) return;
    if (notice && mode === 'edit') {
      setForm({
        type: notice.type,
        content: notice.content,
        author: notice.author,
        is_pinned: notice.is_pinned,
        expires_at: notice.expires_at,
      });
    } else if (mode === 'create') {
      setForm({
        type: defaultType,
        content: '',
        author: authorLabel,
        is_pinned: false,
        expires_at: null,
      });
    }
    setError(null);
  }, [open, mode, notice, defaultType, authorLabel]);

  if (!open) return null;

  const isForm = mode === 'edit' || mode === 'create';
  const title =
    mode === 'create' ? '글쓰기' : mode === 'edit' ? '글 수정' : noticeListTitle(notice?.content ?? '');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.content.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, content: form.content.trim(), author: form.author.trim() || authorLabel }, notice?.id);
      if (mode === 'edit') onModeChange('read');
      else onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!notice || !isManager) return;
    const ok = await confirm({
      title: notice.type === 'change' ? '업무 변경 삭제' : '업무 공지 삭제',
      message: '이 글을 삭제합니다.',
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete(notice.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const readBody = notice ? (
    <>
      <div className="drawer-panel__chips">
        <span className={`drawer-chip drawer-chip--notice-${notice.type}`}>{noticeTypeLabel(notice.type)}</span>
        {notice.is_pinned ? <span className="drawer-chip">📌 고정</span> : null}
        {formatExpiryLabel(notice.expires_at) ? (
          <span
            className={`drawer-chip${
              formatExpiryLabel(notice.expires_at)?.soon ? ' drawer-chip--warn' : ''
            }`}
          >
            {formatExpiryLabel(notice.expires_at)?.text}
          </span>
        ) : null}
      </div>
      <div className="notice-drawer__meta">
        <span>{notice.author || '작성자 미입력'}</span>
        <time dateTime={notice.updated_at || notice.created_at}>
          {formatTime(notice.updated_at || notice.created_at)}
        </time>
      </div>
      <div className="notice-drawer__body">{notice.content}</div>
    </>
  ) : null;

  const formBody = (
    <>
      <section className="drawer-section">
        <h3 className="drawer-section__title">분류 · 작성</h3>
        <div className="form-grid">
          <label className="field">
            <span>분류</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as Notice['type'] })}
            >
              <option value="announcement">업무 공지</option>
              <option value="change">업무 변경</option>
            </select>
          </label>
          <label className="field">
            <span>작성자 / 교대</span>
            <select value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })}>
              <option value="">선택</option>
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
              <option value="관리자">관리자</option>
            </select>
          </label>
          <label className="field field--full">
            <span>내용 *</span>
            <textarea
              rows={10}
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder={'첫 줄이 목록 제목으로 보입니다.\n\n예) VIP 1502 체크인 안내\n내용을 이어서 작성하세요.'}
            />
          </label>
          <label className="field">
            <span>유효기간</span>
            <input
              type="date"
              value={form.expires_at ?? ''}
              onChange={(event) => setForm({ ...form, expires_at: event.target.value || null })}
            />
          </label>
          <label className="field field--checkbox field--full">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(event) => setForm({ ...form, is_pinned: event.target.checked })}
            />
            <span>📌 상단 고정</span>
          </label>
        </div>
      </section>
      {error ? <p className="amenity-alert drawer-section__error">{error}</p> : null}
    </>
  );

  const readFooter = (
    <div className="modal__footer">
      <div className="modal__footer-left">
        {notice && isManager ? (
          <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={saving}>
            삭제
          </button>
        ) : null}
      </div>
      <div className="modal__footer-right">
        {notice && onTogglePin ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => notice && void onTogglePin(notice)}
          >
            {notice?.is_pinned ? '고정 해제' : '고정'}
          </button>
        ) : null}
        {notice ? (
          <button type="button" className="btn btn--ghost" onClick={() => onModeChange('edit')}>
            수정
          </button>
        ) : null}
        <button type="button" className="btn btn--primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );

  const formFooter = (
    <div className="modal__footer">
      <div className="modal__footer-left">
        {notice && isManager && mode === 'edit' ? (
          <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={saving}>
            삭제
          </button>
        ) : null}
      </div>
      <div className="modal__footer-right">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            if (mode === 'edit' && notice) onModeChange('read');
            else onClose();
          }}
        >
          취소
        </button>
        <button type="submit" disabled={saving} className="btn btn--primary">
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel drawer-panel--notice"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-drawer-title"
      >
        {isForm ? (
          <form noValidate onSubmit={handleSubmit} className="drawer-panel__form">
            <div className="drawer-panel__header modal__header">
              <div className="drawer-panel__heading">
                <h2 id="notice-drawer-title" className="drawer-panel__title">
                  {title}
                </h2>
                <p className="drawer-panel__mode">{mode === 'create' ? '새 글 작성' : '내용 수정'}</p>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="drawer-panel__body">{formBody}</div>
            {formFooter}
          </form>
        ) : (
          <div className="drawer-panel__form">
            <div className="drawer-panel__header modal__header">
              <div className="drawer-panel__heading">
                <h2 id="notice-drawer-title" className="drawer-panel__title">
                  {title}
                </h2>
                <p className="drawer-panel__mode">게시글 상세</p>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="drawer-panel__body">{readBody}</div>
            {readFooter}
          </div>
        )}
      </aside>
    </div>
  );
}
