import type { NoticeType } from '@/lib/handover/types';

export function noticeTypeLabel(type: NoticeType): string {
  return type === 'announcement' ? '업무 공지' : '업무 변경';
}

export function noticeTypeShort(type: NoticeType): string {
  return type === 'announcement' ? '공지' : '변경';
}

/** 목록에 표시할 제목 — 첫 줄을 제목처럼 사용 */
export function noticeListTitle(content: string): string {
  const line = content
    .split('\n')
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return '(내용 없음)';
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}
