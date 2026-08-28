import { orderBoxItemCount } from '@/lib/amenity/reorder';
import type { InventoryItem } from '@/lib/amenity/types';
import { formatAmenityQty, isBagAmenityUnit, resolveAmenityUnit } from '@/lib/amenity/units';

export type AmenityOrderLine = {
  id: number;
  name: string;
  quantity: number;
  monthlyUsage: number;
  orderBoxes: number;
  boxSize: number;
  orderItems: number;
  unit: string;
};

export function buildAmenityOrderLines(items: InventoryItem[]): AmenityOrderLine[] {
  return items
    .filter((item) => item.orderBoxes > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      monthlyUsage: item.monthlyUsage,
      orderBoxes: item.orderBoxes,
      boxSize: item.box_size,
      orderItems: orderBoxItemCount(item.orderBoxes, item.box_size),
      unit: resolveAmenityUnit(item),
    }))
    .sort((a, b) => b.orderBoxes - a.orderBoxes || a.name.localeCompare(b.name, 'ko'));
}

export function buildAmenityOrderText(lines: AmenityOrderLine[], issuedAt = new Date()): string {
  const dateLabel = issuedAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const header = [`어메니티 발주서`, `작성일: ${dateLabel}`, ''];
  if (!lines.length) {
    return [...header, '발주 권장 품목이 없습니다. (최근 30일 출고 대비 재고 충분)'].join('\n');
  }
  const body = lines.map((line, index) => {
    const qty = (n: number) => formatAmenityQty(n, line.unit);
    if (isBagAmenityUnit(line.unit)) {
      return `${index + 1}. ${line.name}\n   권장 ${qty(line.orderItems)}\n   현재고 ${qty(line.quantity)} · 최근 30일 출고 ${qty(line.monthlyUsage)}`;
    }
    return `${index + 1}. ${line.name}\n   권장 ${line.orderBoxes}박스 (${line.boxSize}개/박스) · 합계 ${qty(line.orderItems)}\n   현재고 ${qty(line.quantity)} · 최근 30일 출고 ${qty(line.monthlyUsage)}`;
  });
  return [...header, `총 ${lines.length}품목`, '', ...body].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAmenityOrderPrintHtml(lines: AmenityOrderLine[], issuedAt = new Date()): string {
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
        <td>${escapeHtml(line.name)}</td>
        <td class="num">${formatAmenityQty(line.quantity, line.unit)}</td>
        <td class="num">${formatAmenityQty(line.monthlyUsage, line.unit)}</td>
        <td class="num"><strong>${isBagAmenityUnit(line.unit) ? formatAmenityQty(line.orderItems, line.unit) : `${line.orderBoxes}박스`}</strong></td>
        <td class="num">${isBagAmenityUnit(line.unit) ? '—' : `${line.boxSize}개`}</td>
        <td class="num">${formatAmenityQty(line.orderItems, line.unit)}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="6">발주 권장 품목이 없습니다.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>어메니티 발주서</title>
  <style>
    @page { margin: 14mm; }
    body { font-family: "Noto Sans KR", sans-serif; color: #111; font-size: 12px; }
    h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .meta { color: #555; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 0.45rem 0.5rem; text-align: left; }
    th { background: #f3f4f6; font-size: 0.78rem; }
    td.num { text-align: right; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>어메니티 발주서</h1>
  <p class="meta">작성일 ${escapeHtml(dateLabel)} · 권장 발주 ${lines.length}품목 (최근 30일 출고 기준)</p>
  <table>
    <thead>
      <tr>
        <th>품목</th>
        <th>현재고</th>
        <th>30일 출고</th>
        <th>발주 박스</th>
        <th>박스당</th>
        <th>발주 수량</th>
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

export function printAmenityOrderSheet(lines: AmenityOrderLine[]): boolean {
  const html = buildAmenityOrderPrintHtml(lines);

  const popup = window.open('about:blank', 'amenity-order-sheet', 'width=900,height=700');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    printWhenReady(popup);
    return true;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '어메니티 발주서');
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
