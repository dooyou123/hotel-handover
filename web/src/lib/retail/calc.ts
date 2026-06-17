import type { RetailPeriodLine } from '@/lib/retail/types';

export function calcTheoreticalQty(line: Pick<RetailPeriodLine, 'opening_qty' | 'restock_qty' | 'sales_qty' | 'free_qty'>): number {
  return line.opening_qty + line.restock_qty - line.sales_qty - line.free_qty;
}

export function calcDifferenceQty(actualQty: number, theoreticalQty: number): number {
  return actualQty - theoreticalQty;
}

export function enrichSettlementLine(
  line: RetailPeriodLine,
  productName: string,
): { product_name: string; theoretical_qty: number; difference_qty: number } & RetailPeriodLine {
  const theoretical_qty = calcTheoreticalQty(line);
  return {
    ...line,
    product_name: productName,
    theoretical_qty,
    difference_qty: calcDifferenceQty(line.actual_qty, theoretical_qty),
  };
}
