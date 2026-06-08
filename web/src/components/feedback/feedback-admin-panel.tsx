'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_STATUS_LABELS } from '@/lib/constants';
import {
  countOpenFeedback,
  fetchFeedbackList,
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

  useEffect(() => {
    setStatus(item.status);
    setAdminNotes(item.admin_notes);
  }, [item]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFeedback({ id: item.id, status, adminNotes });
      onUpdated();
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  const reporter =
    [item.reporter_shift, item.reporter_group ? `${item.reporter_group}조` : '', item.reporter_name]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <article className={`feedback-row feedback-row--${item.status}`}>
      <button type="button" className="feedback-row__head" onClick={() => setExpanded((v) => !v)}>
        <div className="feedback-row__main">
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
        </span>
      </button>

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

  return (
    <article className="schedule-panel schedule-panel--full">
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
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : !data.length ? (
        <p className="empty-state">아직 접수된 신고가 없습니다.</p>
      ) : (
        <div className="feedback-list">
          {data.map((item) => (
            <FeedbackRow key={item.id} item={item} onUpdated={() => void refetch()} />
          ))}
        </div>
      )}
    </article>
  );
}
