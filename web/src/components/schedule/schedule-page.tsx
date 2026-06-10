'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import { emptyGroupSchedule, normalizeScheduleGroup } from '@/lib/schedule/group-utils';
import { useMonthEvents } from '@/lib/events/use-events';
import type { HotelEvent } from '@/lib/events/types';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { buildSampleCsv } from '@/lib/schedule/parse-csv';
import type { ScheduleEntry } from '@/lib/schedule/parse-csv';
import {
  invalidateScheduleQueries,
  uploadScheduleCsv,
  useMonthSchedule,
  useScheduleMutations,
} from '@/lib/schedule/use-schedule';
import { createClient } from '@/lib/supabase/client';
import { EventModal } from './event-modal';
import { ScheduleEntryModal } from './schedule-entry-modal';

type ScheduleTab = 'roster' | 'events';

function formatDateLabel(workDate: string): string {
  const date = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return workDate;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function formatEventTime(start: string | null, end: string | null): string {
  const fmt = (value: string) => value.slice(0, 5);
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return '종일';
}

export function SchedulePageClient() {
  const queryClient = useQueryClient();
  const { authorLabel, requireSession } = useWorkSession();
  const [tab, setTab] = useState<ScheduleTab>('roster');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [csvText, setCsvText] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HotelEvent | null>(null);

  const { data: entries = [], isLoading: rosterLoading } = useMonthSchedule(month);
  const { createEntry, updateEntry, deleteEntry } = useScheduleMutations();
  const { events, isLoading: eventsLoading, createEvent, updateEvent, deleteEvent } = useMonthEvents(month);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

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
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleUpload() {
    if (!month) {
      showToast('업로드할 월을 선택해 주세요.');
      return;
    }
    if (!csvText.trim()) {
      showToast('CSV 파일을 선택하거나 내용을 붙여넣어 주세요.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadScheduleCsv(month, csvText, true);
      invalidateScheduleQueries(queryClient);
      setUploadNote(
        `${month} 스케줄 ${result.inserted}건 등록${
          result.errors.length ? ` · ${result.errors.length}행 확인 필요` : ''
        }`,
      );
      showToast('스케줄이 업로드되었습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([`\uFEFF${buildSampleCsv(month)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `근무표_샘플_${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveEntry(input: Parameters<typeof createEntry.mutateAsync>[0], id?: string) {
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

  async function handleSaveEvent(
    input: Parameters<typeof createEvent.mutateAsync>[0],
    id?: string,
  ) {
    if (!requireSession('일정 저장')) return;
    if (id) {
      await updateEvent.mutateAsync({ id, input });
      showToast('일정을 수정했습니다.');
    } else {
      await createEvent.mutateAsync(input);
      showToast('일정을 추가했습니다.');
    }
  }

  async function handleDeleteEvent(id: string) {
    await deleteEvent.mutateAsync(id);
    showToast('일정을 삭제했습니다.');
  }

  return (
    <>
      <section className="schedule-page">
        <div className="schedule-page__intro">
          <h2>일정 관리</h2>
          <p>조별 근무표와 호텔 일정(VIP·회의·점검 등)을 한곳에서 관리합니다.</p>
        </div>

        <div className="schedule-tabs" role="tablist" aria-label="일정 종류">
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
            aria-selected={tab === 'events'}
            className={`schedule-tabs__btn${tab === 'events' ? ' is-active' : ''}`}
            onClick={() => setTab('events')}
          >
            호텔 일정
          </button>
        </div>

        <div className="schedule-page__month">
          <label className="schedule-field">
            <span>조회 월</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>

        {tab === 'roster' ? (
          <>
            <article className="schedule-panel schedule-panel--upload schedule-panel--full">
              <div className="schedule-panel__header">
                <div>
                  <h3>CSV 일괄 업로드</h3>
                  <p>CSV 형식: 날짜, 조, 이름 (예: A조, B, C)</p>
                </div>
              </div>

              <div className="schedule-upload__controls">
                <label className="schedule-field schedule-field--file">
                  <span>CSV 파일</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setCsvText(String(reader.result ?? ''));
                      reader.readAsText(file, 'UTF-8');
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <label className="schedule-field schedule-field--full">
                <span>CSV 내용</span>
                <textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="날짜,조,이름" />
              </label>

              <div className="schedule-upload__actions">
                <button type="button" onClick={downloadSample} className="btn btn--ghost">
                  샘플 CSV
                </button>
                <button type="button" onClick={handleUpload} disabled={uploading} className="btn btn--primary">
                  {uploading ? '업로드 중…' : '업로드'}
                </button>
              </div>
              <p className="schedule-upload__note">
                {uploadNote || '같은 달을 다시 업로드하면 기존 근무표를 교체합니다.'}
              </p>
            </article>

            <article className="schedule-panel schedule-panel--table">
              <div className="schedule-panel__header schedule-panel__header--split">
                <div>
                  <h3>{month} 근무표</h3>
                  <p>{entries.length ? `${entries.length}건` : '등록된 근무가 없습니다.'}</p>
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
              ) : !tableRows.length ? (
                <p className="empty-state">표시할 근무표가 없습니다.</p>
              ) : (
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
                      {tableRows.map(([workDate, groups]) => (
                        <tr key={workDate}>
                          <td>{formatDateLabel(workDate)}</td>
                          {WORK_GROUPS.map((group) => (
                            <td key={group} className={groups[group].length ? undefined : 'schedule-table__empty'}>
                              {groups[group].length ? groups[group].join(', ') : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
        ) : (
          <article className="schedule-panel">
            <div className="schedule-panel__header schedule-panel__header--split">
              <div>
                <h3>{month} 호텔 일정</h3>
                <p>{events.length ? `${events.length}건` : '등록된 일정이 없습니다.'}</p>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={() => {
                  setEditingEvent(null);
                  setEventModalOpen(true);
                }}
              >
                + 일정 추가
              </button>
            </div>

            {eventsLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : !events.length ? (
              <p className="empty-state">VIP 체크인, 회의, 점검 등 일정을 추가해 보세요.</p>
            ) : (
              <ul className="event-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="event-list__item"
                      onClick={() => {
                        setEditingEvent(event);
                        setEventModalOpen(true);
                      }}
                    >
                      <span className="event-list__date">{formatDateLabel(event.event_date)}</span>
                      <span className="event-list__time">{formatEventTime(event.start_time, event.end_time)}</span>
                      <span className="event-list__category">{event.category}</span>
                      <span className="event-list__title">{event.title}</span>
                      {event.description ? (
                        <span className="event-list__desc">{event.description}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
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

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        authorLabel={authorLabel}
        onClose={() => setEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
