'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV } from '@/lib/constants';

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="화면 전환">
      {APP_NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-nav__btn${active ? ' is-active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
