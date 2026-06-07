'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SHIFTS } from '@/lib/constants';
import { buildSampleCsv } from '@/lib/schedule/parse-csv';
import { invalidateScheduleQueries, uploadScheduleCsv, useMonthSchedule } from '@/lib/schedule/use-schedule';

function formatDateLabel(workDate: string): string {
  const date = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return workDate;
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function SchedulePageClient() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [csvText, setCsvText] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useMonthSchedule(month);

  const tableRows = useMemo(() => {
    const byDate = new Map<string, Record<(typeof SHIFTS)[number], string[]>>();
    entries.forEach((entry) => {
      if (!byDate.has(entry.work_date)) {
        byDate.set(entry.work_date, { 주간: [], 오후: [], 야간: [] });
      }
      const row = byDate.get(entry.work_date)!;
      const shift = entry.shift as (typeof SHIFTS)[number];
      if (row[shift]) row[shift].push(entry.staff_name);
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

  return (
    <>
      <section className="schedule-page">
        <div className="schedule-page__intro">
          <h2>월간 스케줄</h2>
          <p>한 달치 근무표 CSV를 업로드하세요. 인수인계 보드에는 「오늘 근무」만 표시됩니다.</p>
        </div>

        <article className="schedule-panel schedule-panel--upload schedule-panel--full">
          <div className="schedule-panel__header">
            <div>
              <h3>월간 스케줄 업로드</h3>
              <p>CSV 형식: 날짜, 교대, 이름</p>
            </div>
          </div>

          <div className="schedule-upload__controls">
            <label className="schedule-field">
              <span>업로드 월</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
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
            <span>CSV 내용 미리보기 / 직접 붙여넣기</span>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="날짜,교대,이름"
            />
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
            {uploadNote || '같은 달을 다시 업로드하면 기존 스케줄을 교체합니다.'}
          </p>
        </article>

        <article className="schedule-panel schedule-panel--table">
          <div className="schedule-panel__header schedule-panel__header--split">
            <div>
              <h3>{month} 근무표</h3>
              <p>{entries.length ? `${entries.length}건 등록됨` : '아직 업로드된 스케줄이 없습니다.'}</p>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">불러오는 중…</p>
          ) : !tableRows.length ? (
            <p className="empty-state">표시할 스케줄이 없습니다.</p>
          ) : (
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>주간</th>
                    <th>오후</th>
                    <th>야간</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(([workDate, shifts]) => (
                    <tr key={workDate}>
                      <td>{formatDateLabel(workDate)}</td>
                      {SHIFTS.map((shift) => (
                        <td key={shift} className={shifts[shift].length ? undefined : 'schedule-table__empty'}>
                          {shifts[shift].length ? shifts[shift].join(', ') : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
