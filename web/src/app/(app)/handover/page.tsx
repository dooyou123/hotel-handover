import { Suspense } from 'react';
import { HandoverPage } from '@/components/handover/handover-page';

export default function Page() {
  return (
    <Suspense fallback={<div className="empty-state">인수인계 보드를 불러오는 중…</div>}>
      <HandoverPage />
    </Suspense>
  );
}
