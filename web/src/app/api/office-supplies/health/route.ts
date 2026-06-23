import { NextResponse, type NextRequest } from 'next/server';
import {
  readOfficeSupplyCrawlHealth,
  runAndPersistOfficeSupplyCrawlHealth,
} from '@/lib/office-supplies/crawl-health-store';
import { hasServiceRoleKey } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  const live = request.nextUrl.searchParams.get('live') === '1';

  try {
    if (live) {
      const health = await runAndPersistOfficeSupplyCrawlHealth();
      return NextResponse.json({ health, live: true });
    }

    const health = await readOfficeSupplyCrawlHealth();
    return NextResponse.json({ health, live: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : '연동 상태 확인에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
