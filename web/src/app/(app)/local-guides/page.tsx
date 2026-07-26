import { Suspense } from 'react';
import { LocalGuidesPageClient } from '@/components/local-guides/local-guides-page';

export default function LocalGuidesPage() {
  return (
    <Suspense fallback={<div className="empty-state">퀵가이드를 불러오는 중…</div>}>
      <LocalGuidesPageClient />
    </Suspense>
  );
}
