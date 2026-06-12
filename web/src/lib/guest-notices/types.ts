export const GUEST_NOTICE_CATEGORIES = ['안내', '공사', '비상', '기타'] as const;
export type GuestNoticeCategory = (typeof GUEST_NOTICE_CATEGORIES)[number];

export const GUEST_NOTICE_STATUSES = ['draft', 'published', 'archived'] as const;
export type GuestNoticeStatus = (typeof GUEST_NOTICE_STATUSES)[number];

export const GUEST_NOTICE_STATUS_LABELS: Record<GuestNoticeStatus, string> = {
  draft: '작성 중',
  published: '게시',
  archived: '보관',
};

export const GUEST_NOTICE_LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
export type GuestNoticeLocale = (typeof GUEST_NOTICE_LOCALES)[number];

export const GUEST_NOTICE_LOCALE_LABELS: Record<GuestNoticeLocale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export type GuestNotice = {
  id: string;
  hotel_id: string;
  title: string;
  category: GuestNoticeCategory;
  status: GuestNoticeStatus;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  valid_from: string | null;
  valid_until: string | null;
  author: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GuestNoticeInput = {
  title: string;
  category: GuestNoticeCategory;
  status: GuestNoticeStatus;
  body_ko: string;
  body_en: string;
  body_zh: string;
  body_ja: string;
  valid_from: string | null;
  valid_until: string | null;
  author: string;
  sort_order?: number;
};

export type GuestNoticeLog = {
  id: string;
  hotel_id: string;
  notice_id: string;
  action: 'viewed' | 'printed' | 'confirmed';
  staff_name: string;
  work_group: string;
  notes: string;
  created_at: string;
};

export const GUEST_NOTICE_LOG_LABELS: Record<GuestNoticeLog['action'], string> = {
  viewed: '열람',
  printed: '출력',
  confirmed: '확인',
};

export function noticeBodyForLocale(notice: GuestNotice, locale: GuestNoticeLocale): string {
  if (locale === 'en') return notice.body_en || notice.body_ko;
  if (locale === 'zh') return notice.body_zh || notice.body_ko;
  if (locale === 'ja') return notice.body_ja || notice.body_ko;
  return notice.body_ko;
}
