import { APP_NAV } from '@/lib/constants';

export function getNavPageMeta(href: string) {
  const legacyMap: Record<string, string> = {
    '/notices': '/work',
    '/todos': '/work',
  };
  const resolved = legacyMap[href] ?? href;
  const item = APP_NAV.find((nav) => nav.href === resolved);
  return {
    label: item?.label ?? '',
    description: item?.description ?? '',
  };
}
