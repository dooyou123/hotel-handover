const STORAGE_KEY = 'room-search-recent';
const MAX_RECENT = 5;

export function loadRecentRoomSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length >= 2);
  } catch {
    return [];
  }
}

export function rememberRoomSearch(query: string): void {
  const term = query.trim();
  if (term.length < 2 || typeof window === 'undefined') return;
  const prev = loadRecentRoomSearches().filter((item) => item !== term);
  const next = [term, ...prev].slice(0, MAX_RECENT);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
