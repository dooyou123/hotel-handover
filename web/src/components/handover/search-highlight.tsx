'use client';

import { splitTextBySearchQuery } from '@/lib/handover/card-utils';

type SearchHighlightProps = {
  text: string;
  query: string;
  className?: string;
};

function renderHighlightedLine(text: string, query: string, lineKey: string) {
  const parts = splitTextBySearchQuery(text, query);

  return parts.map((part, index) =>
    part.match ? (
      <mark key={`${lineKey}-${index}`} className="search-mark">
        {part.text}
      </mark>
    ) : (
      <span key={`${lineKey}-${index}`}>{part.text}</span>
    ),
  );
}

export function SearchHighlight({ text, query, className }: SearchHighlightProps) {
  const lines = text.split('\n');

  return (
    <span className={className}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 ? <br /> : null}
          {renderHighlightedLine(line, query, String(lineIndex))}
        </span>
      ))}
    </span>
  );
}
