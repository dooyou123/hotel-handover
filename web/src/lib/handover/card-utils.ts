import { HIGHLIGHT_KEYWORDS } from '@/lib/handover/constants';
import { formatComplaintRemedies } from '@/lib/handover/complaint-remedies';
import type { Card, CardComment, CardInput, ColumnId, QuickFilter, WorkSession } from '@/lib/handover/types';

export {
  cardAckSummary,
  cardAckStaffSet,
  hasStaffAckedCard,
  isTeamAckPending,
  isUnackedUrgentCard,
  isUnackedUrgentCardForStaff,
} from '@/lib/handover/card-acks';
import { isUnackedUrgentCard } from '@/lib/handover/card-acks';

export type ProjectListSection = {
  id: 'unacked' | 'progress' | 'hold' | 'done' | 'archived';
  title: string;
  cards: Card[];
};

export function isHoldCard(card: Card): boolean {
  return card.column_id === 'hold';
}

export function isWorkingColumn(card: Card): boolean {
  return card.column_id === 'progress' || card.column_id === 'urgent';
}

export function splitTextBySearchQuery(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  let index = lower.indexOf(qLower);

  while (index !== -1) {
    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false });
    }
    parts.push({ text: text.slice(index, index + q.length), match: true });
    start = index + q.length;
    index = lower.indexOf(qLower, start);
  }

  if (start < text.length) {
    parts.push({ text: text.slice(start), match: false });
  }

  return parts.length ? parts : [{ text, match: false }];
}

export function normalizeRoomKey(room: string): string {
  const trimmed = room.trim();
  return trimmed || '미지정';
}

