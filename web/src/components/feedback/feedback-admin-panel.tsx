'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_STATUS_LABELS } from '@/lib/constants';
import {
  countOpenFeedback,
  fetchFeedbackList,
  isFeedbackDone,
  sortFeedbackForAdmin,
  subscribeFeedbackChanges,
  updateFeedback,
  type FeedbackStatus,
  type UserFeedback,
} from '@/lib/feedback/api';

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능 개선',
  other: '기타',
};

type FeedbackFilter = 'open' | 'done' | 'all';

const FILTER_OPTIONS: { id: FeedbackFilter; label: string }[] = [
  { id: 'open', label: '미처리' },
  { id: 'done', label: '완료' },
  { id: 'all', label: '전체' },
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FeedbackRow({
  item,
  onUpdated,
}: {
  item: UserFeedback;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [adminNotes, setAdminNotes] = useState(item.admin_notes);
  const [saving, setSaving] = useState(false);
  const done = isFeedbackDone(item.status);

  useEffect(() => {
    setStatus(item.status);
    setAdminNotes(item.admin_notes);
  }, [item]);

  async function saveStatus(next: FeedbackStatus, notes = adminNotes) {
    setSaving(true);
    try {
      await updateFeedback({ id: item.id, status: next, adminNotes: notes });
      onUpdated();
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await saveStatus(status);
  }

  async function handleQuickStatus(event: React.MouseEvent, next: FeedbackStatus) {
    event.stopPropagation();
    if (saving) return;
    setStatus(next);
    await saveStatus(next);
  }

  const reporter =
    [item.reporter_shift, item.reporter_group ? `${item.reporter_group}조` : '', item.reporter_name]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <article className={`feedback-row feedback-row--${item.status}${done ? ' feedback-row--done' : ''}`}>
      <button type="button" className="feedback-row__head" onClick={() => setExpanded((v) => !v)}>
        <div className="feedback-row__main">
          {done ? <span className="feedback-row__done-mark" aria-hidden>✓</span> : null}
          <span className={`feedback-row__badge feedback-row__badge--${item.category}`}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
          <span className={`feedback-row__status feedback-row__status--${item.status}`}>
            {FEEDBACK_STATUS_LABELS[item.status] ?? item.status}
          </span>
          <strong className="feedback-row__subject">{item.subject}</strong>
        </div>
        <span className="feedback-row__meta">
          {reporter} · {formatDateTime(item.created_at)}
          {done && item.updated_at !== item.created_at
            ? ` · 처리 ${formatDateTime(item.updated_at)}`
            : ''}
        </span>
      </button>

      {!done ? (
        <div className="feedback-row__quick" role="toolbar" aria-label="빠른 처리">
          {item.status === 'open' ? (
            <button
              type="button"
              className="feedback-row__quick-btn"
              disabled={saving}
              onClick={(event) => void handleQuickStatus(event, 'in_progress')}
            >
              처리 중
            </button>
          ) : null}
          <button
            type="button"
            className="feedback-row__quick-btn feedback-row__quick-btn--resolve"
            disabled={saving}
            onClick={(event) => void handleQuickStatus(event, 'resolved')}
          >
            해결
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div className="feedback-row__body">
          <p className="feedback-row__path">페이지: {item.page_path || '/'}</p>
          <p className="feedback-row__text">{item.body}</p>
          <div className="feedback-row__admin">
            <label className="field">
              <span>처리 상태</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
                {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>관리자 메모</span>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="처리 내용, 답변 등"
              />
            </label>
            <button type="button" className="btn btn--primary btn--small" disabled={saving} onClick={() => void handleSave()}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function FeedbackAdminPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FeedbackFilter>('open');
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['user-feedback'],
    queryFn: fetchFeedbackList,
  });

  useEffect(() => {
    const unsubscribe = subscribeFeedbackChanges(() => {
      queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const openCount = countOpenFeedback(data);
  const doneCount = data.filter((item) => isFeedbackDone(item.status)).length;

  const visible = useMemo(() => {
    const sorted = sortFeedbackForAdmin(data);
    if (filter === 'open') {
      return sorted.filter((item) => item.status === 'open' || item.status === 'in_progress');
    }
    if (filter === 'done') {
      return sorted.filter((item) => isFeedbackDone(item.status));
    }
    return sorted;
  }, [data, filter]);

  return (
    <article className="schedule-panel schedule-panel--full feedback-admin-panel">
      <div className="schedule-panel__header schedule-panel__header--split">
        <div>
          <h3>개선 · 버그 신고</h3>
          <p>
            직원이 보낸 요청입니다.
            {openCount > 0 ? (
              <>
                {' '}
                <strong className="feedback-open-count">미처리 {openCount}건</strong>
              </>
            ) : (
              ' 현재 미처리 건이 없습니다.'
            )}
            {doneCount > 0 ? (
              <span className="feedback-done-count"> · 완료 {doneCount}건</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="feedback-admin-panel__filters" role="tablist" aria-label="신고 목록 필터">
        {FILTER_OPTIONS.map((option) => {
          const count =
            option.id === 'open'
              ? openCount
              : option.id === 'done'
                ? doneCount
                : data.length;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={filter === option.id}
              className={`feedback-admin-panel__filter${filter === option.id ? ' is-active' : ''}${
                option.id === 'open' && openCount > 0 ? ' feedback-admin-panel__filter--alert' : ''
              }`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              {count > 0 ? ` ${count}` : ''}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : !visible.length ? (
        <p className="empty-state">
          {filter === 'open'
            ? '미처리 신고가 없습니다.'
            : filter === 'done'
              ? '완료된 신고가 없습니다.'
              : '아직 접수된 신고가 없습니다.'}
        </p>
      ) : (
        <div className="feedback-list">
          {visible.map((item) => (
            <FeedbackRow key={item.id} item={item} onUpdated={() => void refetch()} />
          ))}
        </div>
      )}
    </article>
  );
}
