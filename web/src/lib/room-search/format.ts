export function formatRoomSearchAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** PostgREST `.or()` 필터가 깨지지 않도록 검색어를 정리합니다. */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildIlikePattern(query: string): string {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return '';
  // PostgREST .or() 값에 % 등이 깨지지 않도록 따옴표로 감쌉니다.
  const escaped = sanitized.replace(/[%_\\]/g, '\\$&').replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export function searchMatchSnippet(text: string, query: string, maxLen = 96): string {
  const source = text.replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const normalizedQuery = sanitizeSearchQuery(query).toLowerCase();
  if (!normalizedQuery) return source.length > maxLen ? `${source.slice(0, maxLen)}…` : source;

  const lower = source.toLowerCase();
  const idx = lower.indexOf(normalizedQuery);
  if (idx < 0) return source.length > maxLen ? `${source.slice(0, maxLen)}…` : source;

  const start = Math.max(0, idx - 24);
  const end = Math.min(source.length, idx + normalizedQuery.length + 48);
  let snippet = source.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < source.length) snippet = `${snippet}…`;
  return snippet;
}
