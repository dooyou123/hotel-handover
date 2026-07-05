import type { GuestNoticeBranding, GuestNoticeLocale } from '@/lib/guest-notices/types';
import { footerForLocale } from '@/lib/guest-notices/types';

type GuestNoticeFooterProps = {
  branding: GuestNoticeBranding | null | undefined;
  locale: GuestNoticeLocale;
  showFooter?: boolean;
  className?: string;
};

export function GuestNoticeFooter({
  branding,
  locale,
  showFooter = true,
  className,
}: GuestNoticeFooterProps) {
  if (!branding) return null;
  const footer = showFooter ? footerForLocale(branding, locale).trim() : '';
  if (!footer && !branding.logo_url) return null;

  return (
    <footer className={className ?? 'guest-notice-footer'}>
      {branding.logo_url ? (
        <img className="guest-notice-footer__logo" src={branding.logo_url} alt="" />
      ) : null}
      {footer ? <p className="guest-notice-footer__text">{footer}</p> : null}
    </footer>
  );
}
