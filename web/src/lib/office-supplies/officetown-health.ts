import {
  OFFICETOWN_PROBE_CATEGORY_ID,
  OFFICETOWN_PROBE_PRODUCT_CODE,
  type OfficeSupplyCrawlHealth,
  type OfficeSupplyCrawlStatus,
} from '@/lib/office-supplies/types';
import { fetchOfficetownHtml, parseOfficetownListHtml } from '@/lib/office-supplies/officetown';

/** 파서/레이아웃 기대값 버전. HTML 구조 대응 시 증가 */
export const OFFICETOWN_PARSER_VERSION = 1;

export const OFFICETOWN_LAYOUT_MARKERS = [
  'goods_grid_bookcode',
  'goods_grid_name',
  '<td width="20%" valign="top"',
] as const;

export type OfficetownLayoutAnalysis = {
  hasBookcodeMarker: boolean;
  hasNameMarker: boolean;
  hasGridCellMarker: boolean;
  bookcodeMarkerCount: number;
  parsedProductCount: number;
  isRedirectPage: boolean;
};

export function isOfficetownRedirectHtml(html: string): boolean {
  const trimmed = html.trim();
  return (
    trimmed.includes("document.location.href = 'index.php'") ||
    trimmed.includes('document.location.href = "index.php"')
  );
}

export function analyzeOfficetownListHtml(html: string): OfficetownLayoutAnalysis {
  return {
    hasBookcodeMarker: html.includes('goods_grid_bookcode'),
    hasNameMarker: html.includes('goods_grid_name'),
    hasGridCellMarker: html.includes('<td width="20%" valign="top"'),
    bookcodeMarkerCount: (html.match(/goods_grid_bookcode/g) ?? []).length,
    parsedProductCount: parseOfficetownListHtml(html).length,
    isRedirectPage: isOfficetownRedirectHtml(html),
  };
}

export function buildOfficetownLayoutFingerprint(
  searchAnalysis: OfficetownLayoutAnalysis,
  categoryAnalysis: OfficetownLayoutAnalysis,
): string {
  const parts = [
    `v${OFFICETOWN_PARSER_VERSION}`,
    `search:bookcode=${searchAnalysis.hasBookcodeMarker ? 1 : 0}`,
    `search:name=${searchAnalysis.hasNameMarker ? 1 : 0}`,
    `search:grid=${searchAnalysis.hasGridCellMarker ? 1 : 0}`,
    `search:codes=${searchAnalysis.bookcodeMarkerCount}`,
    `search:parsed=${searchAnalysis.parsedProductCount}`,
    `category:bookcode=${categoryAnalysis.hasBookcodeMarker ? 1 : 0}`,
    `category:name=${categoryAnalysis.hasNameMarker ? 1 : 0}`,
    `category:grid=${categoryAnalysis.hasGridCellMarker ? 1 : 0}`,
    `category:codes=${categoryAnalysis.bookcodeMarkerCount}`,
    `category:parsed=${categoryAnalysis.parsedProductCount}`,
  ];
  return parts.join('|');
}

type EvaluateInput = {
  probeSearchHtml: string;
  probeCategoryHtml: string;
  probeProductCode: string;
  previousFingerprint?: string;
  previousStatus?: OfficeSupplyCrawlStatus;
};

