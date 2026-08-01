import { ACTION_LABELS } from '@/lib/handover/activity';
import { COLUMN_LABELS } from '@/lib/handover/constants';
import { formatAsideRecordTime } from '@/lib/handover/shift-ui-state';
import type { ActivityLog } from '@/lib/handover/types';

export const ENTITY_LABELS: Record<string, string> = {
  card: '인수인계',
  notice: '게시판',
};

export function activityTargetLabel(summary: string): string {
  // '사건 연결'은 과거 기록용 접두어 — 새 기록은 '카드 연결'로 남는다
  return summary.replace(/^(추가|수정|삭제|완료|댓글|이동|공지|보관|복원|휴지통 복원|영구 삭제|카드 연결 해제|카드 연결|사건 연결 해제|사건 연결|고정 해제|고정):\s*/, '').trim();
}

export function activityBadgeLabel(log: ActivityLog): string {
  if (log.action === 'update' && log.summary.startsWith('댓글:')) return '댓글';
  if (log.action === 'move' && log.summary.startsWith('완료:')) return '완료';
  return ACTION_LABELS[log.action] || log.action;
}

export function activityBadgeTone(log: ActivityLog): '' | 'create' | 'delete' | 'move' | 'comment' {
  if (log.action === 'delete') return 'delete';
  if (log.action === 'create') return 'create';
  if (log.action === 'update' && log.summary.startsWith('댓글:')) return 'comment';
  if (log.action === 'move') return 'move';
  return '';
}

export function formatActivityActor(log: ActivityLog): string {
  if (log.shift && log.staff_name) return `${log.staff_name} (${log.shift})`;
  if (log.staff_name) return log.staff_name;
  if (log.shift) return log.shift;
  return '작성자 미입력';
}

export function formatActivityHeadline(log: ActivityLog): string {
  const target = activityTargetLabel(log.summary);
  const entity = ENTITY_LABELS[log.entity_type] ?? log.entity_type;

  if (log.entity_type === 'notice') {
    if (log.action === 'create') return `게시판에 글을 등록했습니다 — ${target}`;
    if (log.action === 'update') return `게시판 글을 수정했습니다 — ${target}`;
    if (log.action === 'delete') return `게시판 글을 삭제했습니다 — ${target}`;
  }

  switch (log.action) {
    case 'create':
      return `${entity} 항목을 새로 등록했습니다`;
    case 'delete':
      return `${entity} 항목을 삭제했습니다`;
    case 'move': {
      if (log.details?.quick === true) return '목록에서 빠르게 완료 처리했습니다';
      const from = typeof log.details?.from === 'string' ? log.details.from : '';
      const to = typeof log.details?.to === 'string' ? log.details.to : '';
      if (from && to) {
        const fromLabel = COLUMN_LABELS[from as keyof typeof COLUMN_LABELS] ?? from;
        const toLabel = COLUMN_LABELS[to as keyof typeof COLUMN_LABELS] ?? to;
        return `${fromLabel} → ${toLabel} 으로 변경했습니다`;
      }
      if (log.summary.startsWith('완료:')) return '완료 처리했습니다';
      return `${entity} 상태를 변경했습니다`;
    }
    case 'update':
      if (log.summary.startsWith('댓글:')) return '댓글을 남겼습니다';
      return `${entity} 내용을 수정했습니다`;
    case 'link':
      return `다른 카드와 연계로 연결했습니다 — ${target}`;
    case 'unlink':
      return '카드 연결을 해제했습니다';
    case 'pin':
      return '카드를 목록 상단에 고정했습니다';
    case 'unpin':
      return '카드 고정을 해제했습니다';
    case 'archive_done':
      return '완료된 인수인계를 보관함으로 옮겼습니다';
    case 'restore_archive':
      return '보관함에서 인수인계를 복원했습니다';
    case 'trash_restore':
      return '휴지통에서 인수인계를 복원했습니다';
    case 'trash_purge':
      return '휴지통에서 완전히 삭제했습니다';
    case 'clear_done':
      return '완료 칸을 비웠습니다';
    default:
      return log.summary;
  }
}

export function formatActivityDetail(log: ActivityLog): string {
  if (!log.details) return '';

  if (log.action === 'move' && log.details.quick === true) return '목록 ✓ 완료 버튼';

  // 변경 필드 목록이 있으면 그것이 가장 구체적인 정보다 (move의 from→to는 headline이 이미 보여준다)
  const changes = log.details.changes;
  if (Array.isArray(changes) && changes.length) {
    return changes.map((item) => String(item)).join('\n');
  }

  if (log.action === 'move') {
    const from = typeof log.details.from === 'string' ? log.details.from : '';
    const to = typeof log.details.to === 'string' ? log.details.to : '';
    if (from && to) {
      const fromLabel = COLUMN_LABELS[from as keyof typeof COLUMN_LABELS] ?? from;
      const toLabel = COLUMN_LABELS[to as keyof typeof COLUMN_LABELS] ?? to;
      return `${fromLabel} → ${toLabel}`;
    }
  }

  if (typeof log.details.reason === 'string') return log.details.reason;
  return '';
}

export type ActivityVisualTone =
  | 'comment'
  | 'update'
  | 'create'
  | 'delete'
  | 'move'
  | 'default';

export type ActivityVisual = {
  icon: string;
  tone: ActivityVisualTone;
  shortLabel: string;
};

export function activityVisual(log: ActivityLog): ActivityVisual {
  const badge = activityBadgeLabel(log);
  if (badge === '댓글') return { icon: '💬', tone: 'comment', shortLabel: '댓글' };
  if (badge === '수정') return { icon: '✏️', tone: 'update', shortLabel: '수정' };
  if (badge === '추가') return { icon: '➕', tone: 'create', shortLabel: '추가' };
  if (badge === '삭제') return { icon: '🗑', tone: 'delete', shortLabel: '삭제' };
  if (badge === '완료' || badge === '이동') return { icon: '✓', tone: 'move', shortLabel: badge };
  return { icon: '•', tone: 'default', shortLabel: badge };
}

/** 피드 제목 — 객실·카드 제목 등 핵심 대상 */
export function activityPreviewTitle(log: ActivityLog): string {
  const target = activityTargetLabel(log.summary);
  if (target) return target;
  return log.summary.replace(/^(추가|수정|삭제|완료|댓글|이동|공지|보관|복원):\s*/, '').trim() || log.summary;
}

export function activityPreviewTooltip(log: ActivityLog): string {
  const title = activityPreviewTitle(log);
  const detail = formatActivityDetail(log);
  const headline = formatActivityHeadline(log);
  return [title, headline !== title ? headline : '', detail].filter(Boolean).join('\n');
}

export function activityPreviewMeta(log: ActivityLog): string {
  return `${formatActivityActor(log)} · ${formatAsideRecordTime(log.created_at)}`;
}
