'use client';

import { useEffect, useState } from 'react';
import { SOP_CATEGORIES, type SopArticle, type SopArticleInput, type SopCategory } from '@/lib/sop/types';
import { formatKeywordsInput, parseKeywordsInput } from '@/lib/sop/search';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type SopArticleModalProps = {
  open: boolean;
  article: SopArticle | null;
  authorName: string;
  onClose: () => void;
  onSave: (input: SopArticleInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export function SopArticleModal({
  open,
  article,
  authorName,
  onClose,
  onSave,
  onDelete,
}: SopArticleModalProps) {
  const [form, setForm] = useState<SopArticleInput>({
    title: '',
    body: '',
    category: '일반',
    keywords: [],
    is_pinned: false,
    sort_order: 0,
    author_name: authorName,
  });
  const [keywordsRaw, setKeywordsRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!open) return;
    if (article) {
      setForm({
        title: article.title,
        body: article.body,
        category: article.category,
        keywords: article.keywords,
        is_pinned: article.is_pinned,
        sort_order: article.sort_order,
        author_name: article.author_name || authorName,
      });
      setKeywordsRaw(formatKeywordsInput(article.keywords));
    } else {
      setForm({
        title: '',
        body: '',
        category: '일반',
        keywords: [],
        is_pinned: false,
        sort_order: 0,
        author_name: authorName,
      });
      setKeywordsRaw('');
    }
    setError(null);
  }, [open, article, authorName]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          title: form.title.trim(),
          body: form.body.trim(),
          keywords: parseKeywordsInput(keywordsRaw),
          author_name: form.author_name.trim() || authorName,
        },
        article?.id,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--activity" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{article ? 'SOP 수정' : '새 SOP'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field field--full">
              <span>제목 *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 환불 · 취소 수수료 안내"
              />
            </label>
            <label className="field">
              <span>분류</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as SopCategory })}
              >
                {SOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>정렬 순서</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="field field--full">
              <span>검색 키워드 (쉼표 구분)</span>
              <input
                value={keywordsRaw}
                onChange={(e) => setKeywordsRaw(e.target.value)}
                placeholder="환불, 취소, 미수금"
              />
            </label>
            <label className="field field--full">
              <span>본문</span>
              <textarea
                rows={12}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="단계별 절차를 입력하세요"
              />
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              />
              <span>📌 상단 고정</span>
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal__footer">
            {article && onDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'SOP 삭제',
                    message: `「${article.title}」 SOP를 삭제할까요?`,
                    tone: 'danger',
                    confirmLabel: '삭제',
                  });
                  if (!ok) return;
                  await onDelete(article.id);
                  onClose();
                }}
              >
                삭제
              </button>
            ) : (
              <span />
            )}
            <div className="modal__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
