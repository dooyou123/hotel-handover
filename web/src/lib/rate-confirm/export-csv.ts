import type { ReconcileRecord } from '@/lib/rate-confirm/compare-engine';

function detailTypes(record: ReconcileRecord): string {
  const parts: string[] = [];
  if (record.errors.includes('MISSING_IN_PMS')) {
    parts.push('PMS 누락');
  } else {
    if (record.errors.includes('STATUS_MISMATCH')) parts.push('상태 불일치');
    if (record.errors.includes('DATE_MISMATCH')) parts.push('날짜 불일치');
    if (record.errors.includes('RATE_MISMATCH')) parts.push('객실료 불일치');
    if (record.errors.includes('ACCOUNT_MISMATCH')) parts.push('OTA명 불일치');
  }
  return parts.join(', ');
}

export function buildReconcileCsv(errors: ReconcileRecord[], matches: ReconcileRecord[]): string {
  const headers = [
    '대조구분',
    '상세유형',
    '예약번호(OTA)',
    '고객명',
    'TL 상태',
    'TL 객실료',
    'TL OTA명',
    'TL 체크인',
    'PMS 상태',
    'PMS 객실료',
    'PMS Account(OTA)',
    'PMS 체크인',
  ];

  const rows: string[][] = [];

  for (const record of errors) {
    const missing = record.errors.includes('MISSING_IN_PMS');
    rows.push([
      '불일치',
      detailTypes(record),
      record.ota,
      record.guestName,
      record.tl?.status ?? '',
      record.tl?.rateDisplay ?? '',
      record.tl?.account ?? '',
      record.tl?.ciDate ?? '',
      missing ? '미등록(누락)' : (record.pms?.status ?? ''),
      missing ? '미등록(누락)' : (record.pms?.rateDisplay ?? ''),
      missing ? '미등록(누락)' : (record.pms?.account ?? ''),
      missing ? '미등록(누락)' : (record.pms?.ciDate ?? ''),
    ]);
  }

  for (const record of matches) {
    rows.push([
      '정상',
      '일치(정상)',
      record.ota,
      record.guestName,
      record.tl?.status ?? '',
      record.tl?.rateDisplay ?? '',
      record.tl?.account ?? '',
      record.tl?.ciDate ?? '',
      record.pms?.status ?? '',
      record.pms?.rateDisplay ?? '',
      record.pms?.account ?? '',
      record.pms?.ciDate ?? '',
    ]);
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return `\uFEFF${csv}`;
}

export function downloadReconcileCsv(errors: ReconcileRecord[], matches: ReconcileRecord[]) {
  const content = buildReconcileCsv(errors, matches);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  link.href = url;
  link.download = `객실료_대조_${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
