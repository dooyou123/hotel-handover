import { Suspense } from 'react';
import { SchedulesPage } from '@/components/schedules/schedules-page';

export default function SchedulesRoutePage() {
  return (
    <Suspense fallback={<div className="empty-state">스케줄을 불러오는 중…</div>}>
      <SchedulesPage />
    </Suspense>
  );
}
