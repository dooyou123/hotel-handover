'use client';

import { useMemo, useState } from 'react';
import { getKoreanHoliday } from '@/lib/calendar/korean-holidays';
import {
  requestsToSelection,
  selectionFingerprint,
} from '@/lib/day-off/rules';
import { useDayOffRequests, useDayOffWindow } from '@/lib/day-off/use-day-off';
import {
  DAY_OFF_MAX_SHIFT_DAYS,
  DAY_OFF_SHIFT_GROUPS,
  DAY_OFF_STATUS_LABELS,
  nextMonthKey,
  normalizeRequestKind,
  type DayOffKind,
  type DayOffRequest,
  type DayOffShiftGroup,
} from '@/lib/day-off/types';
import {
  buildCalendarCells,
  CALENDAR_WEEKDAYS,
  formatCalendarDateLabel,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from '@/lib/work/calendar-month';

function weekdayClass(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 0) return 'is-sun';
  if (day === 6) return 'is-sat';
  return '';
}

function shortStatus(status: string): string {
  if (status === 'confirmed') return '확정';
  if (status === 'pending') return '대기';
  if (status === 'approved') return '승인';
  if (status === 'rejected') return '반려';
  return status;
}

type SelectedItem = {
  date: string;
  kind: DayOffKind;
  shift_group: DayOffShiftGroup | null;
  reason: string;
};

type PickMode = 'off' | 'shift';

