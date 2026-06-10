'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { suggestSopArticles } from '@/lib/sop/search';
import { useSopArticles } from '@/lib/sop/use-sop';

type SopSuggestionsProps = {
  title: string;
  details: string;
  category: string;
  onSelect?: (articleId: string) => void;
};

export function SopSuggestions({ title, details, category, onSelect }: SopSuggestionsProps) {
  const { articles } = useSopArticles();

  const suggestions = useMemo(
    () => suggestSopArticles(articles, { title, details, category }),
    [articles, title, details, category],
  );

  if (!suggestions.length) return null;

  return (
    <div className="sop-suggest">
      <div className="sop-suggest__head">
        <span>📖 관련 SOP</span>
        <Link href="/sop" className="sop-suggest__link">
          전체 보기
        </Link>
      </div>
      <ul className="sop-suggest__list">
        {suggestions.map((article) => (
          <li key={article.id}>
            <Link
              href={`/sop?article=${article.id}`}
              className="sop-suggest__item"
              onClick={() => onSelect?.(article.id)}
            >
              <span className="sop-suggest__category">{article.category}</span>
              <strong>{article.title}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
