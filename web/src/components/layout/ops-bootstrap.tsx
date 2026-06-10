'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { runAutoArchiveDoneCards } from '@/lib/hotel-settings';
import { OpsAlertsBar } from '@/components/layout/ops-alerts-bar';

const AUTO_ARCHIVE_KEY = 'hotel-handover-auto-archive-date';

export function OpsBootstrap({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(AUTO_ARCHIVE_KEY);
    if (last === today) return;

    runAutoArchiveDoneCards()
      .then((count) => {
        localStorage.setItem(AUTO_ARCHIVE_KEY, today);
        if (count > 0) {
          queryClient.invalidateQueries({ queryKey: ['cards'] });
          queryClient.invalidateQueries({ queryKey: ['archived-cards'] });
        }
      })
      .catch(() => {
        // migration 미적용 시 무시
      });
  }, [queryClient]);

  return (
    <>
      <OpsAlertsBar />
      {children}
    </>
  );
}
