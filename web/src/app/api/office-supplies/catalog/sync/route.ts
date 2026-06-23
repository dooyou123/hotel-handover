import { NextResponse } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  readOfficeSupplyCrawlHealth,
  runAndPersistOfficeSupplyCrawlHealth,
} from '@/lib/office-supplies/crawl-health-store';
import { crawlHealthBlocksSync } from '@/lib/office-supplies/officetown-health';
import { syncOfficetownCatalogProducts } from '@/lib/office-supplies/officetown';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export async function POST() {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  try {
    const health = await runAndPersistOfficeSupplyCrawlHealth();
    if (crawlHealthBlocksSync(health.status)) {
      return NextResponse.json(
        {
          error: '오피스타운 사이트 구조 변경으로 카탈로그 동기화를 중단했습니다.',
          health,
        },
        { status: 409 },
      );
    }

    const products = await syncOfficetownCatalogProducts();
    const supabase = createServiceClient();
    const syncedAt = new Date().toISOString();
    let upserted = 0;

    for (const product of products) {
      const { error } = await supabase.from('office_supply_catalog').upsert(
        {
          hotel_id: DEFAULT_HOTEL_ID,
          product_code: product.productCode,
          product_name: product.name,
          image_url: product.imageUrl,
          category_id: product.categoryId,
          goods_id: product.goodsId,
          last_synced_at: syncedAt,
        },
        { onConflict: 'hotel_id,product_code', ignoreDuplicates: false },
      );
      if (error) throw error;
      upserted += 1;
    }

    return NextResponse.json({ count: upserted, syncedAt, health });
  } catch (error) {
    const message = error instanceof Error ? error.message : '카탈로그 동기화에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
