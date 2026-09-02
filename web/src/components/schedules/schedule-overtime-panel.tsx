'use client';

import { useMemo, useState } from 'react';
import {
  APPROVAL_STATUS_LABELS,
  type ApprovalStatus,
  type ScheduleOvertimeRecord,
} from '@/lib/schedules/work-records-types';
import { useScheduleOvertimeRecords } from '@/lib/schedules/use-schedule-work-records';

type ScheduleOvertimePanelProps = {
  monthKey: string;
  monthLabel: string;
  staffNames: string[];
  authorLabel: string;
  requireSession: (action: string) => boolean;
};

function defaultWorkDate(monthKey: string): string {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (monthKey === current) return now.toISOString().slice(0, 10);
  return `${monthKey}-01`;
}

function formatWorkDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function approvalTone(status: ApprovalStatus): string {
  if (status === 'approved') return 'is-approved';
  if (status === 'rejected') return 'is-rejected';
  if (status === 'pending') return 'is-pending';
  return 'is-none';
}

export function ScheduleOvertimePanel({
  monthKey,
  monthLabel,
  staffNames,
  authorLabel,
  requireSession,
}: ScheduleOvertimePanelProps) {
  const { listQuery, addRecord, editRecord, removeRecord } = useScheduleOvertimeRecords(monthKey);
  const records = listQuery.data ?? [];
  const [staffName, setStaffName] = useState('');
  const [workDate, setWorkDate] = useState(() => defaultWorkDate(monthKey));
  const [hours, setHours] = useState(1);
  const [reason, setReason] = useState('');
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalHours = useMemo(
    () => records.reduce((sum, row) => sum + row.hours, 0),
    [records],
  );

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function resetForm() {
    setStaffName('');
    setWorkDate(defaultWorkDate(monthKey));
    setHours(1);
    setReason('');
    setApprovalSubmitted(false);
    setApprovalStatus('none');
    setEditingId(null);
    setError(null);
  }

  function startEdit(record: ScheduleOvertimeRecord) {
    setEditingId(record.id);
    setStaffName(record.staff_name);
    setWorkDate(record.work_date);
    setHours(record.hours);
    setReason(record.reason);
    setApprovalSubmitted(record.approval_submitted);
    setApprovalStatus(record.approval_status);
    setError(null);
  }

  async function submit() {
    if (!requireSession('연장 근무 기록')) return;
    setError(null);
    try {
      const approval: ApprovalStatus = approvalSubmitted
        ? approvalStatus === 'none'
          ? 'pending'
          : approvalStatus
        : 'none';
      const payload = {
        staff_name: staffName,
        work_date: workDate,
        hours,
        reason,
        approval_submitted: approvalSubmitted,
        approval_status: approval,
      };
      if (editingId) {
        await editRecord.mutateAsync({ id: editingId, data: payload });
        showMessage('수정했습니다.');
      } else {
        await addRecord.mutateAsync({ data: payload, recordedBy: authorLabel });
        showMessage('등록했습니다.');
      }
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    }
  }

  async function remove(id: string) {
    if (!requireSession('연장 근무 삭제')) return;
    if (!window.confirm('이 연장 근무 기록을 삭제할까요?')) return;
    try {
      await removeRecord.mutateAsync(id);
      if (editingId === id) resetForm();
      showMessage('삭제했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  const busy = addRecord.isPending || editRecord.isPending || removeRecord.isPending;

  return (
    <section className="sched-work-records sched-work-records--overtime">
      <header className="sched-work-records__head">
        <h2>{monthLabel} 연장 근무</h2>
        <p className="sched-work-records__summary">
          {records.length}건 · 합계 <strong>{totalHours}</strong>시간
        </p>
      </header>

      <form
        className="sched-work-records__form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="field">
          <span>직원명</span>
          <select value={staffName} onChange={(e) => setStaffName(e.target.value)} required>
            <option value="">선택</option>
            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="sched-work-records__row">
          <label className="field">
            <span>날짜</span>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>연장 시간</span>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}시간
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>연장 사유 *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 체크아웃 러시, VIP 대응"
            rows={2}
            required
          />
        </label>

        <div className="sched-work-records__approval">
          <label className="sched-work-records__check">
            <input
              type="checkbox"
              checked={approvalSubmitted}
              onChange={(e) => {
                const checked = e.target.checked;
                setApprovalSubmitted(checked);
                setApprovalStatus(checked ? 'pending' : 'none');
              }}
            />
            전자결재 상신함
          </label>
          {approvalSubmitted ? (
            <label className="field">
              <span>승인 상태</span>
              <select
                value={approvalStatus === 'none' ? 'pending' : approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
              >
                <option value="pending">상신중</option>
                <option value="approved">승인</option>
                <option value="rejected">반려</option>
              </select>
            </label>
          ) : null}
        </div>

        {error ? <p className="sched-work-records__error">{error}</p> : null}
        {message ? <p className="sched-work-records__ok">{message}</p> : null}

        <div className="sched-work-records__actions">
          <button type="submit" className="btn btn--primary btn--small" disabled={busy}>
            {editingId ? '수정 저장' : '추가'}
          </button>
          {editingId ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={resetForm}>
              취소
            </button>
          ) : null}
        </div>
      </form>

      {listQuery.isLoading ? <p className="schedules-page__side-empty">불러오는 중…</p> : null}
      {!listQuery.isLoading && !records.length ? (
        <p className="schedules-page__side-empty">이번 달 연장 근무 기록이 없습니다.</p>
      ) : null}

      <ul className="sched-work-records__list">
        {records.map((record) => (
          <li key={record.id} className="sched-work-records__item">
            <div className="sched-work-records__item-head">
              <strong>{record.staff_name}</strong>
              <span>{formatWorkDate(record.work_date)}</span>
            </div>
            <p className="sched-work-records__item-main">
              <span>{record.hours}시간</span>
              <span className={`sched-work-records__approval-badge ${approvalTone(record.approval_status)}`}>
                {record.approval_submitted
                  ? APPROVAL_STATUS_LABELS[record.approval_status]
                  : '미상신'}
              </span>
            </p>
            <p className="sched-work-records__reason">{record.reason}</p>
            <div className="sched-work-records__item-actions">
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => startEdit(record)}>
                수정
              </button>
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => void remove(record.id)}>
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
