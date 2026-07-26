'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LocalGuideFrontMode } from '@/components/local-guides/local-guide-front-mode';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { printLocalGuide } from '@/lib/local-guides/print';
import {
  LOCAL_GUIDE_KIND_LABELS,
  LOCAL_GUIDE_KINDS,
  LOCAL_GUIDE_LOCALE_LABELS,
  guideBodyForLocale,
  localeBodyKey,
  type LocalGuide,
  type LocalGuideInput,
  type LocalGuideKind,
  type LocalGuideLocale,
} from '@/lib/local-guides/types';
import { useLocalGuides } from '@/lib/local-guides/use-local-guides';

type DrawerMode = 'read' | 'edit' | 'create';

const emptyInput = (author: string): LocalGuideInput => ({
  title: '',
  kind: 'transit',
  body_ko: '',
  body_en: '',
  body_zh: '',
  body_ja: '',
  is_active: true,
  author,
});

function LocalGuideDrawer({
  open,
  mode,
  guide,
  authorLabel,
  onClose,
  onModeChange,
  onSave,
  onDelete,
  onPrint,
}: {
  open: boolean;
  mode: DrawerMode;
  guide: LocalGuide | null;
  authorLabel: string;
  onClose: () => void;
  onModeChange: (mode: DrawerMode) => void;
  onSave: (input: LocalGuideInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPrint: (guide: LocalGuide, locale: LocalGuideLocale) => void;
}) {
  const [form, setForm] = useState<LocalGuideInput>(emptyInput(authorLabel));
  const [locale, setLocale] = useState<LocalGuideLocale>('ko');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = mode === 'edit' || mode === 'create';
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);

  useEffect(() => {
    if (!open) return;
    if (guide && mode !== 'create') {
      setForm({
        title: guide.title,
        kind: guide.kind,
        body_ko: guide.body_ko,
        body_en: guide.body_en,
        body_zh: guide.body_zh,
        body_ja: guide.body_ja,
        is_active: guide.is_active,
        author: guide.author || authorLabel,
        sort_order: guide.sort_order,
      });
    } else {
      setForm(emptyInput(authorLabel));
    }
    setLocale('ko');
    setError(null);
  }, [open, guide, mode, authorLabel]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!form.body_ko.trim()) {
      setError('한국어 내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          title: form.title.trim(),
          author: form.author.trim() || authorLabel,
        },
        mode === 'create' ? undefined : guide?.id,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const bodyKey = localeBodyKey(locale);
  const previewBody = guide ? guideBodyForLocale(guide, locale) : form[bodyKey];

  return (
    <div className="drawer-overlay" {...overlayProps}>
      <aside
        className="drawer-panel local-guide-drawer"
        {...panelProps}
        role="dialog"
        aria-modal="true"
        aria-label="퀵가이드"
      >
        <form className="drawer-panel__form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="drawer-panel__header">
            <div>
              <h2 className="drawer-panel__title">
                {mode === 'create' ? '퀵가이드 추가' : form.title || guide?.title || '퀵가이드'}
              </h2>
              <p className="drawer-panel__mode">
                {editing ? '편집' : '미리보기'} · {LOCAL_GUIDE_KIND_LABELS[form.kind]}
              </p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="drawer-panel__body">
            <div className="local-guide-drawer__locale" role="group" aria-label="언어">
              {(Object.keys(LOCAL_GUIDE_LOCALE_LABELS) as LocalGuideLocale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? 'is-active' : undefined}
                  onClick={() => setLocale(code)}
                >
                  {LOCAL_GUIDE_LOCALE_LABELS[code]}
                </button>
              ))}
            </div>

            {editing ? (
              <>
                <label className="field">
                  <span>제목 *</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="예: 지하철 가는 길"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>구분</span>
                  <select
                    value={form.kind}
                    onChange={(event) => setForm({ ...form, kind: event.target.value as LocalGuideKind })}
                  >
                    {LOCAL_GUIDE_KINDS.map((code) => (
                      <option key={code} value={code}>
                        {LOCAL_GUIDE_KIND_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field--full">
                  <span>{LOCAL_GUIDE_LOCALE_LABELS[locale]} 내용{locale === 'ko' ? ' *' : ''}</span>
                  <textarea
                    rows={10}
                    value={form[bodyKey]}
                    onChange={(event) => setForm({ ...form, [bodyKey]: event.target.value })}
                    placeholder={
                      locale === 'ko'
                        ? '예)\n호텔 나와서 왼쪽 3분\n○○역 2번 출구'
                        : '다른 언어가 비어 있으면 한국어로 보여줍니다.'
                    }
                  />
                </label>
                <label className="field field--check">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                  />
                  <span>손님 화면에 표시</span>
                </label>
              </>
            ) : guide ? (
              <div className="local-guide-drawer__preview">
                <span className={`local-guide-chip local-guide-chip--${guide.kind}`}>
                  {LOCAL_GUIDE_KIND_LABELS[guide.kind]}
                </span>
                <div className="local-guide-drawer__preview-body">
                  {previewBody.split('\n').map((line, index) => (
                    <p key={`${guide.id}-preview-${index}`}>{line || '\u00a0'}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}
          </div>

          <div className="modal__footer">
            <div className="modal__footer-left">
              {guide && mode !== 'create' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--danger"
                  onClick={() => void onDelete(guide.id)}
                  disabled={saving}
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="modal__footer-right">
              {guide && mode === 'read' ? (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => onPrint(guide, locale)}>
                    인쇄
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => onModeChange('edit')}>
                    수정
                  </button>
                </>
              ) : null}
              {editing ? (
                <>
                  <button type="button" className="btn btn--ghost" onClick={onClose}>
                    취소
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? '저장 중…' : '저장'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--primary" onClick={onClose}>
                  닫기
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function LocalGuidesPageClient() {
  const pageMeta = getNavPageMeta('/local-guides');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authorLabel } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const { guides, isLoading, error, saveGuide, deleteGuide } = useLocalGuides();

  const frontMode = searchParams.get('mode') === 'front';
  const initialId = searchParams.get('id');

  const [kindFilter, setKindFilter] = useState<'all' | LocalGuideKind>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('read');
  const [selected, setSelected] = useState<LocalGuide | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return guides;
    return guides.filter((guide) => guide.kind === kindFilter);
  }, [guides, kindFilter]);

  const activeCount = guides.filter((guide) => guide.is_active).length;

  function openCreate() {
    setSelected(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }

  function openRead(guide: LocalGuide) {
    setSelected(guide);
    setDrawerMode('read');
    setDrawerOpen(true);
  }

  function enterFrontMode() {
    router.push('/local-guides?mode=front');
  }

  function exitFrontMode() {
    router.push('/local-guides');
  }

  async function handleSave(input: LocalGuideInput, id?: string) {
    await saveGuide.mutateAsync({ id, input });
    setMessage(id ? '퀵가이드를 수정했습니다.' : '퀵가이드를 추가했습니다.');
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: '퀵가이드 삭제',
      message: '이 안내를 삭제할까요?',
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteGuide.mutateAsync(id);
    setDrawerOpen(false);
    setSelected(null);
    setMessage('삭제했습니다.');
  }

  if (frontMode) {
    return (
      <LocalGuideFrontMode
        guides={guides}
        initialGuideId={initialId}
        onExit={exitFrontMode}
      />
    );
  }

  return (
    <section className="local-guides-page">
      <header className="local-guides-page__header">
        <div>
          <h1>{pageMeta.label}</h1>
          <p>
            지하철·편의점·맛집처럼 자주 묻는 길을 짧게 적어 두고, 손님에게 화면으로 보여주거나 인쇄합니다.
            {activeCount ? ` · 표시 중 ${activeCount}건` : ''}
          </p>
        </div>
        <div className="local-guides-page__actions">
          <button type="button" className="btn btn--outline" onClick={enterFrontMode} disabled={!activeCount}>
            손님 화면
          </button>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            추가
          </button>
        </div>
      </header>

      <div className="local-guides-page__filters" role="tablist" aria-label="구분 필터">
        <button
          type="button"
          role="tab"
          aria-selected={kindFilter === 'all'}
          className={kindFilter === 'all' ? 'is-active' : undefined}
          onClick={() => setKindFilter('all')}
        >
          전체
        </button>
        {LOCAL_GUIDE_KINDS.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={kindFilter === code}
            className={kindFilter === code ? 'is-active' : undefined}
            onClick={() => setKindFilter(code)}
          >
            {LOCAL_GUIDE_KIND_LABELS[code]}
          </button>
        ))}
      </div>

      {message ? <p className="local-guides-page__status">{message}</p> : null}
      {error ? (
        <p className="local-guides-page__status local-guides-page__status--error">
          {error instanceof Error ? error.message : '불러오지 못했습니다.'}
        </p>
      ) : null}

      {isLoading ? (
        <p className="local-guides-page__empty">불러오는 중…</p>
      ) : !filtered.length ? (
        <button type="button" className="local-guides-page__empty local-guides-page__empty--cta" onClick={openCreate}>
          <strong>첫 퀵가이드를 추가해 보세요</strong>
          <span>예: 지하철 가는 길, CU 편의점, 근처 맛집</span>
        </button>
      ) : (
        <div className="local-guides-grid">
          {filtered.map((guide) => (
            <button
              key={guide.id}
              type="button"
              className={`local-guides-card${guide.is_active ? '' : ' is-inactive'}`}
              onClick={() => openRead(guide)}
            >
              <span className={`local-guide-chip local-guide-chip--${guide.kind}`}>
                {LOCAL_GUIDE_KIND_LABELS[guide.kind]}
              </span>
              <strong>{guide.title}</strong>
              <p>
                {(guide.body_ko || '').split('\n')[0] || '내용 없음'}
              </p>
              {!guide.is_active ? <em>숨김</em> : null}
            </button>
          ))}
        </div>
      )}

      <LocalGuideDrawer
        open={drawerOpen}
        mode={drawerMode}
        guide={selected}
        authorLabel={authorLabel}
        onClose={() => setDrawerOpen(false)}
        onModeChange={setDrawerMode}
        onSave={handleSave}
        onDelete={handleDelete}
        onPrint={printLocalGuide}
      />
    </section>
  );
}
