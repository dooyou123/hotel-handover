'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { searchSopArticles } from '@/lib/sop/search';
import { SOP_CATEGORIES, type SopArticle } from '@/lib/sop/types';
import { useSopArticles } from '@/lib/sop/use-sop';
import { SopArticleModal } from '@/components/sop/sop-article-modal';

type CategoryFilter = SopArticle['category'] | 'all';

function SopDetailPanel({
  article,
  onClose,
  isManager,
  onEdit,
}: {
  article: SopArticle;
  onClose: () => void;
  isManager: boolean;
  onEdit: () => void;
}) {
  return (
    <aside className="sop-detail">
      <header className="sop-detail__head">
        <div>
          <span className="sop-detail__category">{article.category}</span>
          <h3>{article.title}</h3>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </header>
      {article.keywords.length > 0 ? (
        <div className="sop-detail__keywords">
          {article.keywords.map((keyword) => (
            <span key={keyword} className="sop-tag">
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
      <div className="sop-detail__body">{article.body || '내용 없음'}</div>
      <footer className="sop-detail__foot">
        <span>
          {article.author_name || '—'} · {new Date(article.updated_at).toLocaleDateString('ko-KR')}
        </span>
        {isManager ? (
          <button type="button" className="btn btn--outline btn--small" onClick={onEdit}>
            수정
          </button>
        ) : null}
      </footer>
    </aside>
  );
}

export function SopPageClient() {
  const searchParams = useSearchParams();
  const { articles, isLoading, error, saveArticle, deleteArticle } = useSopArticles();
  const { data: isManager = false } = useIsManager();
  const { authorLabel } = useWorkSession();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('article'));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SopArticle | null>(null);

  const filtered = useMemo(() => {
    let list = searchSopArticles(articles, query);
    if (category !== 'all') {
      list = list.filter((item) => item.category === category);
    }
    return list.sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        b.score - a.score ||
        a.sort_order - b.sort_order ||
        a.title.localeCompare(b.title, 'ko'),
    );
  }, [articles, query, category]);

  const selected = selectedId ? articles.find((a) => a.id === selectedId) ?? null : null;
  const pinnedCount = articles.filter((a) => a.is_pinned).length;

  useEffect(() => {
    const articleId = searchParams.get('article');
    if (articleId) setSelectedId(articleId);
  }, [searchParams]);

  function openCreate() {
    setEditingArticle(null);
    setModalOpen(true);
  }

  function openEdit(article: SopArticle) {
    setEditingArticle(article);
    setModalOpen(true);
  }

  return (
    <section className="sop-page">
      <header className="sop-page__hero">
        <div>
          <p className="sop-page__eyebrow">지식베이스</p>
          <h2>SOP · 매뉴얼</h2>
          <p className="sop-page__lead">
            현장 절차를 키워드로 검색합니다. 인수인계 카드 작성 시 관련 SOP가 자동으로 추천됩니다.
          </p>
        </div>
        {isManager ? (
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + 새 SOP
          </button>
        ) : null}
      </header>

      <div className="sop-search-bar">
        <input
          type="search"
          className="sop-search-bar__input"
          placeholder="키워드 검색 — 환불, 119, 소음, VIP…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <span className="sop-search-bar__count">
          {filtered.length}건{pinnedCount > 0 ? ` · 고정 ${pinnedCount}` : ''}
        </span>
      </div>

      <div className="sop-filters">
        <button
          type="button"
          className={`sop-filter${category === 'all' ? ' is-active' : ''}`}
          onClick={() => setCategory('all')}
        >
          전체
        </button>
        {SOP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`sop-filter${category === cat ? ' is-active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? <p className="sop-status">불러오는 중…</p> : null}
      {error ? (
        <p className="sop-status sop-status--error">
          SOP를 불러오지 못했습니다. Supabase에 <code>026_sop_knowledge_base</code> 마이그레이션을 적용했는지
          확인하세요.
        </p>
      ) : null}

      <div className={`sop-layout${selected ? ' sop-layout--detail' : ''}`}>
        <div className="sop-list">
          {!isLoading && filtered.length === 0 ? (
            <div className="sop-empty">
              <p>{query ? '검색 결과가 없습니다.' : '등록된 SOP가 없습니다.'}</p>
              {isManager ? (
                <button type="button" className="btn btn--outline btn--small" onClick={openCreate}>
                  첫 SOP 추가
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((article) => (
              <button
                key={article.id}
                type="button"
                className={`sop-card${selectedId === article.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(article.id)}
              >
                <div className="sop-card__head">
                  {article.is_pinned ? <span className="sop-card__pin" aria-label="고정">📌</span> : null}
                  <span className="sop-card__category">{article.category}</span>
                </div>
                <strong className="sop-card__title">{article.title}</strong>
                <p className="sop-card__preview">
                  {article.body.split('\n').find((line) => line.trim())?.slice(0, 80) || '—'}
                </p>
                {article.keywords.length > 0 ? (
                  <div className="sop-card__tags">
                    {article.keywords.slice(0, 4).map((kw) => (
                      <span key={kw} className="sop-tag sop-tag--muted">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>

        {selected ? (
          <SopDetailPanel
            article={selected}
            onClose={() => setSelectedId(null)}
            isManager={isManager}
            onEdit={() => openEdit(selected)}
          />
        ) : null}
      </div>

      <aside className="sop-page__aside">
        <p>
          앱 사용법은 <Link href="/help">도움말</Link>에서, 현장 절차는 이 페이지에서 찾으세요.
        </p>
      </aside>

      <SopArticleModal
        open={modalOpen}
        article={editingArticle}
        authorName={authorLabel || '관리자'}
        onClose={() => setModalOpen(false)}
        onSave={async (input, id) => {
          await saveArticle.mutateAsync({ id, input });
        }}
        onDelete={
          isManager
            ? async (id) => {
                await deleteArticle.mutateAsync(id);
                if (selectedId === id) setSelectedId(null);
              }
            : undefined
        }
      />
    </section>
  );
}
