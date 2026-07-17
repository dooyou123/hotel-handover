'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import type { WorkGroupCode } from '@/lib/constants';
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
import { getKoreanHolidaysInMonth } from '@/lib/calendar/korean-holidays';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { ScheduleEntryModal } from './schedule-entry-modal';
import { ScheduleMonthCalendar } from './schedule-month-calendar';
import { SchedulePastePanel } from './schedule-paste-panel';

export function SchedulePageClient() {
  const pageMeta = getNavPageMeta('/schedule');
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const { requireSession } = useWorkSession();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [defaultEntryDate, setDefaultEntryDate] = useState<string>();
  const [defaultEntryShift, setDefaultEntryShift] = useState<string>();
  const [modalDayEntries, setModalDayEntries] = useState<ScheduleEntry[]>([]);

  const { data: entries = [], isLoading: rosterLoading } = useMonthSchedule(month);
  const { createEntry, updateEntry, deleteEntry, deleteMonth } = useScheduleMutations();

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

  async function handleSaveEntry(input: ScheduleEntryInput | ScheduleEntryInput[], id?: string) {
    if (!requireSession('근무 일정 저장')) return;
    if (id && !Array.isArray(input)) {
      await updateEntry.mutateAsync({ id, input });
      showToast('근무 일정을 수정했습니다.');
      return;
    }
    const rows = Array.isArray(input) ? input : [input];
    await createEntry.mutateAsync(rows);
    showToast(
      rows.length > 1 ? `근무 일정 ${rows.length}명을 추가했습니다.` : '근무 일정을 추가했습니다.',
    );
  }

  async function handleDeleteEntry(id: string) {
    if (!requireSession('근무 일정 삭제')) return;
    await deleteEntry.mutateAsync(id);
    showToast('근무 일정을 삭제했습니다.');
  }

  function openCreateEntry(workDate?: string, shift?: WorkGroupCode | string) {
    setEditingEntry(null);
    const date = workDate ?? `${month}-01`;
    setDefaultEntryDate(date);
    setDefaultEntryShift(shift);
    setModalDayEntries(entries.filter((entry) => entry.work_date === date));
    setEntryModalOpen(true);
  }

  function openEditEntry(entry: ScheduleEntry) {
    setEditingEntry(entry);
    setDefaultEntryDate(undefined);
    setDefaultEntryShift(undefined);
    setModalDayEntries(entries.filter((row) => row.work_date === entry.work_date));
    setEntryModalOpen(true);
  }

  async function handleDeleteMonth() {
    if (!entries.length) return;
    if (!requireSession('근무표 전체 삭제')) return;
    const ok = await confirm({
      title: `${month} 근무표 전체 삭제`,
      message: `${month}에 등록된 근무 ${entries.length}건을 모두 삭제할까요?`,
      detail: '삭제한 근무표는 복구할 수 없습니다.',
      confirmLabel: '전체 삭제',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteMonth.mutateAsync(month);
    showToast(`${month} 근무표를 모두 삭제했습니다.`);
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

        <div className="schedule-page__month">
          <p>날짜 칸의 +로 조·직원을 한 번에 넣고, 이름을 눌러 수정·삭제합니다.</p>
        </div>

        <SchedulePastePanel month={month} uploading={uploading} onUploadParsed={handleUploadParsed} />

        {uploadNote ? <p className="schedule-upload__note schedule-upload__note--status">{uploadNote}</p> : null}

        <article className="schedule-panel schedule-panel--calendar">
          <div className="schedule-panel__header schedule-panel__header--split">
            <div>
              <h3>{month} 근무표</h3>
              <p>
                {entries.length
                  ? `${entries.length}건 · 공휴일 ${monthHolidays.size}일`
                  : '등록된 근무가 없습니다.'}
              </p>
            </div>
            <div className="schedule-table__actions">
              {entries.length ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--danger btn--small"
                  onClick={() => void handleDeleteMonth()}
                >
                  월 전체 삭제
                </button>
              ) : null}
              <button type="button" className="btn btn--primary btn--small" onClick={() => openCreateEntry()}>
                + 근무 추가
              </button>
            </div>
          </div>

          {rosterLoading ? (
            <p className="empty-state">불러오는 중…</p>
          ) : (
            <ScheduleMonthCalendar
              month={month}
              entries={entries}
              onMonthChange={setMonth}
              onAdd={openCreateEntry}
              onEdit={openEditEntry}
            />
          )}
        </article>
      </section>

      <ScheduleEntryModal
        open={entryModalOpen}
        entry={editingEntry}
        staffNames={staffNames}
        dayEntries={modalDayEntries}
        defaultDate={defaultEntryDate}
        defaultShift={defaultEntryShift}
        onClose={() => setEntryModalOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
