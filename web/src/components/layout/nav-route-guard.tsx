'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsManager } from '@/lib/handover/use-cards';
import { isNavPathHidden, useHiddenNavHrefs } from '@/lib/settings/nav-visibility';

export function NavRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: hiddenHrefs = [], isLoading } = useHiddenNavHrefs();
  const { data: isManager = false } = useIsManager();

  useEffect(() => {
    if (isLoading || isManager) return;
    if (isNavPathHidden(pathname, hiddenHrefs)) {
      router.replace('/handover');
    }
  }, [pathname, hiddenHrefs, isLoading, isManager, router]);

  return null;
}