export function evaluateOfficetownCrawlHealth(input: EvaluateInput): OfficeSupplyCrawlHealth {
  const searchAnalysis = analyzeOfficetownListHtml(input.probeSearchHtml);
  const categoryAnalysis = analyzeOfficetownListHtml(input.probeCategoryHtml);
  const searchProducts = parseOfficetownListHtml(input.probeSearchHtml);
  const categoryProducts = parseOfficetownListHtml(input.probeCategoryHtml);
  const probeProduct =
    searchProducts.find((product) => product.productCode === input.probeProductCode) ?? searchProducts[0] ?? null;

  const layoutFingerprint = buildOfficetownLayoutFingerprint(searchAnalysis, categoryAnalysis);
  const previousFingerprint = input.previousFingerprint ?? '';
  const fingerprintChanged = Boolean(previousFingerprint && previousFingerprint !== layoutFingerprint);
  const issues: string[] = [];

  const missingMarkers = OFFICETOWN_LAYOUT_MARKERS.filter(
    (marker) => !input.probeSearchHtml.includes(marker) && !input.probeCategoryHtml.includes(marker),
  );
  if (missingMarkers.length) {
    issues.push(`필수 HTML 마커 누락: ${missingMarkers.join(', ')}`);
  }

  if (searchAnalysis.isRedirectPage || categoryAnalysis.isRedirectPage) {
    issues.push('오피스타운이 로그인/리다이렉트 응답을 반환했습니다.');
  }

  if (searchAnalysis.bookcodeMarkerCount > 0 && searchAnalysis.parsedProductCount === 0) {
    issues.push('상품코드 마커는 있으나 파서가 품목을 읽지 못했습니다. 사이트 HTML 구조가 바뀌었을 수 있습니다.');
  }

  if (categoryAnalysis.bookcodeMarkerCount > 0 && categoryAnalysis.parsedProductCount === 0) {
    issues.push('카테고리 목록 마커는 있으나 파서가 품목을 읽지 못했습니다.');
  }

  if (!probeProduct || probeProduct.productCode !== input.probeProductCode) {
    issues.push(`프로브 상품(${input.probeProductCode})을 검색 결과에서 확인하지 못했습니다.`);
  }

  if (categoryProducts.length === 0) {
    issues.push(`프로브 카테고리(${OFFICETOWN_PROBE_CATEGORY_ID})에서 품목을 찾지 못했습니다.`);
  }

  if (fingerprintChanged && input.previousStatus === 'healthy') {
    issues.push('이전 정상 상태와 비교해 사이트 레이아웃 지문이 변경되었습니다.');
  }

  let status: OfficeSupplyCrawlStatus = 'healthy';
  const hasBrokenSignal =
    missingMarkers.length > 0 ||
    searchAnalysis.isRedirectPage ||
    categoryAnalysis.isRedirectPage ||
    (searchAnalysis.bookcodeMarkerCount > 0 && searchAnalysis.parsedProductCount === 0) ||
    (categoryAnalysis.bookcodeMarkerCount > 0 && categoryAnalysis.parsedProductCount === 0);

  if (hasBrokenSignal) {
    status = 'broken';
  } else if (issues.length > 0 || fingerprintChanged) {
    status = 'degraded';
  }

  return {
    status,
    parserVersion: OFFICETOWN_PARSER_VERSION,
    layoutFingerprint,
    previousFingerprint,
    fingerprintChanged,
    probeProductCode: input.probeProductCode,
    probeOk: probeProduct?.productCode === input.probeProductCode,
    categoryProductCount: categoryProducts.length,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

export async function runOfficetownCrawlHealthCheck(options?: {
  previousFingerprint?: string;
  previousStatus?: OfficeSupplyCrawlStatus;
  probeProductCode?: string;
}): Promise<OfficeSupplyCrawlHealth> {
  const probeProductCode = options?.probeProductCode ?? OFFICETOWN_PROBE_PRODUCT_CODE;
  const [probeSearchHtml, probeCategoryHtml] = await Promise.all([
    fetchOfficetownHtml(`m_mall_list.php?ps_search=${encodeURIComponent(probeProductCode)}`),
    fetchOfficetownHtml(`m_mall_list.php?ps_ctid=${OFFICETOWN_PROBE_CATEGORY_ID}`),
  ]);

  return evaluateOfficetownCrawlHealth({
    probeSearchHtml,
    probeCategoryHtml,
    probeProductCode,
    previousFingerprint: options?.previousFingerprint,
    previousStatus: options?.previousStatus,
  });
}

export function crawlHealthBlocksSync(status: OfficeSupplyCrawlStatus): boolean {
  return status === 'broken';
}

export function crawlHealthStatusLabel(status: OfficeSupplyCrawlStatus): string {
  // server-only 모듈이므로 UI에서는 `crawl-health-ui.ts`를 사용하세요.
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
