export const SOP_CATEGORIES = [
  '긴급대응',
  '체크인/아웃',
  '결제/환불',
  '컴플레인',
  '시설',
  '유실물',
  '일반',
] as const;

export type SopCategory = (typeof SOP_CATEGORIES)[number];

export type SopArticle = {
  id: string;
  hotel_id: string;
  title: string;
  body: string;
  category: SopCategory;
  keywords: string[];
  is_pinned: boolean;
  sort_order: number;
  author_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SopArticleInput = {
  title: string;
  body: string;
  category: SopCategory;
  keywords: string[];
  is_pinned: boolean;
  sort_order: number;
  author_name: string;
};
