'use client';

import { useEffect, useState } from 'react';
import { SHIFTS } from '@/lib/constants';
import type { Notice, NoticeInput, NoticeType } from '@/lib/handover/types';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type NoticeModalProps = {
  open: boolean;
  notice: Notice | null;
  defaultType: NoticeType;
  authorLabel: string;
  isManager: boolean;
  onClose: () => void;
  onSave: (input: NoticeInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function NoticeModal({
  open,
  notice,
  defaultType,
  authorLabel,
  isManager,
  onClose,
  onSave,
  onDelete,
}: NoticeModalProps) {
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
    if (notice) {
      setForm({
        type: notice.type,
        content: notice.content,
        author: notice.author,
        is_pinned: notice.is_pinned,
        expires_at: notice.expires_at,
      });
    } else {
      setForm({
        type: defaultType,
        content: '',
        author: authorLabel,
        is_pinned: false,
        expires_at: null,
      });
    }
    setError(null);
  }, [open, notice, defaultType, authorLabel]);

  if (!open) return null;

  const title = notice ? '글 수정' : '글쓰기';

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
      onClose();
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
      message: '이 공지를 삭제합니다.',
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

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

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

            <label className="field field--full">
              <span>내용 *</span>
              <textarea
                rows={6}
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                placeholder={'첫 줄이 목록 제목으로 보입니다.\n\n예) 엘리베이터 3호기 점검 안내\n3월 10일 14:00~16:00 동측 엘리베이터 점검 예정입니다.'}
              />
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

          {error ? <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

          <div className="modal__footer">
            <div className="modal__footer-left">
              {notice && isManager ? (
                <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={saving}>
                  삭제
                </button>
              ) : null}
            </div>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="submit" disabled={saving} className="btn btn--primary">
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
