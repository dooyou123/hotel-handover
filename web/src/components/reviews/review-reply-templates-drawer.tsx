'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { ReviewReplyTemplateSortableList } from '@/components/reviews/review-reply-template-sortable-list';
import {
  ReviewReplyLocalePreview,
  ReviewReplyLocaleStatus,
  ReviewReplyLocaleTabs,
} from '@/components/reviews/review-reply-locale-preview';
import {
  REVIEW_REPLY_CHANNELS,
  REVIEW_REPLY_CHANNEL_LABELS,
  REVIEW_REPLY_SENTIMENTS,
  REVIEW_REPLY_SENTIMENT_LABELS,
  hasReplyLocaleBody,
  replyBodyStrictForLocale,
  type ReviewReplyChannel,
  type ReviewReplyLocale,
  type ReviewReplySentiment,
  type ReviewReplyTemplate,
  type ReviewReplyTemplateInput,
} from '@/lib/reviews/reply-templates';
import type { UseMutationResult } from '@tanstack/react-query';

type ReviewReplyTemplatesDrawerProps = {
  open: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
  templates: ReviewReplyTemplate[];
  saveTemplate: UseMutationResult<
    ReviewReplyTemplate,
    Error,
    { id?: string; input: ReviewReplyTemplateInput }
  >;
  deleteTemplate: UseMutationResult<void, Error, string>;
  reorderTemplates: UseMutationResult<void, Error, string[]>;
};

type PanelMode = 'browse' | 'edit' | 'create';
type SentimentFilter = 'all' | ReviewReplySentiment;
type ChannelFilter = 'all' | ReviewReplyChannel;

const emptyTemplate = (): ReviewReplyTemplateInput => ({
  title: '',
  sentiment: 'general',
  channel: 'both',
  body_ko: '',
  body_en: '',
  body_zh: '',
  body_ja: '',
});

function localeBodyKey(locale: ReviewReplyLocale): 'body_ko' | 'body_en' | 'body_zh' | 'body_ja' {
  if (locale === 'en') return 'body_en';
  if (locale === 'zh') return 'body_zh';
  if (locale === 'ja') return 'body_ja';
  return 'body_ko';
}

