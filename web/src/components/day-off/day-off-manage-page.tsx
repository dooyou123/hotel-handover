'use client';

import { useEffect, useMemo, useState } from 'react';
import { getKoreanHoliday } from '@/lib/calendar/korean-holidays';
import { useIsManager } from '@/lib/handover/use-cards';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDayOffAdmin } from '@/lib/day-off/use-day-off';
import {
  DAY_OFF_STATUS_LABELS,
  DEFAULT_DAY_OFF_NOTES,
  nextMonthKey,
  normalizeRequestKind,
  type DayOffRequest,
} from '@/lib/day-off/types';
import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarDateLabel,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

function weekdayClass(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 0) return 'is-sun';
  if (day === 6) return 'is-sat';
  return '';
}

export function DayOffManagePage() {
  const { data: isManager = false } = useIsManager();
  const { confirm, alert } = useConfirmDialog();
  const [monthKey, setMonthKey] = useState(nextMonthKey);
  const { query, setPassword, saveWindow, setBlockedDates, review } = useDayOffAdmin(monthKey);

  const [accessPin, setAccessPin] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [maxDays, setMaxDays] = useState(4);
  const [maxPeople, setMaxPeople] = useState(2);
  const [published, setPublished] = useState(false);
  const [notes, setNotes] = useState(DEFAULT_DAY_OFF_NOTES);
  const [blockedDraft, setBlockedDraft] = useState<Map<string, string>>(new Map());
  const [blockLabel, setBlockLabel] = useState('신청 불가');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState<Record<string, string>>({});

  const data = query.data;
  const syncKey = `${monthKey}|${data?.window?.updated_at ?? 'none'}|${data?.blockedDates?.map((d) => d.date).join(',') ?? ''}`;

  useEffect(() => {
    if (!data) return;
    if (data.window) {
      setOpensAt(toLocalInputValue(data.window.opens_at));
      setClosesAt(toLocalInputValue(data.window.closes_at));
      setMaxDays(data.window.max_days_per_person);
      setMaxPeople(data.window.max_people_per_day);
      setPublished(data.window.published);
      setNotes(data.window.notes?.trim() ? data.window.notes : DEFAULT_DAY_OFF_NOTES);
    } else {
      const now = new Date();
      const open = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
      const close = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 18, 0);
      setOpensAt(toLocalInputValue(open.toISOString()));
      setClosesAt(toLocalInputValue(close.toISOString()));
      setMaxDays(4);
      setMaxPeople(2);
      setPublished(false);
      setNotes(DEFAULT_DAY_OFF_NOTES);
    }
    const map = new Map<string, string>();
    for (const row of data.blockedDates) {
      map.set(row.date, row.label || '신청 불가');
    }
    setBlockedDraft(map);
    // month / server updated_at / blocked set 변경 시에만 폼 동기화 (입력 중 덮어쓰기 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.dayCounts ?? []) map.set(row.date, row.count);
    return map;
  }, [data?.dayCounts]);

  const cells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);
  const pending = useMemo(
    () =>
      (data?.requests ?? []).filter(
        (r) => r.status === 'pending' && normalizeRequestKind(r.kind) === 'off',
      ),
    [data?.requests],
  );

  const guestLink =
    typeof globalThis.window !== 'undefined'
      ? `${globalThis.window.location.origin}/day-off`
      : '/day-off';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guestLink);
      setMessage('공유 링크를 복사했습니다.');
    } catch {
      setError('링크 복사에 실패했습니다.');
    }
  }

  async function handleSetPassword(clear = false) {
    setError(null);
    setMessage(null);
    try {
      if (clear) {
        const ok = await confirm({
          title: '공유 비밀번호 해제',
          message: '입장 비밀번호를 해제할까요? 직원 링크 입장이 막힙니다.',
          tone: 'danger',
        });
        if (!ok) return;
        await setPassword.mutateAsync({ clear: true });
        setMessage('공유 비밀번호를 해제했습니다.');
        return;
      }
      if (accessPin.trim().length < 4) {
        setError('비밀번호는 4자 이상이어야 합니다.');
        return;
      }
      await setPassword.mutateAsync({ pin: accessPin });
      setAccessPin('');
      setMessage('공유 비밀번호를 저장했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '비밀번호 저장 실패');
    }
  }

  async function handleSaveWindow() {
    setError(null);
    setMessage(null);
    try {
      await saveWindow.mutateAsync({
        month_key: monthKey,
        opens_at: fromLocalInputValue(opensAt),
        closes_at: fromLocalInputValue(closesAt),
        max_days_per_person: maxDays,
        max_people_per_day: maxPeople,
        published,
        notes,
      });
      setMessage('신청 기간·규칙을 저장했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장 실패');
    }
  }

  async function handleSaveBlocked() {
    setError(null);
    setMessage(null);
    try {
      await setBlockedDates.mutateAsync({
        month_key: monthKey,
        dates: [...blockedDraft.entries()].map(([date, label]) => ({ date, label })),
      });
      setMessage('차단일을 저장했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '차단일 저장 실패');
    }
  }

  function toggleBlocked(date: string) {
    setBlockedDraft((prev) => {
      const next = new Map(prev);
      if (next.has(date)) next.delete(date);
      else next.set(date, blockLabel.trim() || '신청 불가');
      return next;
    });
  }

  async function handleReview(row: DayOffRequest, decision: 'approve' | 'reject') {
    setError(null);
    try {
      const ok = await confirm({
        title: decision === 'approve' ? '예외 신청 승인' : '예외 신청 반려',
        message: `${row.employee_name} · ${formatCalendarDateLabel(row.date)}`,
        detail: row.reason || undefined,
        tone: decision === 'reject' ? 'danger' : 'default',
      });
      if (!ok) return;
      await review.mutateAsync({
        request_id: row.id,
        decision,
        memo: memoDraft[row.id] || '',
      });
      setMessage(decision === 'approve' ? '승인했습니다.' : '반려했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '처리 실패');
    }
  }

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx');
      const rows = (data?.requests ?? []).map((r) => ({
        날짜: r.date,
        이름: r.employee_name,
        구분: normalizeRequestKind(r.kind) === 'shift' ? `조가능(${r.shift_group ?? ''}조)` : '휴무',
        상태: DAY_OFF_STATUS_LABELS[r.status],
        예외: r.is_exception ? 'Y' : 'N',
        사유: r.reason,
        관리자메모: r.admin_memo,
        신청시각: r.created_at,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '신청');
      XLSX.writeFile(wb, `day-off-${monthKey}.xlsx`);
    } catch (caught) {
      await alert(caught instanceof Error ? caught.message : '엑셀 내보내기 실패');
    }
  }

  if (!isManager) {
    return (
      <div className="dayoff-manage">
        <h1>휴무 신청 관리</h1>
        <p className="dayoff-error">관리자만 이 페이지를 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="dayoff-manage">
      <header className="dayoff-manage__head">
        <div>
          <p className="dayoff-shell__eyebrow">Manager</p>
          <h1>휴무 신청 관리</h1>
          <p>신청 기간·정원·차단일을 설정하고, 예외 신청을 승인·반려합니다.</p>
        </div>
        <div className="dayoff-manage__head-actions">
          <button type="button" className="btn btn--outline" onClick={() => void copyLink()}>
            공유 링크 복사
          </button>
          <button type="button" className="btn btn--outline" onClick={() => void exportExcel()}>
            Excel
          </button>
          <a className="btn btn--ghost" href={guestLink} target="_blank" rel="noreferrer">
            직원 화면 열기
          </a>
        </div>
      </header>

      <section className="panel dayoff-manage__month">
        <button
          type="button"
          className="btn btn--outline btn--small"
          onClick={() => setMonthKey(shiftCalendarMonth(monthKey, -1))}
        >
          이전
        </button>
        <strong>{formatCalendarMonthLabel(monthKey)}</strong>
        <button
          type="button"
          className="btn btn--outline btn--small"
          onClick={() => setMonthKey(shiftCalendarMonth(monthKey, 1))}
        >
          다음
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => setMonthKey(nextMonthKey())}>
          다음 달
        </button>
      </section>

      <section className="panel dayoff-manage__card">
        <h2>공유 입장 비밀번호</h2>
        <p className="dayoff-muted">
          {data?.passwordConfigured
            ? `설정됨${data.passwordUpdatedAt ? ` · ${new Date(data.passwordUpdatedAt).toLocaleString('ko-KR')}` : ''}`
            : '아직 설정되지 않았습니다.'}
        </p>
        <div className="dayoff-manage__row">
          <label className="field">
            <span>새 비밀번호</span>
            <input
              type="password"
              value={accessPin}
              onChange={(e) => setAccessPin(e.target.value)}
              minLength={4}
              maxLength={64}
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            className="btn btn--primary"
            disabled={setPassword.isPending}
            onClick={() => void handleSetPassword(false)}
          >
            저장
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={setPassword.isPending || !data?.passwordConfigured}
            onClick={() => void handleSetPassword(true)}
          >
            해제
          </button>
        </div>
      </section>

      <section className="panel dayoff-manage__card">
        <h2>신청 기간 · 규칙</h2>
        <div className="dayoff-manage__grid">
          <label className="field">
            <span>시작</span>
            <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </label>
          <label className="field">
            <span>종료</span>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </label>
          <label className="field">
            <span>개인당 상한(일)</span>
            <input
              type="number"
              min={1}
              max={31}
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>하루 정원(명)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={maxPeople}
              onChange={(e) => setMaxPeople(Number(e.target.value))}
            />
          </label>
          <label className="field dayoff-manage__notes">
            <span>안내 문구 (직원 화면에 표시)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder={DEFAULT_DAY_OFF_NOTES}
            />
            <button
              type="button"
              className="dayoff-link"
              onClick={() => setNotes(DEFAULT_DAY_OFF_NOTES)}
            >
              기본 문구로 채우기
            </button>
          </label>
          <label className="dayoff-check">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>직원 링크에 공개</span>
          </label>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={saveWindow.isPending}
          onClick={() => void handleSaveWindow()}
        >
          규칙 저장
        </button>
      </section>

      <section className="panel dayoff-manage__card">
        <h2>차단일 (크리스마스 등)</h2>
        <p className="dayoff-muted">달력에서 날짜를 눌러 차단/해제를 토글한 뒤 저장하세요.</p>
        <label className="field">
          <span>차단 라벨</span>
          <input value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} />
        </label>
        <div className="dayoff-cal">
          <div className="dayoff-cal__weekdays" aria-hidden>
            {CALENDAR_WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="dayoff-cal__grid">
            {cells.map((cell) => {
              if (!cell.date || cell.day == null) {
                return <div key={cell.key} className="dayoff-cal__day is-empty" />;
              }
              const date = cell.date;
              const holiday = getKoreanHoliday(date);
              const blocked = blockedDraft.has(date);
              const count = countMap.get(date) ?? 0;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={[
                    'dayoff-cal__day',
                    weekdayClass(date),
                    holiday ? 'is-holiday' : '',
                    blocked ? 'is-blocked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => toggleBlocked(date)}
                >
                  <span className="dayoff-cal__num">{cell.day}</span>
                  {blocked ? (
                    <span className="dayoff-cal__mark is-block">불가</span>
                  ) : holiday ? (
                    <span className="dayoff-cal__mark is-holiday">{holiday.slice(0, 2)}</span>
                  ) : null}
                  <span className="dayoff-cal__count">
                    {count}/{maxPeople}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={setBlockedDates.isPending}
          onClick={() => void handleSaveBlocked()}
        >
          차단일 저장
        </button>
      </section>

      <section className="panel dayoff-manage__card">
        <h2>예외 신청 대기 ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="dayoff-muted">대기 중인 예외 신청이 없습니다.</p>
        ) : (
          <ul className="dayoff-review-list">
            {pending.map((row) => (
              <li key={row.id} className="dayoff-review-list__item">
                <div>
                  <strong>
                    {row.employee_name} · {formatCalendarDateLabel(row.date)}
                  </strong>
                  <p>{row.reason || '(사유 없음)'}</p>
                  <label className="field">
                    <span>관리자 메모</span>
                    <input
                      value={memoDraft[row.id] ?? ''}
                      onChange={(e) => setMemoDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="dayoff-review-list__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    disabled={review.isPending}
                    onClick={() => void handleReview(row, 'approve')}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    disabled={review.isPending}
                    onClick={() => void handleReview(row, 'reject')}
                  >
                    반려
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel dayoff-manage__card">
        <h2>전체 신청 ({data?.requests.length ?? 0})</h2>
        {query.isLoading ? <p className="dayoff-status">불러오는 중…</p> : null}
        <div className="dayoff-table-wrap">
          <table className="dayoff-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>이름</th>
                <th>구분</th>
                <th>상태</th>
                <th>예외</th>
                <th>사유</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {(data?.requests ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.employee_name}</td>
                  <td>
                    {normalizeRequestKind(row.kind) === 'shift'
                      ? `${row.shift_group ?? ''}조만`
                      : '휴무'}
                  </td>
                  <td>{DAY_OFF_STATUS_LABELS[row.status]}</td>
                  <td>{row.is_exception ? 'Y' : ''}</td>
                  <td>{row.reason}</td>
                  <td>{row.admin_memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? <p className="dayoff-status">{message}</p> : null}
      {error ? <p className="dayoff-error">{error}</p> : null}
      {query.error ? (
        <p className="dayoff-error">
          {query.error instanceof Error ? query.error.message : '불러오기 실패'}
        </p>
      ) : null}
    </div>
  );
}
