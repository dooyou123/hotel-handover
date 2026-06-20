import { buildWorkHubHref } from '@/lib/work/work-hub';

export function getTickerItemHref(id: string): string | null {
  if (id === 'idle') return null;

  if (id.startsWith('notice-expiry-')) {
    return buildWorkHubHref('notices', { id: id.slice('notice-expiry-'.length) });
  }

  if (id.startsWith('notice-')) {
    return buildWorkHubHref('notices', { id: id.slice('notice-'.length) });
  }

  const cardPrefixes = ['unacked-', 'urgent-', 'due-overdue-', 'due-soon-', 'stale-', 'hold-long-'] as const;
  for (const prefix of cardPrefixes) {
    if (id.startsWith(prefix)) {
      return `/handover?card=${id.slice(prefix.length)}`;
    }
  }

  return null;
}

export function isTickerItemClickable(id: string): boolean {
  return getTickerItemHref(id) !== null;
}

export const TICKER_RIBBON_MAX_VISIBLE = 1;

const TONE_RANK: Record<'urgent' | 'warn' | 'info', number> = {
  urgent: 0,
  warn: 1,
  info: 2,
};

export function sortTickerItemsForDisplay<T extends { tone: 'urgent' | 'warn' | 'info' }>(items: T[]): T[] {
  return [...items].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}

export function getTickerActionLabel(id: string): string {
  if (id === 'idle') return '';
  if (id.startsWith('unacked-')) return '확인하기';
  if (id.startsWith('notice-')) return '읽기';
  return '열기';
}

export function getTickerIcon(id: string, tone: 'urgent' | 'warn' | 'info'): string {
  if (id.startsWith('notice-')) return '📌';
  if (tone === 'urgent') return '🔴';
  if (tone === 'warn') return '🟡';
  return 'ℹ️';
}
