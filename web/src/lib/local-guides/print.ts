import type { LocalGuide, LocalGuideLocale } from '@/lib/local-guides/types';
import { LOCAL_GUIDE_KIND_LABELS, guideBodyForLocale } from '@/lib/local-guides/types';

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

export function buildLocalGuidePrintHtml(guide: LocalGuide, locale: LocalGuideLocale): string {
  const body = guideBodyForLocale(guide, locale);
  const kind = LOCAL_GUIDE_KIND_LABELS[guide.kind];

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(guide.title)}</title>
  <style>
    @page { margin: 14mm 12mm; }
    body { font-family: "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; color: #111; line-height: 1.55; }
    .sheet { max-width: 640px; margin: 0 auto; }
    .sheet__kind {
      display: inline-block;
      margin: 0 0 0.55rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .sheet__title { margin: 0 0 1rem; font-size: 1.55rem; font-weight: 800; letter-spacing: -0.02em; }
    .sheet__body p { margin: 0 0 0.45rem; white-space: pre-wrap; font-size: 1.05rem; }
    .preview-toolbar {
      position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 0.5rem;
      padding: 0.65rem 0; margin-bottom: 0.75rem; border-bottom: 1px solid #ddd; background: #fff;
    }
    .preview-toolbar__btn {
      border: 1px solid #ccc; background: #f8f8f8; border-radius: 6px;
      padding: 0.35rem 0.85rem; font-size: 0.88rem; cursor: pointer;
    }
    @media print { .preview-toolbar { display: none !important; } }
  </style>
</head>
<body>
  <div class="preview-toolbar">
    <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
  </div>
  <article class="sheet">
    <span class="sheet__kind">${escapeHtml(kind)}</span>
    <h1 class="sheet__title">${escapeHtml(guide.title)}</h1>
    <div class="sheet__body">${bodyLinesHtml(body)}</div>
  </article>
</body>
</html>`;
}

export function printLocalGuide(guide: LocalGuide, locale: LocalGuideLocale): void {
  const html = buildLocalGuidePrintHtml(guide, locale);
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => {
      try {
        popup.print();
      } catch {
        /* ignore */
      }
    }, 250);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('인쇄 창을 열지 못했습니다.');
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1000);
    }
  }, 250);
}
