import { Suspense } from 'react';
import { NoticesPageClient } from '@/components/notices/notices-page';

export default function NoticesPage() {
  return (
    <Suspense fallback={<div className="empty-state">게시판을 불러오는 중…</div>}>
      <NoticesPageClient />
    </Suspense>
  );
}
