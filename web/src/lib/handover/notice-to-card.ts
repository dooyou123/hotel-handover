import { noticeListTitle } from '@/lib/handover/notice-utils';
import { EMPTY_COMPLAINT_REMEDIES } from '@/lib/handover/complaint-remedies';
import type { CardInput, Notice } from '@/lib/handover/types';

/** 공지/변경 본문에서 객실 번호 추출 */
export function extractRoomFromText(text: string): string {
  const vip = text.match(/(?:VIP|vip)\s*(\d{3,4})/);
  if (vip?.[1]) return vip[1];
  const withHo = text.match(/\b(\d{3,4})\s*호\b/);
  if (withHo?.[1]) return withHo[1];
  const plain = text.match(/\b(\d{3,4})\b/);
  return plain?.[1] ?? '';
}

/** 게시글 → 인수인계 작성 초안 */
export function cardInputFromNotice(notice: Notice, authorLabel: string): CardInput {
  const title = noticeListTitle(notice.content);
  const lines = notice.content.split('\n').map((line) => line.trim()).filter(Boolean);
  const bodyLines = lines.length > 1 ? lines.slice(1).join('\n') : '';
  const sourceLabel = notice.type === 'change' ? '업무 변경' : '업무 공지';
  const details = bodyLines
    ? `${bodyLines}\n\n— 게시판 ${sourceLabel}`
    : `${notice.content}\n\n— 게시판 ${sourceLabel}`;

  return {
    column_id: 'progress',
    priority: notice.type === 'change' ? 'today' : 'info',
    category: '기타',
    room: extractRoomFromText(notice.content),
    title,
    details,
    resolution: '',
    next_action: '',
    author: notice.author || authorLabel,
    assignee_shift: '',
    assignee_name: '',
    due_at: null,
    ...EMPTY_COMPLAINT_REMEDIES,
  };
}
