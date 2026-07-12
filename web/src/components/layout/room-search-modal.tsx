'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SearchHighlight } from '@/components/handover/search-highlight';
import { searchGlobal, type GlobalSearchHit, type GlobalSearchHitKind } from '@/lib/room-search/api';
import { formatRoomSearchAt } from '@/lib/room-search/format';
import { loadRecentRoomSearches, rememberRoomSearch } from '@/lib/room-search/recent';

const KIND_LABELS: Record<GlobalSearchHitKind, string> = {
  handover: '인수인계',
  facility: '시설·컴플레인',
  review: '리뷰',
  transport: '택시 예약',
  notice: '공지·변경',
  todo: '할일',
  event: '호텔 일정',
  contact: '연락처',
  guest_notice: '고객 안내',
};

const KIND_TABS: { id: 'all' | GlobalSearchHitKind | 'schedule'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'handover', label: '인수인계' },
  { id: 'notice', label: '공지·변경' },
  { id: 'schedule', label: '할일·일정' },
  { id: 'transport', label: '택시' },
  { id: 'facility', label: '시설' },
  { id: 'review', label: '리뷰' },
  { id: 'contact', label: '연락처' },
  { id: 'guest_notice', label: '고객 안내' },
];

type RoomSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RoomSearchModal({ open, onClose }: RoomSearchModalProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindTab, setKindTab] = useState<'all' | GlobalSearchHitKind | 'schedule'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHits([]);
    setKindTab('all');
    setRecentSearches(loadRecentRoomSearches());
  }, [open]);

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
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      searchGlobal(term)
        .then((results) => {
          setHits(results);
          if (results.length > 0) {
            rememberRoomSearch(term);
            setRecentSearches(loadRecentRoomSearches());
          }
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const trimmed = query.trim();
  const filteredHits = useMemo(() => {
    if (kindTab === 'all') return hits;
    if (kindTab === 'schedule') return hits.filter((hit) => hit.kind === 'todo' || hit.kind === 'event');
    return hits.filter((hit) => hit.kind === kindTab);
  }, [hits, kindTab]);

  const kindCounts = useMemo(() => {
    const counts = new Map<GlobalSearchHitKind, number>();
    for (const hit of hits) {
      counts.set(hit.kind, (counts.get(hit.kind) ?? 0) + 1);
    }
    return counts;
  }, [hits]);

  function tabCount(tabId: 'all' | GlobalSearchHitKind | 'schedule'): number {
    if (tabId === 'all') return hits.length;
    if (tabId === 'schedule') return (kindCounts.get('todo') ?? 0) + (kindCounts.get('event') ?? 0);
    return kindCounts.get(tabId) ?? 0;
  }

  function tabEmptyLabel(tabId: 'all' | GlobalSearchHitKind | 'schedule'): string {
    if (tabId === 'schedule') return '할일·일정';
    if (tabId === 'all') return '';
    return KIND_LABELS[tabId];
  }

  if (!open) return null;

  const showHint = !loading && trimmed.length < 2;
  const showEmpty = !loading && trimmed.length >= 2 && !filteredHits.length;
  const showRecent = showHint && recentSearches.length > 0;

  function selectRecent(term: string) {
    setQuery(term);
    setKindTab('all');
  }

  function handleHitClick() {
    if (trimmed.length >= 2) rememberRoomSearch(trimmed);
    onClose();
  }

  return (
    <div className="modal-overlay modal-overlay--room-search" onClick={onClose}>
      <div
        className="modal modal--room-search"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-search-title"
      >
        <header className="room-search__header">
          <div>
            <h2 id="room-search-title">통합 검색</h2>
            <p className="room-search__desc">
              인수인계 · 공지·변경 · 할일·일정 · 리뷰 · 택시 · 연락처 · 고객 안내
            </p>
          </div>
          <button type="button" className="icon-btn room-search__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="room-search__search-wrap">
          <span className="room-search__search-icon" aria-hidden>
            🔍
          </span>
          <input
            className="room-search__input"
            type="search"
            placeholder="객실, 이름, 제목, 공지·할일 내용…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        {hits.length > 0 ? (
          <div className="room-search__tabs" role="tablist" aria-label="검색 결과 종류">
            {KIND_TABS.map((tab) => {
              const count = tabCount(tab.id);
              if (tab.id !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={kindTab === tab.id}
                  className={`room-search__tab${kindTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setKindTab(tab.id)}
                >
                  {tab.label}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="room-search__results" aria-live="polite">
          {loading ? (
            <div className="room-search__state">
              <span className="room-search__spinner" aria-hidden />
              <p>검색 중…</p>
            </div>
          ) : null}

          {showRecent ? (
            <div className="room-search__recent">
              <p className="room-search__recent-label">최근 검색</p>
              <div className="room-search__recent-list">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="room-search__recent-btn"
                    onClick={() => selectRecent(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showHint && !showRecent ? (
            <div className="room-search__state room-search__state--hint">
              <p>2자 이상 입력</p>
              <small>예: 1502, 키오스크, 홍길동, 세프로</small>
            </div>
          ) : null}

          {showEmpty ? (
            <div className="room-search__state room-search__state--empty">
              <p>「{trimmed}」 검색 결과 없음{kindTab !== 'all' ? ` (${tabEmptyLabel(kindTab)})` : ''}</p>
              <small>제목·내용·객실·이름·연락처 등 전체 데이터에서 찾습니다.</small>
            </div>
          ) : null}

          {!loading && filteredHits.length > 0 ? (
            <ul className="room-search__list">
              {filteredHits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <Link href={hit.href} className="room-search__hit" onClick={handleHitClick}>
                    <div className="room-search__hit-top">
                      <span className={`room-search__badge room-search__badge--${hit.kind}`}>
                        {KIND_LABELS[hit.kind]}
                      </span>
                      <time className="room-search__date" dateTime={hit.at}>
                        {formatRoomSearchAt(hit.at)}
                      </time>
                    </div>
                    <p className="room-search__hit-title">
                      <SearchHighlight text={hit.title} query={trimmed} />
                    </p>
                    <p className="room-search__hit-sub">
                      <SearchHighlight text={hit.subtitle} query={trimmed} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="room-search__footer">
          <span>Esc 닫기</span>
          {!loading && filteredHits.length > 0 ? <span>{filteredHits.length}건</span> : null}
        </footer>
      </div>
    </div>
  );
}
