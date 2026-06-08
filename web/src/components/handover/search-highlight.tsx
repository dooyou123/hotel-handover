'use client';

import { splitTextBySearchQuery } from '@/lib/handover/card-utils';

type SearchHighlightProps = {
  text: string;
  query: string;
  className?: string;
};

export function SearchHighlight({ text, query, className }: SearchHighlightProps) {
  const parts = splitTextBySearchQuery(text, query);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}
