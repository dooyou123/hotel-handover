'use client';

import type { TodayAlertItem } from '@/lib/today/alerts';

type HandoverAlertsStripProps = {
  alerts: TodayAlertItem[];
  onAlertClick: (id: string) => void;
};

export function HandoverAlertsStrip({ alerts, onAlertClick }: HandoverAlertsStripProps) {
  if (!alerts.length) return null;

  return (
    <div className="handover-alerts" role="status" aria-live="polite">
      {alerts.map((alert) => (
        <button
          key={alert.id}
          type="button"
          className={`handover-alerts__item handover-alerts__item--${alert.tone}`}
          onClick={() => onAlertClick(alert.id)}
        >
          <strong>{alert.label}</strong>
          <span>{alert.detail}</span>
        </button>
      ))}
    </div>
  );
}
