import type { SituationGuideline, SituationGuidelineFilterTab } from '@/lib/situation-guidelines/types';

function searchableText(guideline: SituationGuideline): string {
  return [
    guideline.title,
    guideline.body,
    guideline.category,
    guideline.contact_name,
    guideline.contact_phone,
    guideline.report_to,
    guideline.keywords.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function filterSituationGuidelines(
  guidelines: SituationGuideline[],
  options: { query: string; category: SituationGuidelineFilterTab },
): SituationGuideline[] {
  const q = options.query.trim().toLowerCase();
  return guidelines
    .filter((guideline) => {
      if (options.category !== '전체' && guideline.category !== options.category) return false;
      if (!q) return true;
      return searchableText(guideline).includes(q);
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.title.localeCompare(b.title, 'ko');
    });
}

export function countGuidelinesByCategory(guidelines: SituationGuideline[]): Record<string, number> {
  const counts: Record<string, number> = { 전체: guidelines.length };
  for (const guideline of guidelines) {
    counts[guideline.category] = (counts[guideline.category] ?? 0) + 1;
  }
  return counts;
}

export function bodyPreview(body: string, maxLines = 2): string {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(0, maxLines).join(' · ');
}
