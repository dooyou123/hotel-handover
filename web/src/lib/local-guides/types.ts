export const LOCAL_GUIDE_KINDS = ['transit', 'food', 'convenience', 'other'] as const;
export type LocalGuideKind = (typeof LOCAL_GUIDE_KINDS)[number];

export const LOCAL_GUIDE_KIND_LABELS: Record<LocalGuideKind, string> = {
  transit: '교통',
  food: '맛집',
  convenience: '편의점',
  other: '기타',
};

export const LOCAL_GUIDE_LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
export type LocalGuideLocale = (typeof LOCAL_GUIDE_LOCALES)[number];

export const LOCAL_GUIDE_LOCALE_LABELS: Record<LocalGuideLocale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export type LocalGuide = {
  id: string;
  hotel_id: string;
  title: string;
  kind: LocalGuideKind;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  is_active: boolean;
  author: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type LocalGuideInput = {
  title: string;
  kind: LocalGuideKind;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  is_active: boolean;
  author: string;
  sort_order?: number;
};

export function guideBodyForLocale(guide: LocalGuide, locale: LocalGuideLocale): string {
  if (locale === 'en') return guide.body_en || guide.body_ko;
  if (locale === 'zh') return guide.body_zh || guide.body_ko;
  if (locale === 'ja') return guide.body_ja || guide.body_ko;
  return guide.body_ko;
}

export function localeBodyKey(locale: LocalGuideLocale): 'body_ko' | 'body_en' | 'body_zh' | 'body_ja' {
  if (locale === 'en') return 'body_en';
  if (locale === 'zh') return 'body_zh';
  if (locale === 'ja') return 'body_ja';
  return 'body_ko';
}
