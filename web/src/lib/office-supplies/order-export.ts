import { formatOrderDateLabel } from '@/lib/office-supplies/batch';
import { OFFICETOWN_MALL_URL, type OfficeSupplyRequest } from '@/lib/office-supplies/types';

export type OfficeSupplyOrderLine = {
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  requestedBy: string;
  note: string;
};

export function aggregateOfficeSupplyOrderLines(requests: OfficeSupplyRequest[]): OfficeSupplyOrderLine[] {
  const map = new Map<string, OfficeSupplyOrderLine>();

  for (const request of requests) {
    const key = `${request.product_code}::${request.unit}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += request.quantity;
      if (!existing.requestedBy.includes(request.requested_by)) {
        existing.requestedBy = `${existing.requestedBy}, ${request.requested_by}`;
      }
      if (request.note && !existing.note.includes(request.note)) {
        existing.note = existing.note ? `${existing.note}; ${request.note}` : request.note;
      }
      continue;
    }
    map.set(key, {
      productCode: request.product_code,
      productName: request.product_name,
      unit: request.unit,
      quantity: request.quantity,
      requestedBy: request.requested_by,
      note: request.note,
    });
  }

  return [...map.values()].sort(
    (a, b) => a.productName.localeCompare(b.productName, 'ko') || a.productCode.localeCompare(b.productCode),
  );
}

export function buildOfficeSupplyOrderText(
  lines: OfficeSupplyOrderLine[],
  orderDateKey: string,
  issuedAt = new Date(),
): string {
  const header = [
    '사무용품 구매 요청 (오피스타운 유통)',
    `발주 예정일: ${formatOrderDateLabel(orderDateKey)}`,
    `작성일: ${issuedAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}`,
    `쇼핑몰: ${OFFICETOWN_MALL_URL}`,
    '',
  ];

  if (!lines.length) {
    return [...header, '신청 품목이 없습니다.'].join('\n');
  }

  const body = lines.map(
    (line, index) =>
      `${index + 1}. [${line.productCode}] ${line.productName}\n   수량: ${line.quantity}${line.unit} · 신청: ${line.requestedBy}${line.note ? `\n   비고: ${line.note}` : ''}`,
  );

  return [...header, `총 ${lines.length}품목`, '', ...body].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOfficeSupplyOrderPrintHtml(
  lines: OfficeSupplyOrderLine[],
  orderDateKey: string,
  issuedAt = new Date(),
): string {
  const dateLabel = issuedAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const rows = lines.length
    ? lines
        .map(
          (line) => `
      <tr>
        <td class="num">${escapeHtml(line.productCode)}</td>
        <td>${escapeHtml(line.productName)}</td>
        <td class="num">${line.quantity}</td>
        <td>${escapeHtml(line.unit)}</td>
        <td>${escapeHtml(line.requestedBy)}</td>
        <td>${escapeHtml(line.note)}</td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="6">신청 품목이 없습니다.</td></tr>';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>사무용품 구매 요청</title>
  <style>
    @page { margin: 14mm; }
    body { font-family: "Noto Sans KR", sans-serif; color: #111; font-size: 12px; }
    h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .meta { color: #555; margin-bottom: 1rem; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 0.45rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 0.78rem; }
    td.num { text-align: right; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>사무용품 구매 요청</h1>
  <p class="meta">
    오피스타운 유통 · 발주 예정 ${escapeHtml(formatOrderDateLabel(orderDateKey))}<br />
    작성일 ${escapeHtml(dateLabel)} · ${lines.length}품목
  </p>
  <table>
    <thead>
      <tr>
        <th>상품코드</th>
        <th>품명</th>
        <th>수량</th>
        <th>단위</th>
        <th>신청자</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
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

export function printOfficeSupplyOrderSheet(lines: OfficeSupplyOrderLine[], orderDateKey: string): boolean {
  const html = buildOfficeSupplyOrderPrintHtml(lines, orderDateKey);
  const popup = window.open('about:blank', 'office-supply-order', 'width=900,height=700');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    printWhenReady(popup);
    return true;
  }
  return false;
}

export async function copyOfficeSupplyOrderText(lines: OfficeSupplyOrderLine[], orderDateKey: string): Promise<boolean> {
  const text = buildOfficeSupplyOrderText(lines, orderDateKey);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
