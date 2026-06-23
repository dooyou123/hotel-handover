export type OfficeSupplyBatchStatus = 'open' | 'submitted';

export type OfficeSupplyBatch = {
  id: string;
  hotel_id: string;
  batch_key: string;
  order_date: string;
  status: OfficeSupplyBatchStatus;
  submitted_at: string | null;
  submitted_by: string;
  created_at: string;
};

export type OfficeSupplyCatalogItem = {
  id: string;
  hotel_id: string;
  product_code: string;
  product_name: string;
  image_url: string;
  unit: string;
  category_id: string;
  goods_id: string;
  order_count: number;
  is_pinned: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export type OfficeSupplyRequest = {
  id: string;
  hotel_id: string;
  batch_id: string;
  product_code: string;
  product_name: string;
  image_url: string;
  unit: string;
  quantity: number;
  note: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
};

export type OfficeSupplyRequestInput = {
  product_code: string;
  product_name: string;
  image_url?: string;
  unit?: string;
  category_id?: string;
  goods_id?: string;
  quantity: number;
  note?: string;
  requested_by: string;
};

export type OfficetownProduct = {
  productCode: string;
  name: string;
  imageUrl: string;
  goodsId: string;
  categoryId: string;
  detailUrl: string;
};

export const OFFICETOWN_BASE_URL = 'https://www.officetown.kr:10444';
export const OFFICETOWN_MALL_URL = `${OFFICETOWN_BASE_URL}/mall/index.php`;
export const OFFICETOWN_PROBE_PRODUCT_CODE = '313890';
export const OFFICETOWN_PROBE_CATEGORY_ID = '04080100';

export type OfficeSupplyCrawlStatus = 'healthy' | 'degraded' | 'broken' | 'unknown';

export type OfficeSupplyCrawlHealth = {
  status: OfficeSupplyCrawlStatus;
  parserVersion: number;
  layoutFingerprint: string;
  previousFingerprint: string;
  fingerprintChanged: boolean;
  probeProductCode: string;
  probeOk: boolean;
  categoryProductCount: number;
  issues: string[];
  checkedAt: string;
};

export const OFFICETOWN_SYNC_CATEGORIES = [
  { id: '04080100', label: '포스트잇' },
  { id: '01010100', label: 'A4 복사용지' },
  { id: '06010100', label: '볼펜' },
  { id: '04010100', label: '테이프' },
  { id: '04070000', label: '봉투' },
  { id: '02020000', label: '토너·잉크' },
] as const;

function readString(row: Record<string, unknown>, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function readNumber(row: Record<string, unknown>, key: string, fallback = 0): number {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeOfficeSupplyBatch(row: Record<string, unknown>): OfficeSupplyBatch {
  const status = row.status;
  return {
    id: readString(row, 'id'),
    hotel_id: readString(row, 'hotel_id'),
    batch_key: readString(row, 'batch_key'),
    order_date: readString(row, 'order_date'),
    status: status === 'submitted' ? 'submitted' : 'open',
    submitted_at: typeof row.submitted_at === 'string' ? row.submitted_at : null,
    submitted_by: readString(row, 'submitted_by'),
    created_at: readString(row, 'created_at'),
  };
}

export function normalizeOfficeSupplyCatalogItem(row: Record<string, unknown>): OfficeSupplyCatalogItem {
  return {
    id: readString(row, 'id'),
    hotel_id: readString(row, 'hotel_id'),
    product_code: readString(row, 'product_code'),
    product_name: readString(row, 'product_name'),
    image_url: readString(row, 'image_url'),
    unit: readString(row, 'unit', '개'),
    category_id: readString(row, 'category_id'),
    goods_id: readString(row, 'goods_id'),
    order_count: readNumber(row, 'order_count'),
    is_pinned: row.is_pinned === true,
    last_synced_at: typeof row.last_synced_at === 'string' ? row.last_synced_at : null,
    created_at: readString(row, 'created_at'),
  };
}

export function normalizeOfficeSupplyRequest(row: Record<string, unknown>): OfficeSupplyRequest {
  return {
    id: readString(row, 'id'),
    hotel_id: readString(row, 'hotel_id'),
    batch_id: readString(row, 'batch_id'),
    product_code: readString(row, 'product_code'),
    product_name: readString(row, 'product_name'),
    image_url: readString(row, 'image_url'),
    unit: readString(row, 'unit', '개'),
    quantity: Math.max(1, readNumber(row, 'quantity', 1)),
    note: readString(row, 'note'),
    requested_by: readString(row, 'requested_by'),
    created_at: readString(row, 'created_at'),
    updated_at: readString(row, 'updated_at'),
  };
}

export function normalizeOfficeSupplyCrawlHealth(row: Record<string, unknown>): OfficeSupplyCrawlHealth {
  const status = row.status;
  const issues = row.issues;
  return {
    status:
      status === 'healthy' || status === 'degraded' || status === 'broken' || status === 'unknown'
        ? status
        : 'unknown',
    parserVersion: readNumber(row, 'parser_version', 1),
    layoutFingerprint: readString(row, 'layout_fingerprint'),
    previousFingerprint: readString(row, 'previous_fingerprint'),
    fingerprintChanged: row.fingerprint_changed === true,
    probeProductCode: readString(row, 'probe_product_code', OFFICETOWN_PROBE_PRODUCT_CODE),
    probeOk: row.probe_ok === true,
    categoryProductCount: readNumber(row, 'category_product_count'),
    issues: Array.isArray(issues) ? issues.map((issue) => String(issue)) : [],
    checkedAt: readString(row, 'checked_at'),
  };
}
