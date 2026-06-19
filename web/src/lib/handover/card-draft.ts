import type { CardInput } from '@/lib/handover/types';
import { EMPTY_COMPLAINT_REMEDIES } from '@/lib/handover/complaint-remedies';

const STORAGE_KEY = 'handover-card-create-draft';

export const DEFAULT_CARD_INPUT: CardInput = {
  column_id: 'progress',
  priority: 'today',
  category: '기타',
  room: '',
  title: '',
  details: '',
  resolution: '',
  next_action: '',
  author: '',
  assignee_shift: '',
  assignee_name: '',
  due_at: null,
  ...EMPTY_COMPLAINT_REMEDIES,
};

/** 세션 스토리지·HMR 등으로 필드가 빠진 폼을 안전하게 복원 */
export function normalizeCardInput(form: Partial<CardInput>): CardInput {
  return {
    ...DEFAULT_CARD_INPUT,
    ...form,
    complaint_remedies: form.complaint_remedies ?? [],
    complaint_remedy_other: form.complaint_remedy_other ?? '',
  };
}

export type CardCreateDraft = {
  form: CardInput;
  dueDate: string;
  dueTime: string;
  updatedAt: string;
};

export function hasCardDraftContent(form: Partial<CardInput>): boolean {
  const normalized = normalizeCardInput(form);
  return Boolean(
    normalized.title.trim() ||
      normalized.details.trim() ||
      normalized.next_action.trim() ||
      normalized.resolution.trim() ||
      normalized.room.trim() ||
      normalized.complaint_remedies.length > 0 ||
      normalized.complaint_remedy_other.trim(),
  );
}

export function loadCardCreateDraft(): CardCreateDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardCreateDraft;
    if (!parsed?.form) return null;
    return {
      ...parsed,
      form: normalizeCardInput(parsed.form),
    };
  } catch {
    return null;
  }
}

export function saveCardCreateDraft(draft: CardCreateDraft): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota or private mode */
  }
}

export function clearCardCreateDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type CardFormSnapshot = {
  form: CardInput;
  dueDate: string;
  dueTime: string;
};

export function cardFormSnapshotsEqual(a: CardFormSnapshot, b: CardFormSnapshot): boolean {
  return (
    a.dueDate === b.dueDate &&
    a.dueTime === b.dueTime &&
    a.form.column_id === b.form.column_id &&
    a.form.priority === b.form.priority &&
    a.form.category === b.form.category &&
    a.form.room === b.form.room &&
    a.form.title === b.form.title &&
    a.form.details === b.form.details &&
    a.form.resolution === b.form.resolution &&
    a.form.next_action === b.form.next_action &&
    a.form.author === b.form.author &&
    a.form.assignee_shift === b.form.assignee_shift &&
    a.form.assignee_name === b.form.assignee_name &&
    a.form.due_at === b.form.due_at &&
    (a.form.complaint_remedies ?? []).join('\0') === (b.form.complaint_remedies ?? []).join('\0') &&
    (a.form.complaint_remedy_other ?? '') === (b.form.complaint_remedy_other ?? '')
  );
}
