'use client';

import type { ReactNode } from 'react';

export type HandoverStatusTab = 'progress' | 'hold' | 'done' | 'archive';

export const HANDOVER_STATUS_TABS: { id: HandoverStatusTab; label: string }[] = [
  { id: 'progress', label: '진행중' },
  { id: 'hold', label: '보류' },
  { id: 'done', label: '완료' },
  { id: 'archive', label: '보관함' },
];

type HandoverStatusTabsProps = {
  active: HandoverStatusTab;
  counts: Record<HandoverStatusTab, number>;
  onChange: (tab: HandoverStatusTab) => void;
  actions?: ReactNode;
};

export function HandoverStatusTabs({ active, counts, onChange, actions }: HandoverStatusTabsProps) {
  return (
    <div className="project-list__status-bar">
      <div className="project-list__status-tabs" role="tablist" aria-label="인수인계 상태">
        {HANDOVER_STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`project-list__status-tab project-list__status-tab--${tab.id}${
              active === tab.id ? ' is-active' : ''
            }`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            <span className="project-list__status-count">{counts[tab.id]}</span>
          </button>
        ))}
      </div>
      {actions ? <div className="project-list__status-actions">{actions}</div> : null}
    </div>
  );
}
