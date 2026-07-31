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
import type { PersonalTask } from '@/lib/personal-tasks/types';
import { useTrashedCount } from '@/lib/handover/use-cards';
import { AsideMemoPad } from './aside-memo-pad';
import { AsideMonthCalendar } from './aside-month-calendar';
import { HandoverAsideRecords } from './handover-aside-records';
import { AsideLongHoldPanel } from './aside-long-hold-panel';
import { HandoverTopActions } from './handover-top-actions';
import type { Card } from '@/lib/handover/types';

type HandoverAsideProjectProps = {
  session: WorkSession;
  todos: Todo[];
  cards?: Card[];
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onOpenRecords: (tab: HandoverRecordsTab) => void;
  onOpenCardById?: (cardId: string) => void;
  onShowLongHold?: () => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onToggleTodo: (todo: Todo) => void;
  onPromoteTaskToCard?: (task: PersonalTask) => void;
  onOpenTrash?: () => void;
};

const INTRO_PULSE_MS = 1800;

export function HandoverAsideProject({
  session,
  todos,
  cards = [],
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onOpenRecords,
  onOpenCardById,
  onShowLongHold,
  onOpenTodo,
  onOpenEvent,
  onToggleTodo,
  onPromoteTaskToCard,
  onOpenTrash,
}: HandoverAsideProjectProps) {
  const { data: trashedCount = 0 } = useTrashedCount();
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

        {onShowLongHold ? (
          <AsideLongHoldPanel
            cards={cards}
            onOpenCardById={onOpenCardById}
            onShowAll={onShowLongHold}
          />
        ) : null}

        <AsideMonthCalendar
          todos={todos}
          onOpenEvent={onOpenEvent}
          onOpenTodo={onOpenTodo}
          onToggleTodo={onToggleTodo}
        />

        <section className="aside-card aside-card--personal-tasks">
          <PersonalTasksPanel variant="aside" onPromoteToCard={onPromoteTaskToCard} />
        </section>

        <AsideMemoPad staffName={session.name} />

        {onOpenTrash ? (
          <button
            type="button"
            className="aside-trash"
            onClick={onOpenTrash}
            title="삭제한 인수인계 — 30일간 보관 후 자동 삭제"
          >
            <span className="aside-trash__icon" aria-hidden>
              🗑️
            </span>
            <span className="aside-trash__text">
              휴지통
              <span className="aside-trash__sub">
                {trashedCount ? `삭제한 카드 ${trashedCount}건 보관 중` : '삭제한 카드 30일 보관'}
              </span>
            </span>
            {trashedCount ? <span className="aside-trash__count">{trashedCount}</span> : null}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
