'use client';

export type HandoverMobileView = 'list' | 'panel';

type HandoverMobileViewTabsProps = {
  view: HandoverMobileView;
  panelBadge?: number;
  onChange: (view: HandoverMobileView) => void;
};

export function HandoverMobileViewTabs({ view, panelBadge = 0, onChange }: HandoverMobileViewTabsProps) {
  return (
    <div className="handover-mobile-view-tabs" role="tablist" aria-label="인수인계 화면">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'list'}
        className={`handover-mobile-view-tabs__btn${view === 'list' ? ' is-active' : ''}`}
        onClick={() => onChange('list')}
      >
        목록
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'panel'}
        className={`handover-mobile-view-tabs__btn${view === 'panel' ? ' is-active' : ''}`}
        onClick={() => onChange('panel')}
      >
        패널
        {panelBadge > 0 ? (
          <span className="handover-mobile-view-tabs__badge" aria-label={`알림 ${panelBadge}건`}>
            {panelBadge > 9 ? '9+' : panelBadge}
          </span>
        ) : null}
      </button>
    </div>
  );
}
