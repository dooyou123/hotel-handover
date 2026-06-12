'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { searchGlobal, type GlobalSearchHit } from '@/lib/room-search/api';
import { formatRoomSearchAt } from '@/lib/room-search/format';

const KIND_LABELS: Record<GlobalSearchHit['kind'], string> = {
  handover: '인수인계',
  facility: '시설·컴플레인',
  review: '리뷰',
  transport: '택시 예약',
  notice: '게시판',
  todo: '업무 일정',
  contact: '연락처',
  guest_notice: '고객 안내',
};

type RoomSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RoomSearchModal({ open, onClose }: RoomSearchModalProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHits([]);
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
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  const trimmed = query.trim();
  const showHint = !loading && trimmed.length < 2;
  const showEmpty = !loading && trimmed.length >= 2 && !hits.length;

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
              인수인계 · 게시판 · 할일 · 리뷰 · 택시 · 연락처 · 고객 안내
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
            placeholder="객실, 이름, 제목, 내용, 연락처…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        <div className="room-search__results" aria-live="polite">
          {loading ? (
            <div className="room-search__state">
              <span className="room-search__spinner" aria-hidden />
              <p>검색 중…</p>
            </div>
          ) : null}

          {showHint ? (
            <div className="room-search__state room-search__state--hint">
              <p>2자 이상 입력</p>
              <small>예: 1502, 키오스크, 홍길동, 세프로</small>
            </div>
          ) : null}

          {showEmpty ? (
            <div className="room-search__state room-search__state--empty">
              <p>「{trimmed}」 검색 결과 없음</p>
              <small>제목·내용·객실·이름·연락처 등 전체 데이터에서 찾습니다.</small>
            </div>
          ) : null}

          {!loading && hits.length > 0 ? (
            <ul className="room-search__list">
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <Link href={hit.href} className="room-search__hit" onClick={onClose}>
                    <div className="room-search__hit-top">
                      <span className={`room-search__badge room-search__badge--${hit.kind}`}>
                        {KIND_LABELS[hit.kind]}
                      </span>
                      <time className="room-search__date" dateTime={hit.at}>
                        {formatRoomSearchAt(hit.at)}
                      </time>
                    </div>
                    <p className="room-search__hit-title">{hit.title}</p>
                    <p className="room-search__hit-sub">{hit.subtitle}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="room-search__footer">
          <span>Esc 닫기</span>
          {!loading && hits.length > 0 ? <span>{hits.length}건</span> : null}
        </footer>
      </div>
    </div>
  );
}
