'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HotelEvent } from '@/lib/events/types';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import {
  deriveShiftWorkbenchState,
  formatWorkbenchSessionParts,
} from '@/lib/handover/shift-ui-state';
import type { Todo } from '@/lib/todos/types';
import type { WorkSession } from '@/lib/handover/types';
import { useTodayShiftHandovers } from '@/lib/handover/use-activity-logs';
import { PersonalTasksPanel } from '@/components/personal-tasks/personal-tasks-panel';
import { AsideMonthCalendar } from './aside-month-calendar';
import { HandoverAsideRecords } from './handover-aside-records';
import { HandoverTopActions } from './handover-top-actions';

type HandoverAsideProjectProps = {
  session: WorkSession;
  todos: Todo[];
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onOpenRecords: (tab: HandoverRecordsTab) => void;
  onOpenCardById?: (cardId: string) => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onToggleTodo: (todo: Todo) => void;
};

const INTRO_PULSE_MS = 1800;

export function HandoverAsideProject({
  session,
  todos,
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onOpenRecords,
  onOpenCardById,
  onOpenTodo,
  onOpenEvent,
  onToggleTodo,
}: HandoverAsideProjectProps) {
  const { data: todayHandovers = [] } = useTodayShiftHandovers(30);
  const shiftState = deriveShiftWorkbenchState(session, todayHandovers);
  const sessionParts = formatWorkbenchSessionParts(session);
  const needsAttention = shiftState !== 'on_shift';
  const [introPulse, setIntroPulse] = useState(needsAttention);
  const introTimerRef = useRef<number | null>(null);

  const playIntroPulse = useCallback(() => {
    if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
    setIntroPulse(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIntroPulse(true);
        introTimerRef.current = window.setTimeout(() => {
          setIntroPulse(false);
          introTimerRef.current = null;
        }, INTRO_PULSE_MS);
      });
    });
  }, []);

  useEffect(() => {
    if (!needsAttention) {
      setIntroPulse(false);
      return;
    }
    playIntroPulse();
  }, [needsAttention, session.name, session.group, playIntroPulse]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        playIntroPulse();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
    };
  }, [playIntroPulse]);

  const stateLabel =
    shiftState === 'needs_session'
      ? '근무 정보 필요'
      : shiftState === 'needs_start'
        ? '교대 시작 전'
        : '근무 중';

  return (
    <aside className="project-handover__aside" aria-label="업무 사이드바">
      <div className="project-handover-aside">
        <section className="aside-card aside-card--shift aside-card--primary">
          <div
            className={[
              'aside-shift-status',
              shiftState === 'needs_session' ? 'aside-shift-status--warn' : '',
              shiftState === 'needs_start' ? 'aside-shift-status--pending' : '',
              shiftState === 'on_shift' ? 'aside-shift-status--active' : '',
              introPulse ? 'aside-shift-status--intro' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            <div className="aside-shift-status__identity">
              <span className="aside-shift-status__name">{sessionParts.name}</span>
              {sessionParts.group ? (
                <span className="aside-shift-status__group">{sessionParts.group}</span>
              ) : null}
            </div>
            <span className="aside-shift-status__state">{stateLabel}</span>
          </div>
          <HandoverTopActions
            shiftState={shiftState}
            layout="grid"
            onShiftStart={onShiftStart}
            onShiftEnd={onShiftEnd}
            onOpenShiftBrief={onOpenShiftBrief}
          />
        </section>

        <HandoverAsideRecords onOpenRecords={onOpenRecords} onOpenCardById={onOpenCardById} />

        <AsideMonthCalendar
          todos={todos}
          onOpenEvent={onOpenEvent}
          onOpenTodo={onOpenTodo}
          onToggleTodo={onToggleTodo}
        />

        <section className="aside-card aside-card--personal-tasks">
          <PersonalTasksPanel variant="aside" />
        </section>
      </div>
    </aside>
  );
}