export function DayOffPicker() {
  const [monthKey, setMonthKey] = useState(nextMonthKey);
  const windowQuery = useDayOffWindow(monthKey, true);
  const { status, unlock, save, clear } = useDayOffRequests(monthKey);

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [legacyNoPin, setLegacyNoPin] = useState(false);
  const [myRequests, setMyRequests] = useState<DayOffRequest[]>([]);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [pickMode, setPickMode] = useState<PickMode>('off');
  const [reasonDate, setReasonDate] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');
  const [shiftDate, setShiftDate] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = windowQuery.data;
  const window = payload?.window ?? null;
  const maxPeople = window?.max_people_per_day ?? 0;
  const maxDays = window?.max_days_per_person ?? 0;
  const open = Boolean(payload?.open);

  const blockedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of payload?.blockedDates ?? []) {
      map.set(row.date, row.label || '신청 불가');
    }
    return map;
  }, [payload?.blockedDates]);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of payload?.dayCounts ?? []) {
      map.set(row.date, row.count);
    }
    return map;
  }, [payload?.dayCounts]);

  const selectedByDate = useMemo(() => {
    const map = new Map<string, SelectedItem>();
    for (const item of selected) map.set(item.date, item);
    return map;
  }, [selected]);

  const cells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);
  const selectedOffs = useMemo(
    () => selected.filter((s) => s.kind === 'off').sort((a, b) => a.date.localeCompare(b.date)),
    [selected],
  );
  const selectedShifts = useMemo(
    () => selected.filter((s) => s.kind === 'shift').sort((a, b) => a.date.localeCompare(b.date)),
    [selected],
  );

  const dirty = useMemo(() => {
    if (!unlocked) return false;
    return selectionFingerprint(selected) !== selectionFingerprint(requestsToSelection(myRequests));
  }, [unlocked, selected, myRequests]);

  function markDirty() {
    setMessage(null);
    setError(null);
  }

  function resetEmployee() {
    setUnlocked(false);
    setLegacyNoPin(false);
    setMyRequests([]);
    setSelected([]);
    setPickMode('off');
    setPin('');
    setPinConfirm('');
    setMessage(null);
    setError(null);
  }

  function changeMonth(next: string) {
    setMonthKey(next);
    resetEmployee();
  }

  async function handleCheckStatus() {
    setError(null);
    setMessage(null);
    if (!name) {
      setError('직원 이름을 선택해 주세요.');
      return;
    }
    try {
      const result = await status.mutateAsync(name);
      if (!result.hasRequests) {
        setUnlocked(true);
        setLegacyNoPin(false);
        setMyRequests([]);
        setSelected([]);
        setMessage('새 신청입니다. 날짜를 고른 뒤 개인 비밀번호를 설정하고 [신청 저장]을 눌러 주세요.');
        return;
      }
      setUnlocked(false);
      setMessage(
        result.hasPin
          ? '이미 신청이 있습니다. 개인 비밀번호로 잠금 해제한 뒤 수정하세요.'
          : '비밀번호가 없던 신청입니다. 비밀번호를 입력해 잠금 해제하세요.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '상태 확인에 실패했습니다.');
    }
  }

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await unlock.mutateAsync({ name, pin });
      setUnlocked(true);
      setLegacyNoPin(Boolean(result.legacy));
      setMyRequests(result.requests);
      setSelected(
        result.requests.map((r) => ({
          date: r.date,
          kind: normalizeRequestKind(r.kind),
          shift_group: r.shift_group,
          reason: r.reason || '',
        })),
      );
      setMessage(result.message || '잠금 해제되었습니다. 수정 후 반드시 [신청 저장]을 눌러 주세요.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '잠금 해제에 실패했습니다.');
    }
  }

  function needsException(date: string, nextOffs: SelectedItem[]): boolean {
    if (!window) return false;
    const otherCount = countMap.get(date) ?? 0;
    const wasMineOff = myRequests.some(
      (r) => r.date === date && normalizeRequestKind(r.kind) === 'off',
    );
    const others = wasMineOff ? Math.max(0, otherCount - 1) : otherCount;
    const overCapacity = others >= maxPeople;
    const sorted = [...nextOffs].sort((a, b) => a.date.localeCompare(b.date));
    const index = sorted.findIndex((s) => s.date === date) + 1;
    const overPersonal = index > maxDays;
    return overCapacity || overPersonal;
  }

  function toggleOffDate(date: string) {
    if (!open || !unlocked) return;
    if (blockedMap.has(date)) return;

    markDirty();
    const existing = selectedByDate.get(date);
    if (existing?.kind === 'off') {
      setSelected((prev) => prev.filter((s) => s.date !== date));
      return;
    }

    const withoutDate = selected.filter((s) => s.date !== date);
    const nextOffs = [...withoutDate.filter((s) => s.kind === 'off'), { date, kind: 'off' as const, shift_group: null, reason: '' }];
    if (needsException(date, nextOffs)) {
      setReasonDate(date);
      setReasonDraft('');
      return;
    }
    setSelected([...withoutDate, { date, kind: 'off', shift_group: null, reason: '' }]);
  }

  function openShiftPicker(date: string) {
    if (!open || !unlocked) return;
    if (blockedMap.has(date)) return;

    const existing = selectedByDate.get(date);
    if (existing?.kind === 'shift') {
      markDirty();
      setSelected((prev) => prev.filter((s) => s.date !== date));
      return;
    }

    const shiftCount = selected.filter((s) => s.kind === 'shift' && s.date !== date).length;
    if (shiftCount >= DAY_OFF_MAX_SHIFT_DAYS) {
      setError(`조 가능일은 최대 ${DAY_OFF_MAX_SHIFT_DAYS}일까지입니다.`);
      setMessage(null);
      return;
    }
    setShiftDate(date);
    setError(null);
  }

  function confirmShift(group: DayOffShiftGroup) {
    if (!shiftDate) return;
    markDirty();
    setSelected((prev) => [
      ...prev.filter((s) => s.date !== shiftDate),
      { date: shiftDate, kind: 'shift', shift_group: group, reason: '' },
    ]);
    setShiftDate(null);
  }

  function confirmReason() {
    if (!reasonDate) return;
    const reason = reasonDraft.trim();
    if (!reason) {
      setError('특별한 사유를 입력해 주세요. 관리자가 형평성을 검토합니다.');
      return;
    }
    markDirty();
    setSelected((prev) => [
      ...prev.filter((s) => s.date !== reasonDate),
      { date: reasonDate, kind: 'off', shift_group: null, reason },
    ]);
    setReasonDate(null);
    setReasonDraft('');
  }

  function handleDayTap(date: string) {
    if (pickMode === 'shift') openShiftPicker(date);
    else toggleOffDate(date);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!unlocked) {
      setError('먼저 이름을 선택하고 잠금 해제해 주세요.');
      return;
    }
    if (selected.length === 0) {
      setError('신청할 날짜를 선택해 주세요. 모두 지우려면 [전체 삭제]를 사용하세요.');
      return;
    }
    try {
      const result = await save.mutateAsync({
        name,
        pin,
        pinConfirm: legacyNoPin || myRequests.length === 0 ? pinConfirm || pin : undefined,
        dates: selected.map((item) => ({
          date: item.date,
          kind: item.kind,
          shift_group: item.shift_group,
          reason: item.reason,
        })),
      });
      setMyRequests(result.requests);
      setSelected(
        result.requests.map((r) => ({
          date: r.date,
          kind: normalizeRequestKind(r.kind),
          shift_group: r.shift_group,
          reason: r.reason || '',
        })),
      );
      setLegacyNoPin(false);
      setMessage('신청이 저장되었습니다. 대기(예외) 건은 관리자 승인 후 확정됩니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    }
  }

  async function handleClearAll() {
    setError(null);
    try {
      await clear.mutateAsync({ name, pin });
      setMyRequests([]);
      setSelected([]);
      setUnlocked(false);
      setMessage('신청이 모두 삭제되었습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  const pendingCount = myRequests.filter((r) => r.status === 'pending').length;
  const busy =
    status.isPending || unlock.isPending || save.isPending || clear.isPending || windowQuery.isFetching;
  const periodLabel = window
    ? `${new Date(window.opens_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ~ ${new Date(window.closes_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`
    : '';

  return (
    <div className="dayoff-picker">
      <section className="dayoff-card dayoff-picker__intro">
        <div className="dayoff-month-switch">
          <button
            type="button"
            className="dayoff-month-switch__btn"
            aria-label="이전 달"
            onClick={() => changeMonth(shiftCalendarMonth(monthKey, -1))}
          >
            ‹
          </button>
          <div className="dayoff-month-switch__label">
            <strong>{formatCalendarMonthLabel(monthKey)}</strong>
            <span>휴무 신청</span>
          </div>
          <button
            type="button"
            className="dayoff-month-switch__btn"
            aria-label="다음 달"
            onClick={() => changeMonth(shiftCalendarMonth(monthKey, 1))}
          >
            ›
          </button>
        </div>
        <p className="dayoff-picker__hint">
          날짜를 탭한 뒤, 반드시 하단 <strong>신청 저장</strong>을 눌러야 반영됩니다.
        </p>
        {window ? (
          <div className="dayoff-rules">
            <span className="dayoff-chip">상한 {maxDays}일</span>
            <span className="dayoff-chip">하루 {maxPeople}명</span>
            <span className="dayoff-chip">조 가능 {DAY_OFF_MAX_SHIFT_DAYS}일</span>
            <span className="dayoff-chip">{periodLabel}</span>
          </div>
        ) : null}
        {monthKey !== nextMonthKey() ? (
          <button type="button" className="dayoff-link" onClick={() => changeMonth(nextMonthKey())}>
            다음 달로 이동
          </button>
        ) : null}
      </section>

      {windowQuery.isLoading ? <p className="dayoff-status">불러오는 중…</p> : null}
      {windowQuery.error ? (
        <p className="dayoff-error">
          {windowQuery.error instanceof Error ? windowQuery.error.message : '불러오기 실패'}
        </p>
      ) : null}

      {payload?.lockMessage ? <p className="dayoff-banner">{payload.lockMessage}</p> : null}

      {window?.notes ? (
        <section className="dayoff-card dayoff-guide">
          <h2>신청 안내</h2>
          <pre className="dayoff-guide__body">{window.notes}</pre>
        </section>
      ) : null}

      <section className="dayoff-card dayoff-identity">
        <label className="field dayoff-identity__name">
          <span>내 이름</span>
          <select
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              resetEmployee();
            }}
          >
            <option value="">선택</option>
            {(payload?.staffNames ?? []).map((staffName) => (
              <option key={staffName} value={staffName}>
                {staffName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--outline dayoff-identity__check"
          disabled={!name || busy}
          onClick={() => void handleCheckStatus()}
        >
          신청 상태 확인
        </button>

        {!unlocked && name ? (
          <form className="dayoff-identity__unlock" onSubmit={(e) => void handleUnlock(e)}>
            <label className="field">
              <span>개인 비밀번호</span>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                minLength={4}
                maxLength={12}
                required
                inputMode="numeric"
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={busy || pin.length < 4}>
              잠금 해제
            </button>
          </form>
        ) : null}
      </section>

      {unlocked ? (
        <>
          <section className="dayoff-card dayoff-pick-card">
            <div className="dayoff-mode" role="tablist" aria-label="선택 모드">
              <button
                type="button"
                role="tab"
                aria-selected={pickMode === 'off'}
                className={pickMode === 'off' ? 'is-active' : undefined}
                onClick={() => setPickMode('off')}
              >
                휴무
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pickMode === 'shift'}
                className={pickMode === 'shift' ? 'is-active' : undefined}
                onClick={() => setPickMode('shift')}
              >
                조 가능일 (A/B/C · 최대 {DAY_OFF_MAX_SHIFT_DAYS}일)
              </button>
            </div>
            <p className="dayoff-muted">
              {pickMode === 'off'
                ? '휴무 모드: 날짜를 탭하면 휴무로 선택/해제됩니다.'
                : `조 가능일 모드: 근무는 하되 A·B·C 중 하루만 가능한 날을 고릅니다. (${selectedShifts.length}/${DAY_OFF_MAX_SHIFT_DAYS})`}
            </p>

            <div className="dayoff-cal" aria-label={`${formatCalendarMonthLabel(monthKey)} 달력`}>
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
                  const blocked = blockedMap.get(date);
                  const count = countMap.get(date) ?? 0;
                  const mine = selectedByDate.get(date);
                  const mineRow = myRequests.find((r) => r.date === date);
                  const full = maxPeople > 0 && count >= maxPeople;
                  const classes = [
                    'dayoff-cal__day',
                    weekdayClass(date),
                    holiday ? 'is-holiday' : '',
                    blocked ? 'is-blocked' : '',
                    mine?.kind === 'off' ? 'is-selected' : '',
                    mine?.kind === 'shift' ? 'is-shift' : '',
                    full ? 'is-full' : '',
                    !open ? 'is-readonly' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={classes}
                      disabled={!open || Boolean(blocked)}
                      onClick={() => handleDayTap(date)}
                      aria-pressed={Boolean(mine)}
                    >
                      <span className="dayoff-cal__num">{cell.day}</span>
                      {blocked ? (
                        <span className="dayoff-cal__mark is-block">불가</span>
                      ) : holiday ? (
                        <span className="dayoff-cal__mark is-holiday">{holiday.slice(0, 2)}</span>
                      ) : null}
                      <span className="dayoff-cal__count">
                        {count}/{maxPeople || '—'}
                      </span>
                      {mine?.kind === 'shift' ? (
                        <span className="dayoff-cal__status is-shift">{mine.shift_group}조</span>
                      ) : mineRow && normalizeRequestKind(mineRow.kind) === 'off' ? (
                        <span className={`dayoff-cal__status is-${mineRow.status}`}>
                          {shortStatus(mineRow.status)}
                        </span>
                      ) : mine?.kind === 'off' ? (
                        <span className="dayoff-cal__status is-draft">선택</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="dayoff-legend">
                <span>
                  <i className="is-selected" /> 휴무
                </span>
                <span>
                  <i className="is-shift" /> 조 가능
                </span>
                <span>
                  <i className="is-blocked" /> 불가
                </span>
              </div>
            </div>
          </section>

          {dirty ? (
            <p className="dayoff-banner dayoff-banner--unsaved" role="status">
              저장되지 않은 변경이 있습니다. 아래에서 <strong>신청 저장</strong>을 눌러 주세요.
            </p>
          ) : null}

          <section className="dayoff-card dayoff-selected">
            <div className="dayoff-save__head">
              <h2>
                휴무 <em>{selectedOffs.length}</em> / {maxDays || '—'}일 · 조 가능{' '}
                <em>{selectedShifts.length}</em> / {DAY_OFF_MAX_SHIFT_DAYS}일
              </h2>
              {selected.length > 0 ? (
                <button
                  type="button"
                  className="dayoff-link"
                  onClick={() => {
                    markDirty();
                    setSelected([]);
                  }}
                >
                  선택 비우기
                </button>
              ) : null}
            </div>

            {selectedOffs.length > 0 ? (
              <ul className="dayoff-save__list">
                {selectedOffs.map((item) => {
                  const row = myRequests.find(
                    (r) => r.date === item.date && normalizeRequestKind(r.kind) === 'off',
                  );
                  return (
                    <li key={`off-${item.date}`} className={item.reason ? 'is-exception' : undefined}>
                      <div>
                        <strong>휴무 · {formatCalendarDateLabel(item.date)}</strong>
                        <span>
                          {row
                            ? DAY_OFF_STATUS_LABELS[row.status]
                            : item.reason
                              ? `예외 · ${item.reason}`
                              : '일반 신청'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="dayoff-selected__remove"
                        onClick={() => {
                          markDirty();
                          setSelected((prev) => prev.filter((s) => s.date !== item.date));
                        }}
                      >
                        제거
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {selectedShifts.length > 0 ? (
              <ul className="dayoff-save__list">
                {selectedShifts.map((item) => (
                  <li key={`shift-${item.date}`} className="is-shift">
                    <div>
                      <strong>
                        {item.shift_group}조만 · {formatCalendarDateLabel(item.date)}
                      </strong>
                      <span>근무일 · 해당 조만 가능</span>
                    </div>
                    <button
                      type="button"
                      className="dayoff-selected__remove"
                      onClick={() => {
                        markDirty();
                        setSelected((prev) => prev.filter((s) => s.date !== item.date));
                      }}
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {selected.length === 0 ? (
              <p className="dayoff-muted">달력에서 날짜를 탭해 주세요.</p>
            ) : null}
          </section>

          <form className="dayoff-card dayoff-save" onSubmit={(e) => void handleSave(e)}>
            <div className="dayoff-save__pins">
              <label className="field">
                <span>
                  {myRequests.length > 0 && !legacyNoPin ? '개인 비밀번호 확인' : '개인 비밀번호 설정'}
                </span>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  minLength={4}
                  maxLength={12}
                  required
                  inputMode="numeric"
                  autoComplete="new-password"
                />
              </label>
              {(myRequests.length === 0 || legacyNoPin) && (
                <label className="field">
                  <span>비밀번호 확인</span>
                  <input
                    type="password"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    minLength={4}
                    maxLength={12}
                    required
                    inputMode="numeric"
                    autoComplete="new-password"
                  />
                </label>
              )}
            </div>

            <div className="dayoff-save__actions">
              <button
                type="submit"
                className={`btn btn--primary dayoff-save__primary${dirty ? ' is-pulse' : ''}`}
                disabled={!open || busy || selected.length === 0}
              >
                {save.isPending ? '저장 중…' : dirty ? '신청 저장 (변경됨)' : '신청 저장'}
              </button>
              {myRequests.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={busy}
                  onClick={() => void handleClearAll()}
                >
                  전체 삭제
                </button>
              ) : null}
            </div>
            {pendingCount > 0 ? (
              <p className="dayoff-muted">대기 {pendingCount}건은 관리자 승인 후 확정됩니다.</p>
            ) : null}
          </form>
        </>
      ) : null}

      {reasonDate ? (
        <div className="dayoff-modal" role="dialog" aria-modal="true">
          <div className="dayoff-modal__card">
            <h3>특별 사유 필요</h3>
            <p>
              {formatCalendarDateLabel(reasonDate)}은(는) 하루 정원 또는 개인 상한을 초과합니다. 다른
              직원과의 형평성 검토를 위해 사유를 적어 주세요.
            </p>
            <label className="field">
              <span>사유</span>
              <textarea
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                rows={4}
                placeholder="예: 가족 행사로 부득이하게 필요합니다."
              />
            </label>
            <div className="dayoff-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setReasonDate(null)}>
                취소
              </button>
              <button type="button" className="btn btn--primary" onClick={confirmReason}>
                선택하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shiftDate ? (
        <div className="dayoff-modal" role="dialog" aria-modal="true">
          <div className="dayoff-modal__card">
            <h3>조 가능일 선택</h3>
            <p>
              {formatCalendarDateLabel(shiftDate)} — 근무는 하되 A·B·C 중 <strong>하루만</strong> 가능한
              조를 고르세요. (최대 {DAY_OFF_MAX_SHIFT_DAYS}일)
            </p>
            <div className="dayoff-shift-pick">
              {DAY_OFF_SHIFT_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  className="btn btn--outline"
                  onClick={() => confirmShift(group)}
                >
                  {group}조만 가능
                </button>
              ))}
            </div>
            <div className="dayoff-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShiftDate(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message && !dirty ? <p className="dayoff-status">{message}</p> : null}
      {error ? <p className="dayoff-error">{error}</p> : null}
    </div>
  );
}
