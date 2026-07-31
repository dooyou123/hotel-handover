import { COLUMN_LABELS, PRIORITY_LABELS } from '@/lib/handover/constants';
import { summarizeChecklistChanges } from '@/lib/handover/checklist';
import type { Card, CardInput, ColumnId, Priority } from '@/lib/handover/types';

const TEXT_PREVIEW_LENGTH = 24;

function textPreview(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return '없음';
  if (normalized.length <= TEXT_PREVIEW_LENGTH) return `"${normalized}"`;
  return `"${normalized.slice(0, TEXT_PREVIEW_LENGTH)}…"`;
}

function columnLabel(value: string): string {
  return COLUMN_LABELS[value as ColumnId] ?? value;
}

function priorityLabel(value: string): string {
  return PRIORITY_LABELS[value as Priority] ?? value;
}

function dueLabel(value: string | null): string {
  if (!value) return '없음';
  return value.slice(0, 10);
}

/**
 * 카드 수정 전/후를 비교해 사람이 읽을 수 있는 변경 목록을 만든다.
 * 상태(column_id) 변경은 move 로그의 from/to로 따로 기록하므로 여기서 제외한다.
 */
export function buildCardChangeSummary(before: Card, input: Partial<CardInput>): string[] {
  const changes: string[] = [];

  const textChanged = (prev: string, next: string | undefined): next is string =>
    next !== undefined && next.trim() !== prev.trim();

  if (input.priority !== undefined && input.priority !== before.priority) {
    changes.push(`중요도: ${priorityLabel(before.priority)} → ${priorityLabel(input.priority)}`);
  }
  if (textChanged(before.category, input.category)) {
    changes.push(`분류: ${before.category.trim() || '기타'} → ${input.category.trim() || '기타'}`);
  }
  if (textChanged(before.room, input.room)) {
    changes.push(`객실: ${before.room.trim() || '미지정'} → ${input.room.trim() || '미지정'}`);
  }
  if (textChanged(before.title, input.title)) {
    changes.push(`제목: ${textPreview(before.title)} → ${textPreview(input.title)}`);
  }
  if (textChanged(before.details, input.details)) {
    changes.push(`상세: ${textPreview(before.details)} → ${textPreview(input.details)}`);
  }
  if (textChanged(before.next_action, input.next_action)) {
    changes.push(`다음 조치: ${textPreview(before.next_action)} → ${textPreview(input.next_action)}`);
  }
  if (textChanged(before.resolution, input.resolution)) {
    changes.push(`처리 결과: ${textPreview(before.resolution)} → ${textPreview(input.resolution)}`);
  }
  if (textChanged(before.assignee_name, input.assignee_name)) {
    changes.push(`담당: ${before.assignee_name.trim() || '미지정'} → ${input.assignee_name.trim() || '미지정'}`);
  }
  if (
    input.assignee_shift !== undefined &&
    input.assignee_shift.trim() !== before.assignee_shift.trim() &&
    // 담당자가 그대로인데 조만 바뀐 경우만 따로 표시
    !(input.assignee_name !== undefined && input.assignee_name.trim() !== before.assignee_name.trim())
  ) {
    changes.push(`담당 조: ${before.assignee_shift.trim() || '미지정'} → ${input.assignee_shift.trim() || '미지정'}`);
  }
  if (input.due_at !== undefined && (input.due_at ?? null) !== (before.due_at ?? null)) {
    changes.push(`기한: ${dueLabel(before.due_at)} → ${dueLabel(input.due_at)}`);
  }
  if (textChanged(before.author, input.author)) {
    changes.push(`작성자: ${before.author.trim() || '미입력'} → ${input.author.trim() || '미입력'}`);
  }

  if (input.checklist !== undefined) {
    changes.push(...summarizeChecklistChanges(before.checklist ?? [], input.checklist));
  }

  const remediesChanged =
    input.complaint_remedies !== undefined &&
    [...(before.complaint_remedies ?? [])].sort().join('|') !==
      [...input.complaint_remedies].sort().join('|');
  const remedyOtherChanged =
    input.complaint_remedy_other !== undefined &&
    input.complaint_remedy_other.trim() !== (before.complaint_remedy_other ?? '').trim();
  if (remediesChanged || remedyOtherChanged) {
    changes.push('보상 내역 변경');
  }

  return changes;
}

/** 모달 저장으로 상태가 바뀔 때 오늘 기록 summary 접두어 (기존 빠른 동작 로그와 통일) */
export function cardMoveSummaryPrefix(from: string, to: string): string {
  if (to === 'done') return '완료';
  if (to === 'hold') return '보류';
  if (from === 'hold' && to === 'progress') return '재개';
  return '이동';
}
