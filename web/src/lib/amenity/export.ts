import { formatAmenityDateTime, type AmenityTransaction } from '@/lib/amenity/types';

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function getAmenityTransactionsExportFilename(date = new Date()): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return `어메니티_입출고_${stamp}.csv`;
}

export function buildAmenityTransactionsCsv(transactions: AmenityTransaction[]): string {
  const headers = ['일시', '구분', '품목', '수량(개)', '박스수', '작성자', '메모'];
  const rows = transactions.map((tx) => [
    formatAmenityDateTime(tx.created_at),
    tx.type,
    tx.amenities?.name ?? '',
    tx.total_items,
    tx.box_count,
    tx.author,
    tx.memo,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  return `\uFEFF${csv}`;
}

export function downloadAmenityTransactionsCsv(transactions: AmenityTransaction[]): void {
  const content = buildAmenityTransactionsCsv(transactions);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getAmenityTransactionsExportFilename();
  link.click();
  URL.revokeObjectURL(url);
}
