'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { NAV_CATEGORIES, NAV_CATEGORY_LABELS } from '@/lib/constants';
import { useIsManager } from '@/lib/handover/use-cards';
import { useNavBadges } from '@/lib/nav/use-nav-badges';
import { useNavItemsForUser, type NavDisplayItem } from '@/lib/settings/nav-visibility';
import type { NavBadge } from '@/lib/nav/nav-badges';

type AppNavProps = {
  variant?: 'classic' | 'nova';
};

function NavStaffVisibilityIcon({
  staffVisible,
  alwaysVisible,
}: {
  staffVisible: boolean;
  alwaysVisible: boolean;
}) {
  if (alwaysVisible) {
    return (
      <span className="nav-staff-visibility nav-staff-visibility--always" title="직원에게 항상 표시">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3c-4.5 0-8.2 2.6-10 6.5 1.8 3.9 5.5 6.5 10 6.5s8.2-2.6 10-6.5C20.2 5.6 16.5 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </span>
    );
  }

  if (staffVisible) {
    return (
      <span className="nav-staff-visibility nav-staff-visibility--on" title="직원에게 표시">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </span>
    );
  }

  return (
    <span className="nav-staff-visibility nav-staff-visibility--off" title="직원에게 숨김">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4M6.7 6.7C4.6 8.1 3 10.3 2 12s3.5 7 10 7c1.8 0 3.4-.4 4.8-1.1M17.3 17.3C19.4 15.9 21 13.7 22 12s-3.5-7-10-7c-1.8 0-3.4.4-4.8 1.1"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function NavLink({
  item,
  active,
  btnClass,
  showStaffVisibility,
  badge,
}: {
  item: NavDisplayItem;
  active: boolean;
  btnClass: string;
  showStaffVisibility: boolean;
  badge?: NavBadge;
}) {
  const hiddenFromStaff = showStaffVisibility && !item.staffVisible;
  const ariaLabel = showStaffVisibility
    ? `${item.label}${item.staffVisible ? ' · 직원 표시' : ' · 직원 숨김'}`
    : item.label;

  return (
    <Link
      href={item.href}
      className={`${btnClass}${active ? ' is-active' : ''}${hiddenFromStaff ? ' is-hidden-from-staff' : ''}`}
      aria-label={ariaLabel}
    >
      <span className="nav-btn__label">{item.label}</span>
      {badge && badge.count > 0 ? (
        <span
          className={`nav-btn__badge nav-btn__badge--${badge.tone}`}
          aria-label={`알림 ${badge.count}건`}
          title={`알림 ${badge.count}건`}
        >
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      ) : null}
      {showStaffVisibility ? (
        <NavStaffVisibilityIcon staffVisible={item.staffVisible} alwaysVisible={item.alwaysVisible} />
      ) : null}
    </Link>
  );
}

export function AppNav({ variant = 'classic' }: AppNavProps) {
  const pathname = usePathname();
  const { data: isManager = false } = useIsManager();
  const { items, showStaffVisibility } = useNavItemsForUser(isManager);
  const badges = useNavBadges();
  const navClass = variant === 'nova' ? 'nova-nav' : 'app-nav';
  const btnClass = variant === 'nova' ? 'nova-nav__btn' : 'app-nav__btn';

  const groups = useMemo(() => {
    return NAV_CATEGORIES.map((category) => ({
      category,
      label: NAV_CATEGORY_LABELS[category],
      items: items.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <nav className={navClass} aria-label="화면 전환">
      {groups.map((group) => (
        <div key={group.category} className="nav-group">
          <p className="nav-group__label">{group.label}</p>
          <div className="nav-group__links">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname.startsWith(item.href)}
                btnClass={btnClass}
                showStaffVisibility={showStaffVisibility}
                badge={badges[item.href]}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
