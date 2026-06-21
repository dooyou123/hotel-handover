import { formatReviewDate, formatStayRange } from '@/lib/reviews/format';
import { formatReviewGuestLabel, isReviewAnonymous } from '@/lib/reviews/identity';
import { REVIEW_SENTIMENT_LABELS } from '@/lib/reviews/types';
import type { GuestReview } from '@/lib/reviews/types';

export type ReviewPrintRecipient = 'housekeeping' | 'security';

export const REVIEW_PRINT_RECIPIENTS = [
  { value: 'housekeeping' as const, label: '하우스키핑' },
  { value: 'security' as const, label: '방재실' },
];

const RECIPIENT_LABELS: Record<ReviewPrintRecipient, string> = {
  housekeeping: '하우스키핑 전달',
  security: '방재실 전달',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textBlock(value: string): string {
  if (!value.trim()) return '<p class="empty">—</p>';
  return value
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('');
}

function metaRow(label: string, value: string): string {
  if (!value.trim()) return '';
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

export function buildReviewPrintHtml(
  review: GuestReview,
  recipient: ReviewPrintRecipient,
  issuedAt = new Date(),
): string {
  const issuedLabel = issuedAt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sentimentLabel = REVIEW_SENTIMENT_LABELS[review.sentiment];
  const anonymous = isReviewAnonymous(review);
  const guestLabel = formatReviewGuestLabel(review);
  const stayLabel = formatStayRange(review.check_in_date, review.check_out_date, anonymous);
  const updatedLabel = formatReviewDate(review.updated_at || review.created_at);
  const roomLabel = review.room_number ? `${review.room_number}호` : '';
  const actionDone = review.room_action_completed_at
    ? `완료 · ${review.room_action_completed_by || '—'} · ${formatReviewDate(review.room_action_completed_at)}`
    : '';

  const metaRows = [
    metaRow('고객명', guestLabel),
    metaRow('구분', anonymous ? '익명 리뷰 (고객 정보 없음)' : ''),
    metaRow('객실', roomLabel),
    metaRow('예약번호', anonymous ? '' : review.reservation_number),
    metaRow('Account', review.account),
    metaRow('숙박', stayLabel),
    metaRow('평점', review.rating != null ? `★ ${review.rating}` : ''),
    metaRow('등록', `${review.author || '—'} · ${updatedLabel}`),
    metaRow('객실 조치', actionDone),
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>고객 리뷰 · ${escapeHtml(RECIPIENT_LABELS[recipient])}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #171717;
      font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .preview-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: #1e3a5f;
      color: #fff;
    }
    .preview-toolbar__title { font-size: 13px; font-weight: 700; }
    .preview-toolbar__btn {
      padding: 7px 14px;
      border: 0;
      border-radius: 6px;
      background: #fff;
      color: #1e3a5f;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .sheet {
      max-width: 180mm;
      margin: 0 auto;
      padding: 4mm 2mm 8mm;
    }
    .sheet__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #171717;
      margin-bottom: 10px;
    }
    .sheet__eyebrow {
      margin: 0 0 4px;
      font-size: 9pt;
      font-weight: 700;
      color: #1e3a5f;
      letter-spacing: 0.04em;
    }
    .sheet__title {
      margin: 0;
      font-size: 16pt;
      font-weight: 800;
      line-height: 1.2;
    }
    .sheet__room {
      flex-shrink: 0;
      min-width: 72px;
      padding: 8px 12px;
      border-radius: 8px;
      background: #f5f5f5;
      border: 1px solid #d4d4d4;
      text-align: center;
    }
    .sheet__room-label {
      display: block;
      font-size: 8pt;
      color: #737373;
      margin-bottom: 2px;
    }
    .sheet__room-value {
      display: block;
      font-size: 18pt;
      font-weight: 900;
      line-height: 1.1;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 800;
    }
    .badge--positive { background: #dcfce7; color: #166534; }
    .badge--negative { background: #fee2e2; color: #b91c1c; }
    .meta {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 12px;
      font-size: 9.5pt;
    }
    .meta th,
    .meta td {
      padding: 5px 8px;
      border-bottom: 1px solid #e5e5e5;
      vertical-align: top;
      text-align: left;
    }
    .meta th {
      width: 22%;
      color: #525252;
      font-weight: 700;
      white-space: nowrap;
    }
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section__label {
      margin: 0 0 6px;
      font-size: 9pt;
      font-weight: 800;
      color: #404040;
      letter-spacing: 0.03em;
    }
    .section__body {
      padding: 10px 12px;
      border: 1px solid #d4d4d4;
      border-radius: 8px;
      background: #fafafa;
    }
    .section__body p {
      margin: 0 0 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .section__body p:last-child { margin-bottom: 0; }
    .section__body--ko {
      font-size: 12pt;
      line-height: 1.55;
      background: #fff;
    }
    .section__body--original {
      font-size: 9.5pt;
      color: #525252;
      background: #f5f5f5;
    }
    .empty { margin: 0; color: #a3a3a3; }
    .sheet__foot {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #d4d4d4;
      font-size: 8.5pt;
      color: #737373;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .confirm-box {
      margin-top: 14px;
      padding: 10px 12px;
      border: 1px dashed #a3a3a3;
      border-radius: 8px;
      font-size: 9pt;
      color: #525252;
    }
    .confirm-box__line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .confirm-box__line:first-child { margin-top: 0; }
    .confirm-box__blank {
      flex: 1;
      border-bottom: 1px solid #737373;
      min-width: 80px;
      height: 1.2em;
    }
    @media screen {
      body { background: #f4f4f5; padding-bottom: 16px; }
      .sheet {
        background: #fff;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        border-radius: 0 0 8px 8px;
        padding: 12mm 10mm 14mm;
      }
    }
    @media print {
      .preview-toolbar { display: none !important; }
      .sheet { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="preview-toolbar">
    <span class="preview-toolbar__title">고객 리뷰 · ${escapeHtml(RECIPIENT_LABELS[recipient])}</span>
    <button type="button" class="preview-toolbar__btn" onclick="window.print()">인쇄</button>
  </div>
  <div class="sheet">
    <header class="sheet__head">
      <div>
        <p class="sheet__eyebrow">${escapeHtml(RECIPIENT_LABELS[recipient])}</p>
        <h1 class="sheet__title">고객 리뷰 전달</h1>
        <span class="badge badge--${review.sentiment}">${escapeHtml(sentimentLabel)}</span>
      </div>
      ${
        roomLabel
          ? `<div class="sheet__room">
        <span class="sheet__room-label">객실</span>
        <span class="sheet__room-value">${escapeHtml(roomLabel)}</span>
      </div>`
          : ''
      }
    </header>

    <table class="meta">
      <tbody>${metaRows}</tbody>
    </table>

    <section class="section">
      <h2 class="section__label">한국어 번역</h2>
      <div class="section__body section__body--ko">${textBlock(review.content_ko)}</div>
    </section>

    <section class="section">
      <h2 class="section__label">리뷰 원문</h2>
      <div class="section__body section__body--original">${textBlock(review.content_original)}</div>
    </section>

    <div class="confirm-box">
      <div class="confirm-box__line"><span>□</span><span>내용 확인</span><span class="confirm-box__blank"></span><span>서명</span></div>
      <div class="confirm-box__line"><span>□</span><span>조치 완료</span><span class="confirm-box__blank"></span><span>일시</span></div>
    </div>

    <footer class="sheet__foot">
      <span>출력: ${escapeHtml(issuedLabel)}</span>
      <span>Front Desk · Guest Review</span>
    </footer>
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

export function printGuestReview(review: GuestReview, recipient: ReviewPrintRecipient): boolean {
  const html = buildReviewPrintHtml(review, recipient);
  const windowName = `guest-review-${recipient}`;

  const popup = window.open('about:blank', windowName, 'width=860,height=1000');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    printWhenReady(popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', `고객 리뷰 · ${RECIPIENT_LABELS[recipient]}`);
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
