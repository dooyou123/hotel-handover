import type { SopArticle } from '@/lib/sop/types';

export type SopSearchHit = SopArticle & { score: number };

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function tokenizeQuery(query: string): string[] {
  return query
    .split(/[\s,·/]+/)
    .map(normalizeToken)
    .filter((token) => token.length >= 1);
}

/** 제목·본문·키워드·카테고리 기준 점수 검색 */
export function searchSopArticles(articles: SopArticle[], query: string): SopSearchHit[] {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) {
    return articles.map((article) => ({ ...article, score: article.is_pinned ? 1 : 0 }));
  }

  const hits: SopSearchHit[] = [];

  for (const article of articles) {
    const title = article.title.toLowerCase();
    const body = article.body.toLowerCase();
    const category = article.category.toLowerCase();
    const keywords = article.keywords.map((k) => k.toLowerCase());

    let score = 0;
    for (const token of tokens) {
      if (title.includes(token)) score += 10;
      if (keywords.some((k) => k.includes(token) || token.includes(k))) score += 8;
      if (category.includes(token)) score += 5;
      if (body.includes(token)) score += 2;
    }

    if (score > 0) {
      if (article.is_pinned) score += 1;
      hits.push({ ...article, score });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'ko'));
}

/** 인수인계 카드 작성 시 관련 SOP 추천 */
export function suggestSopArticles(
  articles: SopArticle[],
  input: { title: string; details: string; category: string },
  limit = 3,
): SopSearchHit[] {
  const combined = [input.title, input.details, input.category].filter(Boolean).join(' ');
  if (!combined.trim()) return [];

  const hits = searchSopArticles(articles, combined);
  return hits.slice(0, limit);
}

export function formatKeywordsInput(keywords: string[]): string {
  return keywords.join(', ');
}

export function parseKeywordsInput(raw: string): string[] {
  return raw
    .split(/[,，\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
