import type { CardInput } from '@/lib/handover/types';

const STORAGE_KEY = 'handover-card-create-draft';

export type CardCreateDraft = {
  form: CardInput;
  dueDate: string;
  dueTime: string;
  updatedAt: string;
};

export function hasCardDraftContent(form: CardInput): boolean {
  return Boolean(
    form.title.trim() ||
      form.details.trim() ||
      form.next_action.trim() ||
      form.resolution.trim() ||
      form.room.trim(),
  );
}

export function loadCardCreateDraft(): CardCreateDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardCreateDraft;
    if (!parsed?.form) return null;
    return parsed;
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
    a.form.due_at === b.form.due_at
  );
}
