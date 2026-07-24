import type { ReactNode } from 'react';

type NavIconProps = {
  href: string;
  className?: string;
};

function IconShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={['nav-btn__icon', className].filter(Boolean).join(' ')} aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {children}
      </svg>
    </span>
  );
}

export function NavIcon({ href, className }: NavIconProps) {
  switch (href) {
    case '/handover':
      return (
        <IconShell className={className}>
          <path d="M8 6h8M8 10h8M8 14h5M6 4h12a2 2 0 0 1 2 2v12l-3-2-3 2-3-2-3 2-3-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/work':
      return (
        <IconShell className={className}>
          <path d="M6 8.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12l-4-2.5L10 18V8.5H6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </IconShell>
      );
    case '/notices':
      return (
        <IconShell className={className}>
          <path d="M6 8.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12l-4-2.5L10 18V8.5H6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/todos':
      return (
        <IconShell className={className}>
          <path d="M9 11l2 2 4-4M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </IconShell>
      );
    case '/schedule':
      return (
        <IconShell className={className}>
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/contacts':
      return (
        <IconShell className={className}>
          <path d="M6 7.5A4.5 4.5 0 1 1 15 7.5c0 2.2-4.5 6-4.5 6S6 9.7 6 7.5Z" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="10.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.75" />
        </IconShell>
      );
    case '/checklist':
      return (
        <IconShell className={className}>
          <path d="M9 6h10M9 12h10M9 18h6M5 6h.01M5 12h.01M5 18h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/housekeeping':
      return (
        <IconShell className={className}>
          <path d="M4 10 12 4l8 6v9H4v-9Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/amenity':
      return (
        <IconShell className={className}>
          <path d="M12 3l2.2 4.5L19 8.5l-3.5 3.4.8 4.9L12 14.8 7.7 16.8l.8-4.9L5 8.5l4.8-1 2.2-4.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/retail':
      return (
        <IconShell className={className}>
          <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/reviews':
      return (
        <IconShell className={className}>
          <path d="M12 17.5 6.5 20l1-6.2L3 9.3l6.3-.9L12 3l2.7 5.4 6.3.9-4.5 4.5 1 6.2-5.5-2.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/guest-notices':
      return (
        <IconShell className={className}>
          <path d="M6 5h12v14H6V5Z" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/transport':
      return (
        <IconShell className={className}>
          <path d="M4 16h16M6 16V8l2-3h8l2 3v8" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <circle cx="8" cy="16" r="1.5" fill="currentColor" />
          <circle cx="16" cy="16" r="1.5" fill="currentColor" />
        </IconShell>
      );
    case '/parcels':
      return (
        <IconShell className={className}>
          <path d="M4 8.5 12 4l8 4.5v9H4v-9Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M12 13v6.5" stroke="currentColor" strokeWidth="1.75" />
        </IconShell>
      );
    case '/facility':
      return (
        <IconShell className={className}>
          <path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.75" />
        </IconShell>
      );
    case '/rate-confirm':
      return (
        <IconShell className={className}>
          <path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/year-end-party':
      return (
        <IconShell className={className}>
          <path d="M12 3 14.5 8.5 20.5 9.3 16 13.4 17.2 19.3 12 16.4 6.8 19.3 8 13.4 3.5 9.3 9.5 8.5 12 3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </IconShell>
      );
    case '/stats':
      return (
        <IconShell className={className}>
          <path d="M5 19V11M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/insights/floor':
      return (
        <IconShell className={className}>
          <path d="M4 20h16M7 16V9M12 16V6M17 16v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/board':
      return (
        <IconShell className={className}>
          <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 19h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
    case '/settings':
      return (
        <IconShell className={className}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </IconShell>
      );
  }

  return (
    <IconShell className={className}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.75" />
    </IconShell>
  );
}
