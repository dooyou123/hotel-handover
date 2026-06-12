'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { fetchLeaveBlockedDates, fetchLeavePolicy, isLeaveSchemaReady } from '@/lib/leave/policy';
import { LEAVE_STATUS_LABELS, type LeaveRequest } from '@/lib/leave/types';
import { useMonthLeaveRequests } from '@/lib/leave/use-leave-requests';
import {
  buildLeaveCalendarCells,
  buildLeaveDayStates,
  countStaffRequestsInMonth,
  daysInMonth,
  formatLeaveAppliedAt,
  formatMonthLabel,
  getTargetMonth,
  isApplicationWindowOpen,
  leaveCalendarWeekdays,
  requestsForDateOrdered,
  resolveLeaveStatus,
} from '@/lib/leave/validation';

type LeaveRequestPanelProps = {
  onToast: (message: string) => void;
};

function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function LeaveRequestPanel({ onToast }: LeaveRequestPanelProps) {
  const now = useMemo(() => new Date(), []);
  const { session, requireSession } = useWorkSession();
  const { data: isManager = false } = useIsManager();
  const staffName = session.name;
  const workGroup = session.group || session.shift;

  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['leave-policy'],
    queryFn: () => fetchLeavePolicy(),
  });
  const { data: blocked = [], isLoading: blockedLoading } = useQuery({
    queryKey: ['leave-blocked-dates'],
    queryFn: () => fetchLeaveBlockedDates(),
  });
  const { data: schemaReady = false, isLoading: schemaLoading } = useQuery({
    queryKey: ['leave-schema-ready'],
    queryFn: () => isLeaveSchemaReady(),
  });

  const targetMonth = policy ? getTargetMonth(now, policy.apply_month_offset) : '';
  const { requests, isLoading: requestsLoading, submitRequest, reviewRequest, cancelRequest } =
    useMonthLeaveRequests(targetMonth);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isException, setIsException] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const windowOpen = policy ? isApplicationWindowOpen(now, policy) : false;
  const dayStates = useMemo(() => {
    if (!policy) return [];
    return buildLeaveDayStates(targetMonth, requests, blocked, policy, staffName || '');
  }, [policy, staffName, targetMonth, requests, blocked]);

  const dayStateByDate = useMemo(() => new Map(dayStates.map((day) => [day.date, day])), [dayStates]);
  const calendarCells = useMemo(() => buildLeaveCalendarCells(targetMonth), [targetMonth]);

  const rosterByDate = useMemo(() => {
    if (!policy) return [];
    return daysInMonth(targetMonth)
      .map((date) => ({
        date,
        ordered: requestsForDateOrdered(requests, date),
        cap: policy.max_staff_per_day,
      }))
      .filter((row) => row.ordered.length > 0);
  }, [targetMonth, requests, policy]);

  const myMonthlyCount = staffName && policy ? countStaffRequestsInMonth(requests, staffName, targetMonth) : 0;
  const pendingReviews = requests.filter((request) => request.status === 'pending_review');

  function toggleDate(date: string) {
    setSelectedDates((prev) => (prev.includes(date) ? prev.filter((item) => item !== date) : [...prev, date]));
  }

  async function handleSubmit() {
    if (!policy || !staffName) {
      onToast('근무 세션(이름)을 먼저 설정해 주세요.');
      return;
    }
    if (!requireSession('휴무 신청')) return;
    if (!windowOpen) {
      onToast('지금은 휴무 신청 기간이 아닙니다.');
      return;
    }
    if (!selectedDates.length) {
      onToast('날짜를 선택해 주세요.');
      return;
    }
    if (isException && !reason.trim()) {
      onToast('특별 사유(해외여행 등)를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      let approved = 0;
      let pending = 0;
      let simulated: LeaveRequest[] = [...requests];
      for (const date of [...selectedDates].sort()) {
        const result = resolveLeaveStatus(date, staffName, isException, simulated, policy, blocked);
        if (!result.ok) {
          onToast(result.error);
          return;
        }
        await submitRequest.mutateAsync({
          staffName,
          workGroup,
          leaveDate: date,
          status: result.status,
          isException,
          reason: reason.trim(),
        });
        simulated = [
          ...simulated.filter(
            (request) => !(request.staff_name === staffName && request.leave_date === date),
          ),
          {
            id: `pending-${date}`,
            hotel_id: '',
            staff_name: staffName,
            work_group: workGroup,
            leave_date: date,
            status: result.status,
            is_exception: isException,
            reason: reason.trim(),
            reviewed_by: null,
            reviewed_at: null,
            created_at: new Date().toISOString(),
          },
        ];
        if (result.status === 'approved') approved += 1;
        else pending += 1;
      }
      setSelectedDates([]);
      setIsException(false);
      setReason('');
      if (pending && !approved) {
        onToast(`${pending}건이 사전 협의 대기로 접수되었습니다.`);
      } else if (pending) {
        onToast(`확정 ${approved}건 · 사전 협의 ${pending}건 접수되었습니다.`);
      } else {
        onToast(`${approved}건 휴무가 확정되었습니다.`);
      }
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : '신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (policyLoading || blockedLoading || schemaLoading) {
    return <p className="empty-state">휴무 규칙을 불러오는 중…</p>;
  }

  if (!policy) {
    return <p className="empty-state">휴무 규칙을 불러오지 못했습니다.</p>;
  }

  return (
    <div className="leave-request">
      {!schemaReady ? (
        <p className="amenity-alert" style={{ margin: 0 }}>
          휴무 신청 DB가 아직 준비되지 않았습니다. Supabase에{' '}
          <code>032_leave_requests.sql</code> 마이그레이션을 적용해 주세요.
        </p>
      ) : null}
      <article className="schedule-panel leave-request__rules">
        <div className="schedule-panel__header">
          <div>
            <h3>{formatMonthLabel(targetMonth)} 휴무 신청</h3>
            <p>
              개인 월 최대 <strong>{policy.max_days_per_month}일</strong> · 날짜별 최대{' '}
              <strong>{policy.max_staff_per_day}명</strong> (신청 시각 선착순)
            </p>
          </div>
          <span className={`leave-request__window${windowOpen ? ' is-open' : ''}`}>
            {windowOpen
              ? `신청 기간 (${policy.application_open_day}일–${policy.application_close_day}일)`
              : '신청 기간 아님'}
          </span>
        </div>
        <ul className="leave-request__policy-list">
          <li>
            같은 날짜는 <strong>먼저 신청한 순</strong>으로 확정됩니다. 정원이 차면 이후 신청은 불가합니다.
          </li>
          <li>해외여행·개인 사정 등은 <strong>특별 사유</strong>로 사전 협의 신청이 가능합니다.</li>
          <li>크리스마스·연말·연시 등 <strong>신청 불가일</strong>은 선택할 수 없습니다.</li>
          {staffName ? (
            <li>
              내 신청: <strong>{myMonthlyCount}</strong> / {policy.max_days_per_month}일
            </li>
          ) : null}
        </ul>
      </article>

      <div className="leave-request__split">
        <article className="schedule-panel leave-request__pick">
          <div className="schedule-panel__header">
            <h3>날짜 선택</h3>
            <p>달력에서 터치해 여러 날을 고를 수 있습니다.</p>
          </div>

          {requestsLoading ? (
            <p className="empty-state">불러오는 중…</p>
          ) : (
            <div className="leave-cal leave-cal--pick">
              <div className="leave-cal__weekdays" aria-hidden>
                {leaveCalendarWeekdays().map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="leave-cal__grid">
                {calendarCells.map((cell) => {
                  if (!cell.date) {
                    return <span key={cell.key} className="leave-cal__day is-empty" aria-hidden />;
                  }
                  const day = dayStateByDate.get(cell.date);
                  if (!day) return null;
                  const selected = selectedDates.includes(day.date);
                  const mine = day.myRequest;
                  const disabled =
                    !windowOpen ||
                    day.blocked ||
                    day.dailyFull ||
                    Boolean(mine && mine.status !== 'cancelled' && mine.status !== 'rejected');
                  let className = 'leave-cal__day';
                  if (day.blocked) className += ' is-blocked';
                  else if (mine?.status === 'approved') className += ' is-mine-approved';
                  else if (mine?.status === 'pending_review') className += ' is-mine-pending';
                  else if (day.dailyFull) className += ' is-full';
                  if (selected) className += ' is-selected';

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={className}
                      disabled={disabled}
                      title={
                        day.blocked
                          ? day.blockedLabel
                          : `${day.dailyCount}/${policy.max_staff_per_day}명 신청`
                      }
                      onClick={() => toggleDate(day.date)}
                    >
                      <span>{cell.day}</span>
                      {day.dailyCount > 0 ? <em className="leave-cal__count">{day.dailyCount}</em> : null}
                    </button>
                  );
                })}
              </div>
              <div className="leave-cal__legend">
                <span className="leave-cal__legend-item is-blocked">신청 불가</span>
                <span className="leave-cal__legend-item is-full">정원 마감</span>
                <span className="leave-cal__legend-item is-mine">내 휴무</span>
              </div>
            </div>
          )}

          <label className="leave-request__exception">
            <input
              type="checkbox"
              checked={isException}
              onChange={(event) => setIsException(event.target.checked)}
            />
            특별 사유 (정원 마감·해외여행 등 사전 협의)
          </label>
          {isException ? (
            <label className="field field--full leave-request__reason">
              <span>사유</span>
              <textarea
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="예: 7/10–7/20 해외 출장"
              />
            </label>
          ) : null}

          <div className="leave-request__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              disabled={submitting || !selectedDates.length || !windowOpen || !schemaReady}
              onClick={() => void handleSubmit()}
            >
              {submitting ? '신청 중…' : `선택 ${selectedDates.length}일 신청`}
            </button>
          </div>
        </article>

        <article className="schedule-panel leave-request__roster">
          <div className="schedule-panel__header">
            <h3>신청 현황 (선착순)</h3>
            <p>날짜별 신청 시각 순서</p>
          </div>

          {requestsLoading ? (
            <p className="empty-state">불러오는 중…</p>
          ) : !rosterByDate.length ? (
            <p className="leave-request__empty">아직 신청한 사람이 없습니다.</p>
          ) : (
            <div className="leave-roster">
              {rosterByDate.map(({ date, ordered, cap }) => (
                <section key={date} className="leave-roster__day">
                  <header className="leave-roster__day-head">
                    <strong>{formatDayLabel(date)}</strong>
                    <span>
                      {ordered.length}/{cap}명
                      {ordered.length >= cap ? ' · 마감' : ''}
                    </span>
                  </header>
                  <ol className="leave-roster__list">
                    {ordered.map((request, index) => (
                      <li
                        key={request.id}
                        className={`leave-roster__item leave-roster__item--${request.status}${
                          request.staff_name === staffName ? ' is-mine' : ''
                        }`}
                      >
                        <span className="leave-roster__rank">{index + 1}</span>
                        <span className="leave-roster__name">{request.staff_name}</span>
                        <time className="leave-roster__time">{formatLeaveAppliedAt(request.created_at)}</time>
                        <span className="leave-roster__status">{LEAVE_STATUS_LABELS[request.status]}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </article>
      </div>

      {staffName ? (
        <article className="schedule-panel">
          <div className="schedule-panel__header">
            <h3>내 휴무</h3>
          </div>
          <ul className="leave-request__list">
            {requests
              .filter((request) => request.staff_name === staffName && request.status !== 'cancelled')
              .map((request) => (
                <li key={request.id} className={`leave-request__item leave-request__item--${request.status}`}>
                  <div>
                    <strong>{formatDayLabel(request.leave_date)}</strong>
                    <span>{LEAVE_STATUS_LABELS[request.status]}</span>
                    <time className="leave-roster__time">{formatLeaveAppliedAt(request.created_at)} 신청</time>
                    {request.reason ? <p>{request.reason}</p> : null}
                  </div>
                  {request.status === 'approved' || request.status === 'pending_review' ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={async () => {
                        if (!requireSession('휴무 취소')) return;
                        await cancelRequest.mutateAsync(request.id);
                        onToast('휴무 신청을 취소했습니다.');
                      }}
                    >
                      취소
                    </button>
                  ) : null}
                </li>
              ))}
            {!requests.some((request) => request.staff_name === staffName && request.status !== 'cancelled') ? (
              <li className="leave-request__empty">신청한 휴무가 없습니다.</li>
            ) : null}
          </ul>
        </article>
      ) : null}

      {isManager && pendingReviews.length ? (
        <article className="schedule-panel leave-request__review">
          <div className="schedule-panel__header">
            <h3>사전 협의 대기</h3>
            <p>{pendingReviews.length}건</p>
          </div>
          <ul className="leave-request__list">
            {pendingReviews.map((request) => (
              <li key={request.id} className="leave-request__item leave-request__item--pending_review">
                <div>
                  <strong>
                    {request.staff_name} · {formatDayLabel(request.leave_date)}
                  </strong>
                  <time className="leave-roster__time">{formatLeaveAppliedAt(request.created_at)} 신청</time>
                  {request.is_exception ? <span className="leave-request__tag">특별 사유</span> : null}
                  {request.reason ? <p>{request.reason}</p> : null}
                </div>
                <div className="leave-request__review-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={async () => {
                      if (!requireSession('휴무 승인')) return;
                      await reviewRequest.mutateAsync({
                        id: request.id,
                        status: 'approved',
                        reviewedBy: staffName || '관리자',
                      });
                      onToast('휴무를 승인했습니다.');
                    }}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={async () => {
                      if (!requireSession('휴무 반려')) return;
                      await reviewRequest.mutateAsync({
                        id: request.id,
                        status: 'rejected',
                        reviewedBy: staffName || '관리자',
                      });
                      onToast('휴무를 반려했습니다.');
                    }}
                  >
                    반려
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
