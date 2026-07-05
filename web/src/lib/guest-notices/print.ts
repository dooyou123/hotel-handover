import type { GuestNotice, GuestNoticeBranding, GuestNoticeLocale } from '@/lib/guest-notices/types';
import { footerForLocale, noticeBodyForLocale } from '@/lib/guest-notices/types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bodyLinesHtml(body: string): string {
  return body.split('\n').map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('');
}

function footerBlockHtml(
  branding: GuestNoticeBranding | null | undefined,
  locale: GuestNoticeLocale,
  showFooter: boolean,
): string {
  if (!branding) return '';
  const footer = showFooter ? footerForLocale(branding, locale).trim() : '';
  const logo = branding.logo_url
    ? `<img class="sheet__logo" src="${escapeHtml(branding.logo_url)}" alt="" />`
    : '';
  if (!footer && !logo) return '';
  const footerText = footer
    ? `<div class="sheet__footer-text">${bodyLinesHtml(footer)}</div>`
    : '';
  return `<footer class="sheet__foot">${logo}${footerText}</footer>`;
}

export function buildGuestNoticePrintHtml(
  notice: GuestNotice,
  locale: GuestNoticeLocale,
  branding?: GuestNoticeBranding | null,
): string {
  const body = noticeBodyForLocale(notice, locale);
  const footer = footerBlockHtml(branding, locale, notice.show_footer !== false);

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
    .sheet__foot {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #ddd;
      text-align: center;
    }
    .sheet__logo {
      display: block;
      max-height: 56px;
      max-width: 200px;
      margin: 0 auto 0.75rem;
      object-fit: contain;
    }
    .sheet__footer-text p {
      margin: 0 0 0.35rem;
      font-size: 0.82rem;
      color: #666;
      white-space: pre-wrap;
    }
    @media print {
      .preview-toolbar { display: none !important; }
    }
    .preview-toolbar {
      position: sticky;
      top: 0;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.65rem 0;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #ddd;
      background: #fff;
    }
    .preview-toolbar__btn {
      border: 1px solid #ccc;
      background: #f8f8f8;
      border-radius: 6px;
      padding: 0.35rem 0.85rem;
      font-size: 0.88rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="preview-toolbar">
    <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
  </div>
  <div class="sheet">
    <header class="sheet__head">
      <div class="sheet__category">${escapeHtml(notice.category)}</div>
      <h1 class="sheet__title">${escapeHtml(notice.title)}</h1>
    </header>
    <div class="sheet__body">${bodyLinesHtml(body)}</div>
    ${footer}
  </div>
</body>
</html>`;
}

function printWhenReady(targetWindow: Window, onCleanup?: () => void) {
  const runPrint = () => {
    targetWindow.focus();
    targetWindow.print();
    onCleanup?.();
  };

  if (targetWindow.document.readyState === 'complete') {
    requestAnimationFrame(runPrint);
    return;
  }

  targetWindow.addEventListener('load', () => requestAnimationFrame(runPrint), { once: true });
}

function writeHtmlToWindow(targetWindow: Window, html: string) {
  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();
}

/** 안내문 인쇄. 팝업 차단 시 hidden iframe으로 대체. 성공 여부 반환. */
export function printGuestNotice(
  notice: GuestNotice,
  locale: GuestNoticeLocale,
  branding?: GuestNoticeBranding | null,
): boolean {
  const html = buildGuestNoticePrintHtml(notice, locale, branding);
  const windowName = `guest-notice-${notice.id}`;

  const popup = window.open('about:blank', windowName, 'width=820,height=960');
  if (popup) {
    writeHtmlToWindow(popup, html);
    printWhenReady(popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', notice.title);
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWin?.document;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  printWhenReady(frameWin, () => {
    window.setTimeout(() => iframe.remove(), 1000);
  });
  return true;
}
