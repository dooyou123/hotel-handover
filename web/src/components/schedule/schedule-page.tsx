'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import { emptyGroupSchedule, normalizeScheduleGroup } from '@/lib/schedule/group-utils';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type { ScheduleEntry, ScheduleParseResult } from '@/lib/schedule/parse-csv';
import {
  invalidateScheduleQueries,
  uploadScheduleEntries,
  useMonthSchedule,
  useScheduleMutations,
  type ScheduleEntryInput,
} from '@/lib/schedule/use-schedule';
import { createClient } from '@/lib/supabase/client';
import { getKoreanHoliday, getKoreanHolidaysInMonth } from '@/lib/calendar/korean-holidays';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { SCHEDULE_TAB_HINTS } from '@/lib/nav/sub-feature-copy';
import { LeaveRequestPanel } from './leave-request-panel';
import { ScheduleEntryModal } from './schedule-entry-modal';
import { SchedulePastePanel } from './schedule-paste-panel';

type ScheduleTab = 'roster' | 'leave';

function formatDateLabel(workDate: string): string {
  const date = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return workDate;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function SchedulePageClient() {
  const pageMeta = getNavPageMeta('/schedule');
  const queryClient = useQueryClient();
  const { requireSession } = useWorkSession();
  const [tab, setTab] = useState<ScheduleTab>('roster');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

  const { data: entries = [], isLoading: rosterLoading } = useMonthSchedule(month);
  const { createEntry, updateEntry, deleteEntry } = useScheduleMutations();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  const monthHolidays = useMemo(() => getKoreanHolidaysInMonth(month), [month]);

  const tableRows = useMemo(() => {
    const byDate = new Map<string, Record<(typeof WORK_GROUPS)[number], string[]>>();
    entries.forEach((entry) => {
      if (!byDate.has(entry.work_date)) {
        byDate.set(entry.work_date, emptyGroupSchedule());
      }
      const row = byDate.get(entry.work_date)!;
      const group = normalizeScheduleGroup(entry.shift);
      if (group) row[group].push(entry.staff_name);
    });
    monthHolidays.forEach((_name, workDate) => {
      if (!byDate.has(workDate)) {
        byDate.set(workDate, emptyGroupSchedule());
      }
    });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries, monthHolidays]);

  const monthHolidayList = useMemo(
    () => [...monthHolidays.entries()].sort(([a], [b]) => a.localeCompare(b)),
    [monthHolidays],
  );

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleUploadParsed(parsed: ScheduleParseResult) {
    if (!month) {
      showToast('등록할 월을 선택해 주세요.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadScheduleEntries(month, parsed.entries, true);
      invalidateScheduleQueries(queryClient);
      setUploadNote(
        `${month} 근무표 ${result.inserted}건 등록${
          parsed.errors.length ? ` · ${parsed.errors.length}행 확인 필요` : ''
        }`,
      );
      showToast('근무표가 등록되었습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '등록에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveEntry(input: ScheduleEntryInput, id?: string) {
    if (!requireSession('근무 일정 저장')) return;
    if (id) {
      await updateEntry.mutateAsync({ id, input });
      showToast('근무 일정을 수정했습니다.');
    } else {
      await createEntry.mutateAsync(input);
      showToast('근무 일정을 추가했습니다.');
    }
  }

  async function handleDeleteEntry(id: string) {
    await deleteEntry.mutateAsync(id);
    showToast('근무 일정을 삭제했습니다.');
  }

  return (
    <>
      <section className="project-board schedule-page">
        <header className="project-board__head">
          <div>
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.description}</p>
          </div>
        </header>

        <div className="project-board__toolbar schedule-tabs" role="tablist" aria-label="근무표 메뉴">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'roster'}
            className={`schedule-tabs__btn${tab === 'roster' ? ' is-active' : ''}`}
            onClick={() => setTab('roster')}
          >
            조별 근무표
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'leave'}
            className={`schedule-tabs__btn${tab === 'leave' ? ' is-active' : ''}`}
            onClick={() => setTab('leave')}
          >
            휴무 신청
          </button>
        </div>
        <p className="schedule-page__tab-hint">{SCHEDULE_TAB_HINTS[tab]}</p>

        {tab === 'leave' ? (
          <LeaveRequestPanel onToast={showToast} />
        ) : (
          <>
            <div className="schedule-page__month">
              <label className="schedule-field">
                <span>조회 월</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
            </div>

            <SchedulePastePanel month={month} uploading={uploading} onUploadParsed={handleUploadParsed} />

            {uploadNote ? <p className="schedule-upload__note schedule-upload__note--status">{uploadNote}</p> : null}

            {monthHolidayList.length > 0 ? (
              <article className="schedule-panel schedule-panel--holidays">
                <div className="schedule-panel__header">
                  <h3>이달 공휴일</h3>
                  <p>법정공휴일·명절이 자동으로 표시됩니다.</p>
                </div>
                <ul className="schedule-holiday-list">
                  {monthHolidayList.map(([date, name]) => (
                    <li key={date} className="schedule-holiday-list__item">
                      <span className="schedule-holiday-list__date">{formatDateLabel(date)}</span>
                      <span className="schedule-holiday-list__name">{name}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}

            <article className="schedule-panel schedule-panel--table">
              <div className="schedule-panel__header schedule-panel__header--split">
                <div>
                  <h3>{month} 근무표</h3>
                  <p>
                    {entries.length
                      ? `${entries.length}건 · 공휴일 ${monthHolidayList.length}일`
                      : monthHolidayList.length
                        ? `등록된 근무 없음 · 공휴일 ${monthHolidayList.length}일`
                        : '등록된 근무가 없습니다.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => {
                    setEditingEntry(null);
                    setEntryModalOpen(true);
                  }}
                >
                  + 근무 추가
                </button>
              </div>

              {rosterLoading ? (
                <p className="empty-state">불러오는 중…</p>
              ) : !tableRows.length && !monthHolidayList.length ? (
                <p className="empty-state">표시할 근무표가 없습니다.</p>
              ) : tableRows.length ? (
                <div className="schedule-table-wrap">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        {WORK_GROUPS.map((group) => (
                          <th key={group}>{formatWorkGroupLabel(group)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map(([workDate, groups]) => {
                        const holiday = getKoreanHoliday(workDate);
                        return (
                        <tr key={workDate} className={holiday ? 'schedule-table__row--holiday' : undefined}>
                          <td>
                            <span className="schedule-table__date">{formatDateLabel(workDate)}</span>
                            {holiday ? (
                              <span className="schedule-table__holiday" title={holiday}>
                                {holiday}
                              </span>
                            ) : null}
                          </td>
                          {WORK_GROUPS.map((group) => (
                            <td key={group} className={groups[group].length ? undefined : 'schedule-table__empty'}>
                              {groups[group].length ? groups[group].join(', ') : '-'}
                            </td>
                          ))}
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>

            {entries.length > 0 ? (
              <article className="schedule-panel">
                <div className="schedule-panel__header">
                  <h3>근무 상세 목록</h3>
                  <p>항목을 클릭해 수정·삭제할 수 있습니다.</p>
                </div>
                <ul className="schedule-entry-list">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="schedule-entry-list__item"
                        onClick={() => {
                          setEditingEntry(entry);
                          setEntryModalOpen(true);
                        }}
                      >
                        <span className="schedule-entry-list__date">{formatDateLabel(entry.work_date)}</span>
                        <span className="schedule-entry-list__shift">
                          {formatWorkGroupLabel(normalizeScheduleGroup(entry.shift) ?? entry.shift)}
                        </span>
                        <span className="schedule-entry-list__name">{entry.staff_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </>
        )}
      </section>

      <ScheduleEntryModal
        open={entryModalOpen}
        entry={editingEntry}
        staffNames={staffNames}
        onClose={() => setEntryModalOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