export function cardHasKeyword(card: Card): boolean {
  const text = [card.title, card.details, card.next_action, card.category].join(' ').toLowerCase();
  return HIGHLIGHT_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function isCardOverdue(card: Card): boolean {
  if (!card.due_at || card.column_id === 'done' || isHoldCard(card) || isCardSnoozed(card)) return false;
  return new Date(card.due_at).getTime() < Date.now();
}

const DEFAULT_DUE_SOON_MS = 3_600_000;
export const CARD_SNOOZE_MS = 2 * 3_600_000;

export function isCardSnoozed(card: Card, at = Date.now()): boolean {
  if (!card.snoozed_until) return false;
  return new Date(card.snoozed_until).getTime() > at;
}

export function isCardDueSoon(card: Card, withinMs = DEFAULT_DUE_SOON_MS): boolean {
  if (!card.due_at || card.column_id === 'done' || isHoldCard(card) || isCardSnoozed(card)) return false;
  const due = new Date(card.due_at).getTime();
  const now = Date.now();
  return due >= now && due - now <= withinMs;
}

export function isCardDueActive(card: Card): boolean {
  return Boolean(card.due_at && card.column_id !== 'done' && !isHoldCard(card));
}

export const STALE_MID_HOURS = 4;
export const STALE_HIGH_HOURS = 12;
export const HOLD_STALE_MID_HOURS = 24;
export const HOLD_STALE_HIGH_HOURS = 48;

export function getStaleLevel(card: Card, at = Date.now()): '' | 'mid' | 'high' {
  if (card.column_id === 'done' || isArchivedCard(card) || isHoldCard(card)) return '';
  const date = new Date(card.updated_at || card.created_at);
  if (Number.isNaN(date.getTime())) return '';
  const hours = (at - date.getTime()) / 3_600_000;
  if (hours >= STALE_HIGH_HOURS) return 'high';
  if (hours >= STALE_MID_HOURS) return 'mid';
  return '';
}

export function getHoldStaleLevel(card: Card, at = Date.now()): '' | 'mid' | 'high' {
  if (!isHoldCard(card) || isArchivedCard(card)) return '';
  const date = new Date(card.updated_at || card.created_at);
  if (Number.isNaN(date.getTime())) return '';
  const hours = (at - date.getTime()) / 3_600_000;
  if (hours >= HOLD_STALE_HIGH_HOURS) return 'high';
  if (hours >= HOLD_STALE_MID_HOURS) return 'mid';
  return '';
}

export function isStaleCard(card: Card, at = Date.now()): boolean {
  return getStaleLevel(card, at) !== '';
}

export function isLongHoldCard(card: Card, at = Date.now()): boolean {
  return getHoldStaleLevel(card, at) !== '';
}

export function formatStaleBadge(level: 'mid' | 'high'): string {
  return level === 'high'
    ? `방치 ${STALE_HIGH_HOURS}시간 이상`
    : `방치 ${STALE_MID_HOURS}시간 이상`;
}

export function formatHoldStaleBadge(level: 'mid' | 'high'): string {
  return level === 'high'
    ? `보류 ${HOLD_STALE_HIGH_HOURS}시간 이상`
    : `보류 ${HOLD_STALE_MID_HOURS}시간 이상`;
}

export function needsComplaintFirstResponse(card: Card): boolean {
  return (
    card.category === '컴플레인' &&
    !card.first_response_at &&
    card.column_id !== 'done' &&
    !isArchivedCard(card)
  );
}

export function isBulkArchivableCard(card: Card): boolean {
  return card.column_id === 'done' && !isArchivedCard(card);
}

export function cardMatchesMine(card: Card, session: WorkSession): boolean {
  if (card.column_id === 'done') return false;
  const { shift, name } = session;
  if (!shift && !name) return false;
  if (card.assignee_name && name && card.assignee_name === name) return true;
  if (card.assignee_shift && shift && card.assignee_shift === shift && !card.assignee_name) return true;
  if (card.assignee_shift && shift && card.assignee_name && name) {
    return card.assignee_shift === shift && card.assignee_name === name;
  }
  return false;
}

export function matchesRoomCleanFilter(card: Card): boolean {
  if (card.column_id === 'done') return false;
  const text = [card.title, card.details, card.next_action, card.category].join(' ').toLowerCase();
  return /클린|청소|clean|dirty|룸클린|하우스키핑|hk/.test(text);
}

export function isActiveCard(card: Card): boolean {
  return card.column_id !== 'done';
}

export function isArchivedCard(card: Card): boolean {
  return card.archived_at != null;
}

export function formatArchiveTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isUrgentPriorityCard(card: Card): boolean {
  return card.priority === 'urgent' && isActiveCard(card);
}

export function getLatestCardComment(card: Card): CardComment | null {
  if (!card.card_comments.length) return null;
  return [...card.card_comments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function getLatestActiveCardComment(card: Card): CardComment | null {
  const active = card.card_comments.filter((comment) => !isCommentDeleted(comment));
  if (!active.length) return null;
  return [...active].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function isCommentEdited(comment: CardComment): boolean {
  if (!comment.updated_at) return false;
  return comment.updated_at !== comment.created_at;
}

export function isCommentDeleted(comment: CardComment): boolean {
  return Boolean(comment.deleted_at);
}

export function formatCommentActorLabel(shift: string | null | undefined, name: string | null | undefined): string {
  if (shift && name) return `${shift} · ${name}`;
  return name || shift || '—';
}

export function formatDeletedCommentLabel(comment: CardComment): string {
  const deleter = formatCommentActorLabel(comment.deleted_by_shift, comment.deleted_by_name);
  return `삭제된 댓글 (${deleter})`;
}

export function formatEditedCommentLabel(comment: CardComment): string {
  const editor = formatCommentActorLabel(comment.edited_by_shift, comment.edited_by_name);
  return editor !== '—' ? `수정됨 · ${editor}` : '수정됨';
}

export function countActiveCardComments(card: Card): number {
  return card.card_comments.filter((comment) => !isCommentDeleted(comment)).length;
}

export function hasActiveCardComments(card: Card): boolean {
  return countActiveCardComments(card) > 0;
}

export function buildDuplicateCardInput(
  source: Card,
  author: string,
  assigneeShift: string,
  assigneeName: string,
): CardInput {
  const duplicateSuffix = ' (복제)';
  const baseTitle = source.title.replace(/ \(복제\)$/, '');
  return {
    column_id: source.column_id === 'done' ? 'progress' : source.column_id,
    priority: source.priority,
    category: source.category,
    room: source.room,
    title: `${baseTitle}${duplicateSuffix}`,
    details: source.details,
    resolution: source.column_id === 'done' ? '' : source.resolution,
    next_action: source.next_action,
    author: author || source.author,
    assignee_shift: source.assignee_shift || assigneeShift,
    assignee_name: source.assignee_name || assigneeName,
    due_at: source.due_at,
    complaint_remedies: [...(source.complaint_remedies ?? [])],
    complaint_remedy_other: source.complaint_remedy_other ?? '',
  };
}

function cardMatchesDateRange(card: Card, dateFrom: string | null, dateTo: string | null): boolean {
  if (!dateFrom && !dateTo) return true;
  const raw = card.updated_at || card.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;

  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);
    if (date < start) return false;
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999`);
    if (date > end) return false;
  }
  return true;
}

export function filterCards(
  cards: Card[],
  options: {
    query: string;
    quickFilter: QuickFilter;
    category: string;
    session: WorkSession;
    dateFrom?: string | null;
    dateTo?: string | null;
  },
): Card[] {
  const q = options.query.trim().toLowerCase();

  return cards.filter((card) => {
    const commentText = card.card_comments
      .map((comment) =>
        isCommentDeleted(comment)
          ? formatDeletedCommentLabel(comment)
          : [comment.content, comment.staff_name, comment.shift, comment.edited_by_name, comment.deleted_by_name]
              .filter(Boolean)
              .join(' '),
      )
      .join(' ');

    const haystack = [
      card.room,
      card.title,
      card.details,
      card.next_action,
      card.author,
      card.category,
      card.assignee_name,
      card.assignee_shift,
      formatComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other),
      commentText,
    ]
      .join(' ')
      .toLowerCase();

    if (q && !haystack.includes(q)) return false;
    if (!cardMatchesDateRange(card, options.dateFrom ?? null, options.dateTo ?? null)) return false;

    if (options.quickFilter === 'unacked') {
      return isUnackedUrgentCard(card, { staffName: options.session.name });
    }
    if (options.quickFilter === 'mine') {
      return cardMatchesMine(card, options.session);
    }
    if (options.quickFilter === 'roomclean') {
      return matchesRoomCleanFilter(card);
    }
    if (options.quickFilter === 'due-overdue') {
      return isCardOverdue(card);
    }
    if (options.quickFilter === 'due-soon') {
      return isCardDueSoon(card);
    }
    if (options.quickFilter === 'stale') {
      return isStaleCard(card);
    }
    if (options.quickFilter === 'hold-long') {
      return isLongHoldCard(card);
    }
    if (options.quickFilter !== 'all' && options.quickFilter) {
      return card.category === options.quickFilter;
    }
    if (options.category) {
      return card.category === options.category;
    }
    return true;
  });
}

function formatAssigneeGroupLabel(value: string): string {
  if (/^[A-E]$/u.test(value)) return `${value}조`;
  return value;
}

export function formatAssigneeLabel(card: Card): string {
  if (card.assignee_shift && card.assignee_name) {
    return `${formatAssigneeGroupLabel(card.assignee_shift)} · ${card.assignee_name}`;
  }
  if (card.assignee_shift) return formatAssigneeGroupLabel(card.assignee_shift);
  if (card.assignee_name) return card.assignee_name;
  return '';
}

/** "B조 · 강두훈" 같은 조 표기를 떼고 이름만 남긴다 */
export function stripShiftLabel(value: string): string {
  const label = value.trim();
  const separator = label.lastIndexOf(' · ');
  return separator >= 0 ? label.slice(separator + 3).trim() : label;
}

export function isActiveHandoverCard(card: Card): boolean {
  return card.column_id !== 'done' && !card.archived_at;
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function titlesAreSimilar(a: string, b: string): boolean {
  const left = normalizeMatchText(a);
  const right = normalizeMatchText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  const wordsA = a.toLowerCase().split(/\s+/).filter((word) => word.length >= 2);
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((word) => word.length >= 2));
  if (!wordsA.length || !wordsB.size) return false;
  const overlap = wordsA.filter((word) => wordsB.has(word)).length;
  const ratio = overlap / Math.max(wordsA.length, wordsB.size);
  return overlap >= 2 && ratio >= 0.6;
}

export function findDuplicateCards(
  cards: Card[],
  input: { room: string; title: string; excludeCardId?: string },
): Card[] {
  const title = input.title.trim();
  if (title.length < 2) return [];

  const roomKey = normalizeRoomKey(input.room);
  return cards.filter((card) => {
    if (input.excludeCardId && card.id === input.excludeCardId) return false;
    if (!isActiveHandoverCard(card)) return false;
    if (normalizeRoomKey(card.room) !== roomKey) return false;
    return titlesAreSimilar(card.title, title);
  });
}

export function formatSnoozeUntil(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/** 카드 author 문자열이 근무 담당자 이름과 일치하는지 (레거시 카드 삭제용) */
export function authorMatchesStaffName(author: string, staffName: string): boolean {
  const normalizedAuthor = author.trim();
  const normalizedName = staffName.trim();
  if (!normalizedAuthor || !normalizedName) return false;
  if (normalizedAuthor === normalizedName) return true;
  if (normalizedAuthor.endsWith(normalizedName)) return true;
  if (normalizedAuthor.includes(` · ${normalizedName}`)) return true;
  return false;
}

export function resolveStaffNameForDelete(staffName: string, authorLabel: string): string {
  const name = staffName.trim();
  if (name) return name;
  const label = authorLabel.trim();
  const separator = label.indexOf(' · ');
  if (separator >= 0) return label.slice(separator + 3).trim();
  return label;
}

export function canDeleteCard(
  card: Card,
  options: { isManager: boolean; userId: string | null; staffName: string; authorLabel: string },
): boolean {
  if (options.isManager) return true;

  const staffName = resolveStaffNameForDelete(options.staffName, options.authorLabel);
  if (!staffName || !authorMatchesStaffName(card.author ?? '', staffName)) return false;

  const createdBy = card.created_by ?? null;
  if (createdBy && options.userId && createdBy !== options.userId) return false;

  return true;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatElapsed(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

export type RelativeTime = { label: string; title: string; iso: string };

/** 목록·카드용 상대 시각 (최근: N분 전, 일주일 넘으면 날짜·시각). title은 정확한 시각 */
export function formatRelativeTime(value: string): RelativeTime {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: '', title: '', iso: '' };

  const title = date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const iso = date.toISOString();

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return { label: '방금', title, iso };
  if (minutes < 60) return { label: `${minutes}분 전`, title, iso };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours}시간 전`, title, iso };

  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `${days}일 전`, title, iso };

  return { label: formatTime(value), title, iso };
}

export function formatDueLabel(dueAt: string | null, overdue: boolean): string {
  if (!dueAt) return '';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return '';
  const label = date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return overdue ? `마감 지남 · ${label}` : `마감 ${label}`;
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function joinDatetimeLocalValue(date: string, time: string): string {
  if (!date.trim()) return '';
  return `${date.trim()}T${time.trim() || '23:59'}`;
}

export function splitDatetimeLocalValue(value: string): { date: string; time: string } {
  const trimmed = value.trim();
  if (!trimmed) return { date: '', time: '' };
  const [date = '', time = ''] = trimmed.split('T');
  return { date, time };
}

/** 날짜만 있으면 23:59, 시간만 있으면 오늘 날짜와 결합 */
export function parseDueAt(dateValue: string, timeValue: string): string | null {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date && !time) return null;
  if (!date && time) {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const parsed = new Date(`${todayStr}T${time}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(`${date}T${time || '23:59'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function compareCardOrder(a: Card, b: Card): number {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

/** 진행중 칸: legacy urgent 칸 포함, 긴급 우선순위를 최상단 */
export function sortCardsInColumn(cards: Card[], columnId: Card['column_id']): Card[] {
  if (columnId === 'progress') {
    return cards
      .filter((card) => card.column_id === 'progress' || card.column_id === 'urgent')
      .sort((a, b) => {
        const pa = a.priority === 'urgent' ? 0 : 1;
        const pb = b.priority === 'urgent' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return compareCardOrder(a, b);
      });
  }
  if (columnId === 'hold') {
    return cards.filter((card) => card.column_id === 'hold').sort(compareCardOrder);
  }
  return cards.filter((card) => card.column_id === columnId).sort(compareCardOrder);
}

/** 드래그·이동 시 진행중 칸으로 정규화 */
export function normalizeColumnId(columnId: ColumnId): ColumnId {
  return columnId === 'urgent' ? 'progress' : columnId;
}

export function buildProjectListSections(cards: Card[], activeStaffNames: string[] = []): ProjectListSection[] {
  const unacked = cards.filter((card) =>
    isUnackedUrgentCard(card, activeStaffNames.length ? { activeStaffNames } : undefined),
  );
  const unackedIds = new Set(unacked.map((card) => card.id));
  const progressCards = sortCardsInColumn(
    cards.filter(
      (card) =>
        !isArchivedCard(card) &&
        !unackedIds.has(card.id) &&
        (card.column_id === 'progress' || card.column_id === 'urgent'),
    ),
    'progress',
  );
  const holdCards = sortCardsInColumn(
    cards.filter((card) => !isArchivedCard(card) && card.column_id === 'hold'),
    'hold',
  );
  const doneCards = sortCardsInColumn(
    cards.filter((card) => !isArchivedCard(card) && card.column_id === 'done'),
    'done',
  );
  const archivedCards = cards.filter(isArchivedCard);

  const sections: ProjectListSection[] = [];
  if (unacked.length) {
    sections.push({ id: 'unacked', title: '미확인 긴급', cards: unacked });
  }
  sections.push({ id: 'progress', title: '진행중', cards: progressCards });
  if (holdCards.length) {
    sections.push({ id: 'hold', title: '보류', cards: holdCards });
  }
  sections.push({ id: 'done', title: '완료', cards: doneCards });
  if (archivedCards.length) {
    sections.push({ id: 'archived', title: '완료 보관', cards: archivedCards });
  }
  return sections;
}

export function groupCardsByRoom(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  cards
    .filter((card) => card.column_id !== 'done')
    .forEach((card) => {
      const key = normalizeRoomKey(card.room);
      const list = groups.get(key) ?? [];
      list.push(card);
      groups.set(key, list);
    });
  return groups;
}

export function sortRoomKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === '미지정') return 1;
    if (b === '미지정') return -1;
    return a.localeCompare(b, 'ko', { numeric: true });
  });
}
