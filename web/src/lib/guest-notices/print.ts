import type { GuestNotice, GuestNoticeLocale } from '@/lib/guest-notices/types';
import { noticeBodyForLocale } from '@/lib/guest-notices/types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGuestNoticePrintHtml(notice: GuestNotice, locale: GuestNoticeLocale): string {
  const body = noticeBodyForLocale(notice, locale);
  const lines = body.split('\n').map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('');

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(notice.title)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    body { font-family: "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; color: #111; line-height: 1.65; }
    .sheet { max-width: 720px; margin: 0 auto; }
    .sheet__head { border-bottom: 2px solid #111; padding-bottom: 0.75rem; margin-bottom: 1.25rem; }
    .sheet__category { font-size: 0.85rem; color: #555; letter-spacing: 0.04em; }
    .sheet__title { margin: 0.35rem 0 0; font-size: 1.45rem; font-weight: 800; }
    .sheet__body p { margin: 0 0 0.55rem; white-space: pre-wrap; font-size: 1rem; }
    .sheet__foot { margin-top: 2rem; padding-top: 0.75rem; border-top: 1px solid #ddd; font-size: 0.82rem; color: #666; }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="sheet__head">
      <div class="sheet__category">${escapeHtml(notice.category)}</div>
      <h1 class="sheet__title">${escapeHtml(notice.title)}</h1>
    </header>
    <div class="sheet__body">${lines}</div>
    <footer class="sheet__foot">Front Desk · Guest Notice</footer>
  </div>
</body>
</html>`;
}

export function printGuestNotice(notice: GuestNotice, locale: GuestNoticeLocale): void {
  const html = buildGuestNoticePrintHtml(notice, locale);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=820,height=960');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}
