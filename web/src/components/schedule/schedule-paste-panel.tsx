'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildSampleCsv,
  parseSchedulePaste,
  parseScheduleXlsx,
  summarizeScheduleParse,
  type ScheduleParseResult,
} from '@/lib/schedule/parse-csv';
import { formatWorkGroupLabel } from '@/lib/constants';
import { normalizeScheduleGroup } from '@/lib/schedule/group-utils';

type SchedulePastePanelProps = {
  month: string;
  uploading: boolean;
  onUploadParsed: (result: ScheduleParseResult) => Promise<void>;
};

export function SchedulePastePanel({ month, uploading, onUploadParsed }: SchedulePastePanelProps) {
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ScheduleParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => (preview ? summarizeScheduleParse(preview) : null), [preview]);

  useEffect(() => {
    setPreview(null);
    setError(null);
  }, [month]);

  function handleAnalyze() {
    const parsed = parseSchedulePaste(pasteText, month);
    if ('error' in parsed) {
      setPreview(null);
      setError(parsed.error);
      return;
    }
    setPreview(parsed);
    setError(null);
  }

  async function handleApply() {
    if (!preview) return;
    await onUploadParsed(preview);
    setPasteText('');
    setPreview(null);
    setError(null);
  }

  function loadSample() {
    const sample = buildSampleCsv(month);
    setPasteText(sample);
    const parsed = parseSchedulePaste(sample, month);
    if (!('error' in parsed)) {
      setPreview(parsed);
      setError(null);
    }
  }

  return (
    <article className="schedule-panel schedule-panel--upload schedule-panel--full schedule-paste-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>엑셀 근무표 붙여넣기</h3>
          <p>이번 달 엑셀 근무표를 그대로 복사해 붙여넣으면 A~E조 근무를 읽어 등록합니다.</p>
        </div>
      </div>

      <ol className="schedule-paste-panel__steps">
        <li>엑셀에서 이번 달 근무표 전체(날짜 + A~E조 열)를 선택해 복사</li>
        <li>아래 칸에 붙여넣고 「분석」 → 「이번 달 근무표 등록」</li>
      </ol>

      <div className="schedule-upload__controls">
        <label className="schedule-field schedule-field--file">
          <span>엑셀 파일 (.xlsx)</span>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const buffer = await file.arrayBuffer();
              const parsed = parseScheduleXlsx(buffer, month);
              if ('error' in parsed) {
                setPreview(null);
                setError(parsed.error);
              } else {
                setPreview(parsed);
                setError(null);
              }
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <label className="schedule-field schedule-field--full">
        <span>엑셀에서 복사한 근무표</span>
        <textarea
          rows={8}
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            setPreview(null);
            setError(null);
          }}
          placeholder={`예)\n날짜\tA조\tB조\tC조\n1\t김프런\t이데스크\t최야간\n2\t박체크\t김프런\t이데스크`}
          className="schedule-paste-panel__input"
        />
      </label>

      <div className="schedule-upload__actions">
        <button type="button" onClick={loadSample} className="btn btn--ghost">
          샘플 붙여넣기
        </button>
        <button type="button" onClick={handleAnalyze} disabled={!pasteText.trim()} className="btn btn--ghost">
          분석
        </button>
      </div>

      {error ? <p className="schedule-paste-panel__error">{error}</p> : null}

      {preview && stats ? (
        <div className="schedule-paste-panel__preview">
          <p>
            <strong>{stats.format === 'matrix' ? '엑셀 표 형식' : '목록 형식'}</strong> · {stats.entryCount}건 ·{' '}
            {stats.dayCount}일
            {stats.dateFrom && stats.dateTo ? ` · ${stats.dateFrom} ~ ${stats.dateTo}` : ''}
          </p>
          <p>
            조: {stats.groups.map((group) => formatWorkGroupLabel(normalizeScheduleGroup(group) ?? group)).join(', ')}
          </p>
          {preview.errors.length ? (
            <p className="schedule-paste-panel__warn">
              {preview.errors.length}행 확인 필요 (등록 가능한 행은 반영됩니다)
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            disabled={uploading}
            onClick={handleApply}
          >
            {uploading ? '등록 중…' : '이번 달 근무표 등록'}
          </button>
        </div>
      ) : null}

      <p className="schedule-upload__note">같은 달을 다시 등록하면 기존 근무표를 교체합니다.</p>
    </article>
  );
}
