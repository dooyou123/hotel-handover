import { extractRoomFromText } from '@/lib/handover/notice-to-card';
import { EMPTY_COMPLAINT_REMEDIES } from '@/lib/handover/complaint-remedies';
import type { CardInput } from '@/lib/handover/types';
import {
  HK_STATUS_NOTE_FIELDS,
  type HousekeepingSpecialDraft,
  type HkStatusNoteKey,
} from '@/lib/housekeeping/types';

export const HK_HANDOVER_DRAFT_KEY = 'handover-hk-create-draft';

const HANDOVER_NOTE_KEYS = new Set<HkStatusNoteKey>([
  'hk_out_of_order',
  'hk_maintenance_attention',
  'hk_maintenance_notes',
  'hk_vip_prep',
]);

const NOTE_CATEGORY: Partial<Record<HkStatusNoteKey, string>> = {
  hk_out_of_order: '시설',
  hk_maintenance_attention: '시설',
  hk_maintenance_notes: '시설',
  hk_vip_prep: '체크인/아웃',
};

export function canCreateHandoverFromStatusNote(key: HkStatusNoteKey): boolean {
  return HANDOVER_NOTE_KEYS.has(key);
}

export function stashHkHandoverDraft(input: CardInput): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HK_HANDOVER_DRAFT_KEY, JSON.stringify(input));
  } catch {
    /* ignore */
  }
}

export function consumeHkHandoverDraft(): CardInput | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HK_HANDOVER_DRAFT_KEY);
    sessionStorage.removeItem(HK_HANDOVER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CardInput;
  } catch {
    return null;
  }
}

function statusNoteLabel(key: HkStatusNoteKey): string {
  return HK_STATUS_NOTE_FIELDS.find((field) => field.key === key)?.label ?? key;
}

export function cardInputFromHkStatusNote(
  key: HkStatusNoteKey,
  text: string,
  authorLabel: string,
): CardInput {
  const trimmed = text.trim();
  const room = extractRoomFromText(trimmed);
  const label = statusNoteLabel(key);
  return {
    column_id: 'progress',
    priority: key === 'hk_out_of_order' ? 'today' : 'info',
    category: NOTE_CATEGORY[key] ?? '시설',
    room,
    title: room ? `${room} ${label}` : label,
    details: `${trimmed}\n\n— 하우스키핑 ${label}`,
    resolution: '',
    next_action: '',
    author: authorLabel,
    assignee_shift: '',
    assignee_name: '',
    due_at: null,
    ...EMPTY_COMPLAINT_REMEDIES,
  };
}

export function cardInputFromHkSpecialRoom(room: HousekeepingSpecialDraft, authorLabel: string): CardInput {
  const tags: string[] = [];
  if (room.is_vip) tags.push('VIP');
  if (room.is_long_stay) tags.push('장박');
  if (room.early_checkin.trim()) tags.push(`일찍 체크인 ${room.early_checkin.trim()}`);
  const titleParts = [room.room_number.trim(), ...tags].filter(Boolean);
  const detailLines = [
    room.notes.trim(),
    room.early_checkin.trim() ? `일찍 체크인: ${room.early_checkin.trim()}` : '',
    room.is_vip ? 'VIP 객실' : '',
    room.is_long_stay ? '장박 객실' : '',
  ].filter(Boolean);

  return {
    column_id: 'progress',
    priority: room.is_vip ? 'today' : 'info',
    category: '체크인/아웃',
    room: room.room_number.trim(),
    title: titleParts.length ? titleParts.join(' · ') : 'HK 특이 객실',
    details: detailLines.length
      ? `${detailLines.join('\n')}\n\n— 하우스키핑 특이 객실`
      : '— 하우스키핑 특이 객실',
    resolution: '',
    next_action: '',
    author: authorLabel,
    assignee_shift: '',
    assignee_name: '',
    due_at: null,
    ...EMPTY_COMPLAINT_REMEDIES,
  };
}
