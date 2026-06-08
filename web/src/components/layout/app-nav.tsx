'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV } from '@/lib/constants';

type AppNavProps = {
  variant?: 'classic' | 'nova';
};

export function AppNav({ variant = 'classic' }: AppNavProps) {
  const pathname = usePathname();
  const navClass = variant === 'nova' ? 'nova-nav' : 'app-nav';
  const btnClass = variant === 'nova' ? 'nova-nav__btn' : 'app-nav__btn';

  return (
    <nav className={navClass} aria-label="화면 전환">
      {APP_NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${btnClass}${active ? ' is-active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
