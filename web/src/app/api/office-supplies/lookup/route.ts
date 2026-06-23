import { NextResponse, type NextRequest } from 'next/server';
import { readOfficeSupplyCrawlHealth } from '@/lib/office-supplies/crawl-health-store';
import { lookupOfficetownProduct } from '@/lib/office-supplies/officetown';
import { hasServiceRoleKey } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim();
  if (!code) {
    return NextResponse.json({ error: '상품코드를 입력해 주세요.' }, { status: 400 });
  }

  try {
    let crawlHealth = null;
    if (hasServiceRoleKey()) {
      crawlHealth = await readOfficeSupplyCrawlHealth();
    }

    const product = await lookupOfficetownProduct(code);
    if (!product) {
      return NextResponse.json(
        {
          error: '상품을 찾지 못했습니다. 코드를 확인해 주세요.',
          crawlHealth,
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ product, crawlHealth });
  } catch (error) {
    const message = error instanceof Error ? error.message : '상품 조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
