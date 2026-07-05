'use client';

import { useEffect, useMemo, useState } from 'react';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { countGuidelinesByCategory, filterSituationGuidelines } from '@/lib/situation-guidelines/filter';
import {
  SITUATION_GUIDELINE_CATEGORIES,
  SITUATION_GUIDELINE_FILTER_TABS,
  SITUATION_GUIDELINE_REPORT_TO_HINT,
  SITUATION_GUIDELINE_REPORT_TO_LABEL,
  formatKeywordsInput,
  formatUpdatedLabel,
  parseKeywordsInput,
  type SituationGuideline,
  type SituationGuidelineInput,
} from '@/lib/situation-guidelines/types';
import { useSituationGuidelines } from '@/lib/situation-guidelines/use-situation-guidelines';

type PanelMode = 'read' | 'edit' | 'create';

function emptyInput(author: string): SituationGuidelineInput {
  return {
    title: '',
    body: '',
    category: '일반',
    contact_name: '',
    contact_phone: '',
    report_to: '',
    keywords: [],
    is_pinned: false,
    author,
  };
}

function phoneHref(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.length >= 8 ? `tel:${digits}` : null;
}

function GuidelineDetailPanel({
  guideline,
  onEdit,
  onDelete,
  onBack,
  showBack,
}: {
  guideline: SituationGuideline;
  onEdit: () => void;
  onDelete: () => void;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const phone = phoneHref(guideline.contact_phone);

  return (
    <article className="situation-guidelines-detail">
      <header className="situation-guidelines-detail__head">
        {showBack ? (
          <button type="button" className="btn btn--ghost btn--small situation-guidelines-detail__back" onClick={onBack}>
            ← 목록
          </button>
        ) : null}
        <div className="situation-guidelines-detail__tags">
          <span className="situation-guidelines-detail__category">{guideline.category}</span>
          {guideline.is_pinned ? <span className="project-board__pin">고정</span> : null}
        </div>
        <h2 className="situation-guidelines-detail__title">{guideline.title}</h2>
        <p className="situation-guidelines-detail__meta">
          {guideline.author || '미입력'} · {formatUpdatedLabel(guideline.updated_at)}
        </p>
      </header>

      {guideline.contact_name || guideline.contact_phone || guideline.report_to ? (
        <section className="situation-guidelines-detail__section situation-guidelines-detail__contacts">
          <h3>연락 · 전달</h3>
          <dl>
            {guideline.contact_name ? (
              <>
                <dt>연락 대상</dt>
                <dd>{guideline.contact_name}</dd>
              </>
            ) : null}
            {guideline.contact_phone ? (
              <>
                <dt>연락처</dt>
                <dd>
                  {phone ? <a href={phone}>{guideline.contact_phone}</a> : guideline.contact_phone}
                </dd>
              </>
            ) : null}
            {guideline.report_to ? (
              <>
                <dt>{SITUATION_GUIDELINE_REPORT_TO_LABEL}</dt>
                <dd>{guideline.report_to}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="situation-guidelines-detail__section situation-guidelines-detail__body">
        <h3>대처 절차</h3>
        <pre>{guideline.body}</pre>
      </section>

      {guideline.keywords.length ? (
        <section className="situation-guidelines-detail__section">
          <h3>검색 키워드</h3>
          <div className="situation-guidelines-detail__keywords">
            {guideline.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="situation-guidelines-detail__foot">
        <button type="button" className="btn btn--danger btn--small" onClick={onDelete}>
          삭제
        </button>
        <button type="button" className="btn btn--primary" onClick={onEdit}>
          수정
        </button>
      </footer>
    </article>
  );
}

function GuidelineEditPanel({
  mode,
  guideline,
  authorLabel,
  onCancel,
  onSave,
}: {
  mode: 'edit' | 'create';
  guideline: SituationGuideline | null;
  authorLabel: string;
  onCancel: () => void;
  onSave: (input: SituationGuidelineInput, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<SituationGuidelineInput>(emptyInput(authorLabel));
  const [keywordsText, setKeywordsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'create') {
      setForm(emptyInput(authorLabel));
      setKeywordsText('');
    } else if (guideline) {
      setForm({
        title: guideline.title,
        body: guideline.body,
        category: guideline.category,
        contact_name: guideline.contact_name,
        contact_phone: guideline.contact_phone,
        report_to: guideline.report_to,
        keywords: guideline.keywords,
        is_pinned: guideline.is_pinned,
        sort_order: guideline.sort_order,
        author: guideline.author || authorLabel,
      });
      setKeywordsText(formatKeywordsInput(guideline.keywords));
    }
    setError(null);
  }, [mode, guideline, authorLabel]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!form.body.trim()) {
      setError('대처 절차를 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          title: form.title.trim(),
          body: form.body.trim(),
          contact_name: form.contact_name.trim(),
          contact_phone: form.contact_phone.trim(),
          report_to: form.report_to.trim(),
          keywords: parseKeywordsInput(keywordsText),
          author: form.author.trim() || authorLabel,
        },
        guideline?.id,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="situation-guidelines-detail situation-guidelines-detail--edit">
      <header className="situation-guidelines-detail__head">
        <h2 className="situation-guidelines-detail__title">
          {mode === 'create' ? '대처 요령 추가' : '대처 요령 수정'}
        </h2>
      </header>
      <div className="form-grid situation-guidelines-detail__form">
        <label className="field field--full">
          <span>제목 *</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="예: 얼음·정수기 고장"
          />
        </label>
        <label className="field">
          <span>분류</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as SituationGuidelineInput['category'] })}
          >
            {SITUATION_GUIDELINE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--checkbox">
          <span>
            <input
              type="checkbox"
              checked={form.is_pinned ?? false}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            />{' '}
            상단 고정
          </span>
        </label>
        <label className="field">
          <span>연락 대상</span>
          <input
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            placeholder="예: 엔지니어링 / AS 업체"
          />
        </label>
        <label className="field">
          <span>연락처</span>
          <input
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            placeholder="전화번호 · 내선"
          />
        </label>
        <label className="field field--full">
          <span>{SITUATION_GUIDELINE_REPORT_TO_LABEL}</span>
          <input
            value={form.report_to}
            onChange={(e) => setForm({ ...form, report_to: e.target.value })}
            placeholder={SITUATION_GUIDELINE_REPORT_TO_HINT}
          />
        </label>
        <label className="field field--full">
          <span>대처 절차 *</span>
          <textarea
            rows={12}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={'1. …\n2. …\n3. …'}
          />
        </label>
        <label className="field field--full">
          <span>검색 키워드</span>
          <input
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder="쉼표로 구분"
          />
        </label>
      </div>
      {error ? <p className="amenity-alert">{error}</p> : null}
      <footer className="situation-guidelines-detail__foot">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" disabled={saving} className="btn btn--primary">
          {saving ? '저장 중…' : '저장'}
        </button>
      </footer>
    </form>
  );
}

export function SituationGuidelinesPageClient() {
  const pageMeta = getNavPageMeta('/situation-guidelines');
  const { authorLabel, requireSession } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const { guidelines, isLoading, saveGuideline, deleteGuideline, togglePin } = useSituationGuidelines();
  const [filter, setFilter] = useState<(typeof SITUATION_GUIDELINE_FILTER_TABS)[number]>('전체');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('read');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const countsByCategory = useMemo(() => countGuidelinesByCategory(guidelines), [guidelines]);

  const visible = useMemo(
    () => filterSituationGuidelines(guidelines, { query, category: filter }),
    [guidelines, query, filter],
  );

  const selected = useMemo(
    () => visible.find((item) => item.id === selectedId) ?? null,
    [visible, selectedId],
  );

  useEffect(() => {
    if (panelMode === 'create') return;

    if (!visible.length) {
      setSelectedId(null);
      setPanelMode('read');
      setMobileDetailOpen(false);
      return;
    }

    if (!selectedId || !visible.some((item) => item.id === selectedId)) {
      setSelectedId(visible[0].id);
      if (panelMode !== 'edit') {
        setPanelMode('read');
      }
    }
  }, [visible, selectedId, panelMode]);

  function selectGuideline(guideline: SituationGuideline) {
    setSelectedId(guideline.id);
    setPanelMode('read');
    setMobileDetailOpen(true);
  }

  function openCreate() {
    if (requireSession && !requireSession('대처 요령 작성')) return;
    setSelectedId(null);
    setPanelMode('create');
    setMobileDetailOpen(true);
  }

  async function handleSave(input: SituationGuidelineInput, id?: string) {
    if (requireSession && !requireSession(id ? '대처 요령 수정' : '대처 요령 작성')) return;
    const saved = await saveGuideline.mutateAsync({ id, input });
    setSelectedId(saved.id);
    setPanelMode('read');
  }

  async function handleDelete(guideline: SituationGuideline) {
    if (requireSession && !requireSession('대처 요령 삭제')) return;
    const ok = await confirm({
      title: '대처 요령 삭제',
      message: `「${guideline.title}」 항목을 삭제할까요?`,
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    await deleteGuideline.mutateAsync(guideline.id);
    setPanelMode('read');
    setMobileDetailOpen(false);
  }

  const splitClass = [
    'situation-guidelines-split',
    mobileDetailOpen ? 'is-mobile-detail' : '',
    panelMode !== 'read' ? 'is-editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showSplit = visible.length > 0 || panelMode === 'create' || panelMode === 'edit';

  return (
    <section className="project-board situation-guidelines-page">
      <header className="project-board__head">
        <div>
          <h1>{pageMeta.label}</h1>
          <p>{pageMeta.description}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn--primary">
          + 대처 요령 추가
        </button>
      </header>

      <div className="project-board__controls">
        <div className="project-board__search">
          <span aria-hidden>⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·절차·연락처·키워드 검색…"
            aria-label="대처 요령 검색"
          />
        </div>
        <div
          className="project-board__filters situation-guidelines-page__filters"
          aria-label="분류 필터"
          role="tablist"
        >
          {SITUATION_GUIDELINE_FILTER_TABS.map((tab) => {
            const count = countsByCategory[tab];
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab)}
                className={`situation-guidelines-page__filter${active ? ' is-active' : ''}`}
              >
                <span className="situation-guidelines-page__filter-label">{tab}</span>
                {count ? <span className="situation-guidelines-page__filter-count">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : !showSplit ? (
        <p className="empty-state">
          {query.trim() || filter !== '전체'
            ? '검색 결과가 없습니다.'
            : '등록된 대처 요령이 없습니다.'}
          <button type="button" className="btn btn--primary situation-guidelines-page__empty-add" onClick={openCreate}>
            + 첫 대처 요령 추가
          </button>
        </p>
      ) : (
        <div className={splitClass}>
          <div className="situation-guidelines-split__list" aria-label="대처 요령 목록">
            {visible.length ? (
              <ul className="project-board__list situation-guidelines-split__rows">
                {visible.map((guideline) => (
                  <li
                    key={guideline.id}
                    className={`project-board__row situation-guidelines-split__row${
                      guideline.is_pinned ? ' is-pinned' : ''
                    }${selectedId === guideline.id && panelMode !== 'create' ? ' is-reading' : ''}`}
                  >
                    <div className="situation-guidelines-split__row-shell">
                      <div className="situation-guidelines-split__row-head">
                        <div className="project-board__row-tags">
                          <span className="situation-guidelines-detail__category">{guideline.category}</span>
                          {guideline.is_pinned ? <span className="project-board__pin">고정</span> : null}
                        </div>
                        <button
                          type="button"
                          className={`situation-guidelines-split__pin-btn${guideline.is_pinned ? ' is-active' : ''}`}
                          aria-label={guideline.is_pinned ? '고정 해제' : '상단 고정'}
                          onClick={() => togglePin.mutate({ id: guideline.id, isPinned: guideline.is_pinned })}
                        >
                          ★
                        </button>
                      </div>
                      <button
                        type="button"
                        className="project-board__row-body situation-guidelines-split__row-body"
                        onClick={() => selectGuideline(guideline)}
                      >
                        <p className="project-board__title situation-guidelines-split__title">{guideline.title}</p>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="situation-guidelines-split__list-empty">등록된 항목이 없습니다. 오른쪽에서 추가하세요.</p>
            )}
          </div>

          <div className="situation-guidelines-split__detail" aria-label="상세 내용">
            {panelMode === 'create' ? (
              <GuidelineEditPanel
                mode="create"
                guideline={null}
                authorLabel={authorLabel}
                onCancel={() => {
                  setPanelMode('read');
                  if (visible[0]) {
                    setSelectedId(visible[0].id);
                  } else {
                    setSelectedId(null);
                  }
                  setMobileDetailOpen(false);
                }}
                onSave={handleSave}
              />
            ) : panelMode === 'edit' && selected ? (
              <GuidelineEditPanel
                mode="edit"
                guideline={selected}
                authorLabel={authorLabel}
                onCancel={() => setPanelMode('read')}
                onSave={handleSave}
              />
            ) : selected ? (
              <GuidelineDetailPanel
                guideline={selected}
                showBack
                onBack={() => setMobileDetailOpen(false)}
                onEdit={() => {
                  if (requireSession && !requireSession('대처 요령 수정')) return;
                  setPanelMode('edit');
                }}
                onDelete={() => void handleDelete(selected)}
              />
            ) : (
              <div className="situation-guidelines-detail situation-guidelines-detail--empty">
                <p>왼쪽 목록에서 항목을 선택하세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
