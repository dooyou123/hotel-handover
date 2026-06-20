export type WorkHubTab = 'schedule' | 'notices' | 'personal';

export const WORK_HUB_TABS: { id: WorkHubTab; label: string; description: string }[] = [
  { id: 'schedule', label: '할일·일정', description: '달력으로 할일과 호텔 일정을 관리합니다.' },
  { id: 'notices', label: '공지·변경', description: '공지·변경 사항 게시판' },
  { id: 'personal', label: '내 할 일', description: '개인 할 일' },
];

export const WORK_HUB_PATH = '/work';

export function isWorkHubTab(value: string | null): value is WorkHubTab {
  return value === 'schedule' || value === 'notices' || value === 'personal';
}

export function parseWorkHubTab(searchParams: Pick<URLSearchParams, 'get'>): WorkHubTab {
  const tab = searchParams.get('tab');
  if (tab === 'today') return 'schedule';
  if (isWorkHubTab(tab)) return tab;
  if (searchParams.get('view') === 'personal') return 'personal';
  if (
    searchParams.get('channel') ||
    searchParams.get('id') ||
    searchParams.get('renewal')
  ) {
    return 'notices';
  }
  return 'schedule';
}

export function buildWorkHubHref(tab: WorkHubTab, extra?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${WORK_HUB_PATH}?${query}` : WORK_HUB_PATH;
}

/** 레거시 /notices · /todos 숨김 설정 → /work */
export function migrateHiddenNavHrefs(hrefs: string[]): string[] {
  const next = new Set(hrefs.filter((href) => href !== '/notices' && href !== '/todos'));
  if (hrefs.includes('/notices') || hrefs.includes('/todos')) {
    next.add(WORK_HUB_PATH);
  }
  return [...next];
}

export function isWorkHubPath(pathname: string): boolean {
  return pathname === WORK_HUB_PATH || pathname.startsWith(`${WORK_HUB_PATH}/`);
}
