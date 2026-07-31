import { buildWorkHubHref } from '@/lib/work/work-hub';
import type { HandoverStatusTab } from '@/components/handover/project/handover-status-tabs';
import type { QuickFilter } from '@/lib/handover/types';

export type BriefListJump =
  | {
      kind: 'list';
      statusTab?: Exclude<HandoverStatusTab, 'archive'>;
      quickFilter?: QuickFilter;
    }
  | { kind: 'archive' }
  | { kind: 'href'; href: string };

/** 교대 요약 칩 → 목록/관련 화면 이동 대상 */
export function briefChipJumpTarget(chipKey: string): BriefListJump | null {
  switch (chipKey) {
    case 'unacked':
      return { kind: 'list', statusTab: 'progress', quickFilter: 'unacked' };
    case 'urgent':
    case 'progress':
      return { kind: 'list', statusTab: 'progress', quickFilter: 'all' };
    case 'hold':
      return { kind: 'list', statusTab: 'hold', quickFilter: 'all' };
    case 'stale':
      return { kind: 'list', statusTab: 'progress', quickFilter: 'stale' };
    case 'longHold':
      return { kind: 'list', statusTab: 'hold', quickFilter: 'hold-long' };
    case 'checklist':
      return { kind: 'href', href: '/checklist' };
    case 'reviews':
      return { kind: 'href', href: '/reviews' };
    case 'amenity':
      return { kind: 'href', href: '/amenity' };
    case 'work':
      return { kind: 'href', href: buildWorkHubHref('schedule') };
    case 'taxi':
      return { kind: 'href', href: '/transport' };
    default:
      return null;
  }
}

export const HANDOVER_SET_STATUS_TAB_EVENT = 'handover-set-status-tab';

export function dispatchHandoverStatusTab(statusTab: Exclude<HandoverStatusTab, 'archive'>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(HANDOVER_SET_STATUS_TAB_EVENT, { detail: { statusTab } }),
  );
}
