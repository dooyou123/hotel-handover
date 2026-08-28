import type { AmenityTransaction } from '@/lib/amenity/types';
import { formatAmenityQty, resolveAmenityUnit } from '@/lib/amenity/units';

export type AmenityTransactionDisplayType = '입고' | '출고' | '실사';

export function isLegacyAuditMemo(memo: string): boolean {
  const trimmed = memo.trim();
  return trimmed.startsWith('재고조정') || trimmed.startsWith('[실사]');
}

export function resolveAmenityTransactionDisplayType(
  tx: Pick<AmenityTransaction, 'type' | 'memo'>,
): AmenityTransactionDisplayType {
  if (tx.type === '실사') return '실사';
  if (isLegacyAuditMemo(tx.memo)) return '실사';
  return tx.type;
}

export function matchesAmenityTransactionFilter(
  tx: AmenityTransaction,
  filter: 'all' | AmenityTransactionDisplayType,
): boolean {
  if (filter === 'all') return true;
  return resolveAmenityTransactionDisplayType(tx) === filter;
}

export function formatAmenityTransactionQuantity(tx: AmenityTransaction): string {
  const displayType = resolveAmenityTransactionDisplayType(tx);
  const unit = resolveAmenityUnit(tx.amenities);
  const qty = formatAmenityQty(tx.total_items, unit);

  if (displayType !== '실사') return qty;

  if (tx.audit_before != null && tx.audit_after != null) {
    return `${qty} · ${tx.audit_before.toLocaleString()}→${tx.audit_after.toLocaleString()}`;
  }

  return qty;
}

export function amenityTransactionBadgeClass(displayType: AmenityTransactionDisplayType): string {
  if (displayType === '입고') return 'amenity-stock-badge--ok';
  if (displayType === '실사') return 'amenity-stock-badge--audit';
  return 'amenity-stock-badge--critical';
}
