'use client';

import { useEffect, useState } from 'react';
import { fetchSimilarHistory, type SimilarHistoryHit } from '@/lib/handover/similar-history';

type CardSimilarHistoryProps = {
  room: string;
  excludeCardId?: string;
  onApply: (hit: SimilarHistoryHit) => void;
};

function formatAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function CardSimilarHistory({ room, excludeCardId, onApply }: CardSimilarHistoryProps) {
  const [hits, setHits] = useState<SimilarHistoryHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = room.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchSimilarHistory(trimmed, { excludeCardId, limit: 4 })
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 320);

    return () => window.clearTimeout(timer);
  }, [room, excludeCardId]);

  if (room.trim().length < 2) return null;

  return (
    <section className="card-similar-history">
      <h4 className="card-similar-history__title">유사 이력 · {room.trim()}호</h4>
      {loading ? <p className="card-similar-history__hint">불러오는 중…</p> : null}
      {!loading && !hits.length ? (
        <p className="card-similar-history__hint">최근 6개월 내 유사 이력이 없습니다.</p>
      ) : null}
      {!loading && hits.length ? (
        <ul className="card-similar-history__list">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`} className="card-similar-history__item">
              <div className="card-similar-history__meta">
                <span className={`card-similar-history__kind card-similar-history__kind--${hit.kind}`}>
                  {hit.kind === 'card' ? '인계' : '리뷰'}
                </span>
                <time>{formatAt(hit.at)}</time>
              </div>
              <strong>{hit.title}</strong>
              <p className="card-similar-history__sub">{hit.subtitle}</p>
              {hit.detail ? <p className="card-similar-history__detail">{hit.detail}</p> : null}
              {hit.kind === 'card' && hit.detail ? (
                <button type="button" className="btn btn--ghost btn--small" onClick={() => onApply(hit)}>
                  처리 내용 참고
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
