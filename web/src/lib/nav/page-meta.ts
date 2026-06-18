import { APP_NAV } from '@/lib/constants';

export function getNavPageMeta(href: string) {
  const item = APP_NAV.find((nav) => nav.href === href);
  return {
    label: item?.label ?? '',
    description: item?.description ?? '',
  };
}
