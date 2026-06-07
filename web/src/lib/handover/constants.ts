import type { ColumnId, Priority } from '@/lib/handover/types';

export const HANDOVER_COLUMNS: {
  id: ColumnId;
  title: string;
  hint: string;
  columnClass: string;
}[] = [
  {
    id: 'urgent',
    title: '🔴 긴급',
    hint: '다음 교대가 반드시 확인·처리',
    columnClass: 'column--urgent',
  },
  {
    id: 'progress',
    title: '🟡 진행중',
    hint: '처리 중이거나 오늘 중 마무리',
    columnClass: 'column--progress',
  },
  {
    id: 'done',
    title: '✅ 완료',
    hint: '처리 완료 — 교대 끝나면 비우기',
    columnClass: 'column--done',
  },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '🔴 긴급',
  today: '🟡 오늘',
  info: '⚪ 참고',
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  urgent: '🔴 긴급',
  progress: '🟡 진행중',
  done: '✅ 완료',
};

export const CATEGORY_OPTIONS = [
  'VIP',
  '체크인/아웃',
  '룸이슈',
  '결제',
  '민원',
  '유실물',
  '공용',
  '기타',
] as const;

export const QUICK_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'unacked', label: '미확인 긴급' },
  { id: 'mine', label: '내 담당' },
  { id: 'roomclean', label: '룸클린' },
  { id: 'VIP', label: 'VIP' },
  { id: '결제', label: '결제' },
  { id: '민원', label: '민원' },
  { id: '룸이슈', label: '룸이슈' },
] as const;

export const HIGHLIGHT_KEYWORDS = ['119', '112', '경찰', 'VIP', '환불', '응급', '미수금', '소음'];
