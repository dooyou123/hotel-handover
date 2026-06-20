'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { NoticesPageClient } from '@/components/notices/notices-page';
import { TodosPageClient } from '@/components/todos/todos-page';
import { WorkHubSchedulePanel } from '@/components/work/work-hub-schedule-panel';
import {
  WORK_HUB_TABS,
  buildWorkHubHref,
  parseWorkHubTab,
  type WorkHubTab,
} from '@/lib/work/work-hub';

function WorkHubPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseWorkHubTab(searchParams);

  function selectTab(next: WorkHubTab) {
    router.replace(buildWorkHubHref(next), { scroll: false });
  }

  return (
    <section className="project-board work-hub">
      <header className="project-board__head">
        <div>
          <h1>팀 소식·일정</h1>
          <p>공지·할일·호텔 일정을 한곳에서 확인합니다.</p>
        </div>
      </header>

      <div className="work-hub__tabs" role="tablist" aria-label="팀 소식·일정">
        {WORK_HUB_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            title={item.description}
            className={`work-hub__tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="work-hub__panel" role="tabpanel">
        {tab === 'schedule' ? <WorkHubSchedulePanel /> : null}
        {tab === 'notices' ? <NoticesPageClient embedded /> : null}
        {tab === 'personal' ? <TodosPageClient embedded forceScope="personal" /> : null}
      </div>
    </section>
  );
}

export function WorkHubPageClient() {
  return (
    <Suspense fallback={<div className="empty-state">불러오는 중…</div>}>
      <WorkHubPageInner />
    </Suspense>
  );
}
