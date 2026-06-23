import type { OfficeSupplyCrawlStatus } from '@/lib/office-supplies/types';

export function crawlHealthStatusLabel(status: OfficeSupplyCrawlStatus): string {
  switch (status) {
    case 'healthy':
      return '연동 정상';
    case 'degraded':
      return '변경 의심';
    case 'broken':
      return '연동 불가';
    default:
      return '미확인';
  }
}

