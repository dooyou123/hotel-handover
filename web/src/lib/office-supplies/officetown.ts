import https from 'node:https';
import {
  OFFICETOWN_BASE_URL,
  OFFICETOWN_SYNC_CATEGORIES,
  type OfficetownProduct,
} from '@/lib/office-supplies/types';

const USER_AGENT = 'Mozilla/5.0 (compatible; HotelHandover/1.0)';

function decodeEucKr(buffer: Buffer): string {
  try {
    return new TextDecoder('euc-kr').decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

export function absolutizeOfficetownUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('//')) return `https:${path}`;
  if (path.startsWith('/')) return `${OFFICETOWN_BASE_URL}${path}`;
  return `${OFFICETOWN_BASE_URL}/mall/${path}`;
}

export function fetchOfficetownHtml(path: string): Promise<string> {
  const url = absolutizeOfficetownUrl(path.startsWith('/mall/') ? path : `/mall/${path.replace(/^\//, '')}`);

  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          rejectUnauthorized: false,
          ciphers: 'DEFAULT@SECLEVEL=0',
          minVersion: 'TLSv1.2',
          headers: { 'User-Agent': USER_AGENT },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(decodeEucKr(Buffer.concat(chunks))));
          response.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

export function parseOfficetownListHtml(html: string): OfficetownProduct[] {
  const blocks = html.split('<td width="20%" valign="top"');
  const products: OfficetownProduct[] = [];
  const seen = new Set<string>();

  for (const block of blocks.slice(1)) {
    const codeMatch = /goods_grid_bookcode">\[(\d+)\]</.exec(block);
    const nameMatch = /goods_grid_name"><a href="[^"]+">([^<]+)</.exec(block);
    const imageMatch = /<img src="([^"]+)"/.exec(block);
    const goodsMatch = /ps_goid=(\d+)/.exec(block);
    const categoryMatch = /ps_ctid=([^&"]+)/.exec(block);
    if (!codeMatch || !nameMatch || !imageMatch) continue;

    const productCode = codeMatch[1];
    if (seen.has(productCode)) continue;
    seen.add(productCode);

    const categoryId = categoryMatch?.[1] ?? '';
    const goodsId = goodsMatch?.[1] ?? '';
    const detailPath =
      categoryId && goodsId
        ? `/mall/m_mall_detail.php?ps_ctid=${categoryId}&ps_goid=${goodsId}`
        : '';

    products.push({
      productCode,
      name: nameMatch[1].trim(),
      imageUrl: absolutizeOfficetownUrl(imageMatch[1]),
      goodsId,
      categoryId,
      detailUrl: detailPath ? absolutizeOfficetownUrl(detailPath) : '',
    });
  }

  return products;
}

export async function lookupOfficetownProduct(productCode: string): Promise<OfficetownProduct | null> {
  const normalized = productCode.trim();
  if (!/^\d{5,8}$/.test(normalized)) return null;

  const html = await fetchOfficetownHtml(`m_mall_list.php?ps_search=${encodeURIComponent(normalized)}`);
  const products = parseOfficetownListHtml(html);
  return products.find((product) => product.productCode === normalized) ?? products[0] ?? null;
}

export async function syncOfficetownCatalogProducts(): Promise<OfficetownProduct[]> {
  const merged = new Map<string, OfficetownProduct>();

  for (const category of OFFICETOWN_SYNC_CATEGORIES) {
    const html = await fetchOfficetownHtml(`m_mall_list.php?ps_ctid=${category.id}`);
    for (const product of parseOfficetownListHtml(html)) {
      merged.set(product.productCode, product);
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}
