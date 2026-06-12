'use client';

import { useMemo, useState } from 'react';
import { ERROR_LABELS } from '@/lib/rate-confirm/compare-engine';
import {
  RESOLUTION_ACTION_LABELS,
  RESOLUTION_STATUS_LABELS,
  type RateConfirmItem,
  type RateConfirmResolutionAction,
} from '@/lib/rate-confirm/history-types';
import { sessionProgressLabel } from '@/lib/rate-confirm/session-payload';
import {
  useRateConfirmSessionDetail,
  useRateConfirmSessions,
} from '@/lib/rate-confirm/use-rate-confirm-history';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { RateConfirmResolutionForm } from './rate-confirm-resolution-form';
import { ReconcileErrorsTable } from './rate-confirm-table';

function formatSessionWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type RateConfirmHistoryPanelProps = {
  activeSessionId?: string | null;
  onOpenSession?: (sessionId: string) => void;
};

export function RateConfirmHistoryPanel({
  activeSessionId = null,
  onOpenSession,
}: RateConfirmHistoryPanelProps) {
  const { session, authorLabel, requireSession } = useWorkSession();
  const { listQuery } = useRateConfirmSessions();
  const [selectedId, setSelectedId] = useState<string | null>(activeSessionId);
  const viewId = selectedId ?? activeSessionId;
  const { detailQuery, saveResolution } = useRateConfirmSessionDetail(viewId);

  const itemsByOta = useMemo(() => {
    const map = new Map<string, RateConfirmItem>();
    for (const item of detailQuery.data?.items ?? []) {
      map.set(item.ota, item);
    }
    return map;
  }, [detailQuery.data?.items]);

  const errorRecords = useMemo(
    () => (detailQuery.data?.items ?? []).map((item) => item.record_snapshot),
    [detailQuery.data?.items],
  );

  function selectSession(id: string) {
    setSelectedId(id);
    onOpenSession?.(id);
  }

  if (listQuery.isLoading) {
    return <p className="rc-status rc-status--loading">이력을 불러오는 중…</p>;
  }

  if (listQuery.error) {
    return (
      <p className="rc-status rc-status--error">
        이력을 불러오지 못했습니다. DB 마이그레이션(042)을 적용했는지 확인해 주세요.
      </p>
    );
  }

  const sessions = listQuery.data ?? [];

  return (
    <div className="rc-history">
      <div className="rc-history__list">
        <h3 className="rc-section__title">저장된 대조 ({sessions.length})</h3>
        {!sessions.length ? (
          <p className="rc-empty">저장된 대조 이력이 없습니다. 새 대조 후 「기록 저장」을 사용하세요.</p>
        ) : (
          <ul className="rc-history__sessions">
            {sessions.map((row) => {
              const summary = row.summary;
              const isActive = viewId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`rc-history__session${isActive ? ' is-active' : ''}`}
                    onClick={() => selectSession(row.id)}
                  >
                    <span className="rc-history__session-when">{formatSessionWhen(row.created_at)}</span>
                    <span className="rc-history__session-meta">
                      {row.author || '담당 미기록'}
                      {row.work_group ? ` · ${row.work_group}조` : ''}
                    </span>
                    <span className="rc-history__session-files">
                      TL {row.tl_file_name || '—'} · PMS {row.pms_file_name || '—'}
                    </span>
                    <span className="rc-history__session-stats">
                      불일치 {summary.errorCount ?? 0}
                      {summary.matchCount != null ? ` · 일치 ${summary.matchCount}` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {viewId && detailQuery.data ? (
        <div className="rc-history__detail">
          <header className="rc-history__detail-head">
            <div>
              <h3>{formatSessionWhen(detailQuery.data.created_at)} 대조</h3>
              <p className="rc-history__detail-meta">
                {detailQuery.data.author}
                {detailQuery.data.work_group ? ` · ${detailQuery.data.work_group}조` : ''}
                {' · '}
                TL {detailQuery.data.tl_file_name} / PMS {detailQuery.data.pms_file_name}
              </p>
              {detailQuery.data.notes ? (
                <p className="rc-history__detail-notes">메모: {detailQuery.data.notes}</p>
              ) : null}
            </div>
            <span className="rc-history__progress">{sessionProgressLabel(detailQuery.data.items)}</span>
          </header>

          {detailQuery.data.items.length ? (
            <section className="rc-section">
              <h4 className="rc-section__title">불일치 처리 기록</h4>
              <ReconcileErrorsTable
                records={errorRecords}
                itemsByOta={itemsByOta}
                renderResolution={(item) => (
                  <RateConfirmResolutionForm
                    item={item}
                    disabled={!session.name}
                    onSave={async (input) => {
                      if (!requireSession('처리 기록')) return;
                      await saveResolution.mutateAsync({
                        itemId: item.id,
                        sessionId: detailQuery.data!.id,
                        input,
                        author: authorLabel,
                        workGroup: session.group,
                      });
                    }}
                  />
                )}
              />
            </section>
          ) : (
            <p className="rc-banner rc-banner--ok">이 대조에서는 불일치가 없었습니다.</p>
          )}

          <section className="rc-section">
            <h4 className="rc-section__title">처리 요약</h4>
            <ul className="rc-history__summary-list">
              {detailQuery.data.items.map((item) => (
                <li key={item.id} className={`rc-history__summary-item is-${item.resolution_status}`}>
                  <span className="rc-history__summary-ota">{item.ota}</span>
                  <span className="rc-history__summary-guest">{item.guest_name}</span>
                  <span className="rc-history__summary-errors">
                    {item.error_codes.map((code) => ERROR_LABELS[code]).join(', ')}
                  </span>
                  <span className="rc-history__summary-status">
                    {RESOLUTION_STATUS_LABELS[item.resolution_status]}
                  </span>
                  {item.resolution_action ? (
                    <span className="rc-history__summary-action">
                      {item.resolution_action in RESOLUTION_ACTION_LABELS
                        ? RESOLUTION_ACTION_LABELS[item.resolution_action as RateConfirmResolutionAction]
                        : item.resolution_action}
                    </span>
                  ) : null}
                  {item.resolution_note ? (
                    <span className="rc-history__summary-note">{item.resolution_note}</span>
                  ) : null}
                  {item.resolved_by ? (
                    <span className="rc-history__summary-by">
                      {item.resolved_by}
                      {item.resolved_at ? ` · ${formatSessionWhen(item.resolved_at)}` : ''}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : viewId ? (
        <p className="rc-status rc-status--loading">상세 불러오는 중…</p>
      ) : (
        <p className="rc-empty">왼쪽에서 대조 이력을 선택하세요.</p>
      )}
    </div>
  );
}