function TemplatePreview({
  template,
  onEdit,
  onCopy,
  onDelete,
}: {
  template: ReviewReplyTemplate;
  onEdit: () => void;
  onCopy: (text: string) => void;
  onDelete: () => Promise<void>;
}) {
  const [locale, setLocale] = useState<ReviewReplyLocale>('ko');
  const { confirm } = useConfirmDialog();
  const body = replyBodyStrictForLocale(template, locale);
  const canCopy = hasReplyLocaleBody(template, locale);

  return (
    <article className="review-reply-settings__preview">
      <header className="review-reply-settings__preview-head">
        <div>
          <div className="review-reply-settings__preview-tags">
            <span className={`review-reply-settings__badge review-reply-settings__badge--${template.sentiment}`}>
              {REVIEW_REPLY_SENTIMENT_LABELS[template.sentiment]}
            </span>
            <span className="review-reply-settings__badge review-reply-settings__badge--channel">
              {REVIEW_REPLY_CHANNEL_LABELS[template.channel]}
            </span>
          </div>
          <h3>{template.title}</h3>
        </div>
        <div className="review-reply-settings__preview-actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={onEdit}>
            수정
          </button>
          <button
            type="button"
            className="btn btn--danger btn--small"
            onClick={async () => {
              const ok = await confirm({
                title: '템플릿 삭제',
                message: `「${template.title}」을(를) 삭제합니다.`,
                tone: 'danger',
                confirmLabel: '삭제',
              });
              if (!ok) return;
              await onDelete();
            }}
          >
            삭제
          </button>
        </div>
      </header>

      <ReviewReplyLocaleStatus template={template} />

        <ReviewReplyLocaleTabs
          locale={locale}
          bodies={template}
          onChange={setLocale}
          ariaLabel="미리보기 언어"
        />

      <ReviewReplyLocalePreview template={template} locale={locale} />

      <button
        type="button"
        className="btn btn--primary btn--small"
        disabled={!canCopy}
        onClick={() => onCopy(body)}
      >
        이 언어로 복사
      </button>
    </article>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
  onDelete,
}: {
  template: ReviewReplyTemplate | null;
  onSave: (input: ReviewReplyTemplateInput, id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ReviewReplyTemplateInput>(emptyTemplate());
  const [locale, setLocale] = useState<ReviewReplyLocale>('ko');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (template) {
      setForm({
        title: template.title,
        sentiment: template.sentiment,
        channel: template.channel,
        body_ko: template.body_ko,
        body_en: template.body_en,
        body_zh: template.body_zh,
        body_ja: template.body_ja,
        sort_order: template.sort_order,
      });
    } else {
      setForm(emptyTemplate());
    }
    setLocale('ko');
    setError(null);
  }, [template]);

  const bodyKey = localeBodyKey(locale);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.body_ko.trim()) {
      setError('제목과 한국어 답변을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() }, template?.id);
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="review-reply-settings__editor" noValidate onSubmit={handleSubmit}>
      <header className="review-reply-settings__editor-head">
        <h3>{template ? '템플릿 수정' : '새 템플릿'}</h3>
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>
          취소
        </button>
      </header>

      <label className="field field--full">
        <span>제목 *</span>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <div className="review-reply-settings__editor-meta">
        <label className="field">
          <span>용도</span>
          <select
            value={form.sentiment}
            onChange={(e) => setForm({ ...form, sentiment: e.target.value as ReviewReplySentiment })}
          >
            {REVIEW_REPLY_SENTIMENTS.map((value) => (
              <option key={value} value={value}>
                {REVIEW_REPLY_SENTIMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>채널</span>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value as ReviewReplyChannel })}
          >
            {REVIEW_REPLY_CHANNELS.map((value) => (
              <option key={value} value={value}>
                {REVIEW_REPLY_CHANNEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field field--full">
        <span>답변 본문</span>
        <ReviewReplyLocaleTabs
          locale={locale}
          bodies={form}
          onChange={setLocale}
          ariaLabel="편집 언어"
        />
        <textarea
          rows={10}
          value={form[bodyKey]}
          onChange={(e) => setForm({ ...form, [bodyKey]: e.target.value })}
          placeholder="OTA 리뷰 답변 또는 메일 답변 전문"
        />
      </div>

      {error ? <p className="amenity-alert">{error}</p> : null}

      <div className="review-reply-settings__form-actions">
        {template && onDelete ? (
          <button
            type="button"
            className="btn btn--danger btn--small"
            onClick={async () => {
              const ok = await confirm({
                title: '템플릿 삭제',
                message: `「${template.title}」을(를) 삭제합니다.`,
                tone: 'danger',
                confirmLabel: '삭제',
              });
              if (!ok) return;
              await onDelete(template.id);
              onCancel();
            }}
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btn btn--primary btn--small" disabled={saving}>
          저장
        </button>
      </div>
    </form>
  );
}

export function ReviewReplyTemplatesDrawer({
  open,
  onClose,
  onToast,
  templates,
  saveTemplate,
  deleteTemplate,
  reorderTemplates,
}: ReviewReplyTemplatesDrawerProps) {
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);
  const [panelMode, setPanelMode] = useState<PanelMode>('browse');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (sentimentFilter !== 'all' && template.sentiment !== sentimentFilter) return false;
      if (channelFilter === 'review' && template.channel === 'email') return false;
      if (channelFilter === 'email' && template.channel === 'review') return false;
      if (channelFilter === 'both' && template.channel !== 'both') return false;
      if (!q) return true;
      const haystack = [
        template.title,
        template.body_ko,
        template.body_en,
        template.body_zh,
        template.body_ja,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, query, sentimentFilter, channelFilter]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!open) return;
    setPanelMode('browse');
    setQuery('');
    setSentimentFilter('all');
    setChannelFilter('all');
    setSelectedId(templates[0]?.id ?? null);
  }, [open, templates]);

  useEffect(() => {
    if (!selectedId || filtered.some((row) => row.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  async function handleCopy(text: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('답변을 클립보드에 복사했습니다.');
    } catch {
      onToast?.('복사에 실패했습니다.');
    }
  }

  if (!open) return null;

  return (
    <div className="drawer-overlay" {...overlayProps}>
      <aside
        className="drawer-panel drawer-panel--reply-templates review-reply-settings"
        {...panelProps}
        role="dialog"
        aria-modal="true"
        aria-label="답변 템플릿 관리"
      >
        <div className="drawer-panel__form">
          <header className="drawer-panel__header modal__header">
            <div className="drawer-panel__heading">
              <p className="drawer-panel__mode">리뷰 · 메일 답변</p>
              <h2 className="drawer-panel__title">답변 템플릿</h2>
              <p className="review-reply-settings__count">
                총 {templates.length}개
                {filtered.length !== templates.length ? ` · ${filtered.length}개 표시` : ''}
              </p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </header>

          <div className="drawer-panel__body review-reply-settings__body">
            <div className="review-reply-settings__split">
              <aside className="review-reply-settings__aside">
                <div className="review-reply-settings__aside-head">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="제목·본문 검색…"
                    aria-label="템플릿 검색"
                  />
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => {
                      setPanelMode('create');
                      setSelectedId(null);
                    }}
                  >
                    + 추가
                  </button>
                </div>

                <div className="review-reply-settings__filters">
                  <div className="review-reply-settings__filter-row" role="tablist" aria-label="용도 필터">
                    {(['all', ...REVIEW_REPLY_SENTIMENTS] as SentimentFilter[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={sentimentFilter === value}
                        className={`review-reply-settings__filter-chip${sentimentFilter === value ? ' is-active' : ''}`}
                        onClick={() => setSentimentFilter(value)}
                      >
                        {value === 'all' ? '전체' : REVIEW_REPLY_SENTIMENT_LABELS[value]}
                      </button>
                    ))}
                  </div>
                  <div className="review-reply-settings__filter-row" role="tablist" aria-label="채널 필터">
                    {(['all', 'review', 'email', 'both'] as ChannelFilter[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={channelFilter === value}
                        className={`review-reply-settings__filter-chip${channelFilter === value ? ' is-active' : ''}`}
                        onClick={() => setChannelFilter(value)}
                      >
                        {value === 'all' ? '전체' : REVIEW_REPLY_CHANNEL_LABELS[value]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="review-reply-settings__list-scroll">
                  <ReviewReplyTemplateSortableList
                    templates={filtered}
                    selectedId={selected?.id ?? null}
                    disabled={reorderTemplates.isPending || panelMode !== 'browse'}
                    onSelect={(template) => {
                      setSelectedId(template.id);
                      setPanelMode('browse');
                    }}
                    onReorder={(orderedIds) => {
                      void reorderTemplates.mutateAsync(orderedIds);
                    }}
                  />
                </div>
              </aside>

              <main className="review-reply-settings__main">
                {panelMode === 'create' ? (
                  <TemplateEditor
                    template={null}
                    onSave={async (input, id) => {
                      const saved = await saveTemplate.mutateAsync({ id, input });
                      onToast?.(id ? '템플릿을 수정했습니다.' : '템플릿을 추가했습니다.');
                      setSelectedId(saved.id);
                      setPanelMode('browse');
                    }}
                    onCancel={() => {
                      setPanelMode('browse');
                      setSelectedId(templates[0]?.id ?? null);
                    }}
                  />
                ) : panelMode === 'edit' && selected ? (
                  <TemplateEditor
                    template={selected}
                    onSave={async (input, id) => {
                      await saveTemplate.mutateAsync({ id, input });
                      onToast?.('템플릿을 수정했습니다.');
                      setPanelMode('browse');
                    }}
                    onCancel={() => setPanelMode('browse')}
                    onDelete={async (id) => {
                      await deleteTemplate.mutateAsync(id);
                      onToast?.('템플릿을 삭제했습니다.');
                      setPanelMode('browse');
                      setSelectedId(templates.find((row) => row.id !== id)?.id ?? null);
                    }}
                  />
                ) : selected ? (
                  <TemplatePreview
                    template={selected}
                    onEdit={() => setPanelMode('edit')}
                    onCopy={(text) => void handleCopy(text)}
                    onDelete={async () => {
                      const id = selected.id;
                      await deleteTemplate.mutateAsync(id);
                      onToast?.('템플릿을 삭제했습니다.');
                      setPanelMode('browse');
                      setSelectedId(templates.find((row) => row.id !== id)?.id ?? null);
                    }}
                  />
                ) : (
                  <p className="review-reply-settings__empty review-reply-settings__empty--main">
                    템플릿을 선택하거나 새로 추가하세요.
                  </p>
                )}
              </main>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
