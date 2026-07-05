export const SITUATION_GUIDELINE_REPORT_TO_LABEL = '내부 전달';
export const SITUATION_GUIDELINE_REPORT_TO_HINT = '매니저 · 팀장 · 타 부서 담당 등';

export const SITUATION_GUIDELINE_CATEGORIES = [
  '시설·장비',
  '비품·용품',
  '공사·점검',
  '연락·보고',
  '긴급',
  '일반',
] as const;

export type SituationGuidelineCategory = (typeof SITUATION_GUIDELINE_CATEGORIES)[number];

export const SITUATION_GUIDELINE_FILTER_TABS = ['전체', ...SITUATION_GUIDELINE_CATEGORIES] as const;

export type SituationGuidelineFilterTab = (typeof SITUATION_GUIDELINE_FILTER_TABS)[number];

export type SituationGuideline = {
  id: string;
  hotel_id: string;
  title: string;
  body: string;
  category: SituationGuidelineCategory;
  contact_name: string;
  contact_phone: string;
  report_to: string;
  keywords: string[];
  is_pinned: boolean;
  sort_order: number;
  author: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SituationGuidelineInput = {
  title: string;
  body: string;
  category: SituationGuidelineCategory;
  contact_name: string;
  contact_phone: string;
  report_to: string;
  keywords: string[];
  is_pinned?: boolean;
  sort_order?: number;
  author: string;
};

export function parseKeywordsInput(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatKeywordsInput(keywords: string[]): string {
  return keywords.join(', ');
}

export function formatUpdatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
