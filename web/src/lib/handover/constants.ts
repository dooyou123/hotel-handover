import type { ColumnId, Priority } from '@/lib/handover/types';

/** 칸반에 표시하는 칸 (긴급은 우선순위로 진행중 상단에 표시) */
export const HANDOVER_COLUMNS: {
  id: ColumnId;
  title: string;
  hint: string;
  columnClass: string;
}[] = [
  {
    id: 'progress',
    title: '🟡 진행중',
    hint: '지금 처리 중이거나 곧 손봐야 하는 업무',
    columnClass: 'column--progress',
  },
  {
    id: 'hold',
    title: '⏸ 보류',
    hint: '아직 안 끝났지만 지금은 대기 — HK·손님 회신·외부 업체 등',
    columnClass: 'column--hold',
  },
  {
    id: 'done',
    title: '✅ 완료',
    hint: '처리 완료 — 24시간 후 보관함으로 이동',
    columnClass: 'column--done',
  },
];

/** 카드 편집 시 선택 가능한 칸 */
export const CARD_COLUMN_OPTIONS = HANDOVER_COLUMNS;

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '🔴 긴급',
  today: '🟡 오늘',
  info: '⚪ 참고 요망',
};

export const PRIORITY_HINTS: Record<Priority, string> = {
  urgent: '지금 당장 확인·처리. 교대 인수 시 ✓ 긴급 확인이 필요합니다.',
  today: '오늘 안에 처리하면 되는 일.',
  info: '당장 처리할 필요는 없지만, 다음 교대가 참고하면 좋은 내용입니다.',
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  urgent: '🔴 긴급',
  progress: '🟡 진행중',
  hold: '⏸ 보류',
  done: '✅ 완료',
};

export const CATEGORY_OPTIONS = [
  '시설',
  '체크인/아웃',
  '결제',
  '컴플레인',
  '유실물',
  '공용',
  '기타',
] as const;

export const QUICK_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'due-soon', label: '1시간 내 마감' },
  { id: 'hold-long', label: '보류 오래됨' },
  { id: 'mine', label: '내 담당' },
  { id: '컴플레인', label: '컴플레인' },
] as const;

export const HIGHLIGHT_KEYWORDS = ['119', '112', '경찰', '환불', '응급', '미수금', '소음', '컴플레인', '시설'];
