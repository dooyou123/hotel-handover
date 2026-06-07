import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { AuditContext } from '@/lib/handover/types';

type LogActivityInput = {
  entityType: string;
  entityId?: string | null;
  action: string;
  audit: AuditContext;
  summary: string;
  details?: Record<string, unknown> | null;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('activity_logs').insert({
    hotel_id: DEFAULT_HOTEL_ID,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    shift: input.audit.shift,
    staff_name: input.audit.staffName,
    summary: input.summary,
    details: input.details ?? null,
  });

  if (error) {
    console.error('activity log failed', error.message);
  }
}

export function cardSummaryLabel(room: string, title: string): string {
  const prefix = room.trim() ? `[${room.trim()}] ` : '';
  return `${prefix}${title}`;
}

export const ACTION_LABELS: Record<string, string> = {
  create: '추가',
  update: '수정',
  delete: '삭제',
  move: '이동',
  clear_done: '완료칸 비우기',
};
