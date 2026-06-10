'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ERROR_LABELS,
  performReconciliation,
  type ColumnMapping,
  type ReconcileError,
  type ReconcileRecord,
} from '@/lib/rate-confirm/compare-engine';
import { downloadReconcileCsv } from '@/lib/rate-confirm/export-csv';
import {
  isAccountEqual,
  isDateEqual,
  isStatusEqual,
  normalizeRate,
} from '@/lib/rate-confirm/normalize';
import {
  guessColumnMapping,
  parseRateFile,
  type ColumnMappingFields,
  type ParsedSheet,
} from '@/lib/rate-confirm/parse';

const SAMPLE_BASE = '/samples/rate-confirm';

function mappingComplete(m: ColumnMappingFields): m is ColumnMapping {
  return Boolean(m.ota && m.rate);
}

function tagClass(error: ReconcileError): string {
  const map: Record<ReconcileError, string> = {
    MISSING_IN_PMS: 'missing',
    STATUS_MISMATCH: 'status',
    DATE_MISMATCH: 'date',
    RATE_MISMATCH: 'rate',
  };
  return map[error];
}

type CompareRowProps = {
  label: string;
  tlValue: string;
  pmsValue: string;
  mismatch: boolean;
  missing?: boolean;
};

function CompareRow({ label, tlValue, pmsValue, mismatch, missing }: CompareRowProps) {
  return (
    <div className={`rc-compare-row${mismatch ? ' rc-compare-row--bad' : ''}`}>
      <span className="rc-compare-row__label">{label}</span>
      <div className="rc-compare-row__values">
        <span className="rc-compare-row__side">
          <em>TL</em>
          {tlValue || '—'}
        </span>
        <span className="rc-compare-row__arrow" aria-hidden>
          →
        </span>
        <span className={`rc-compare-row__side${missing ? ' rc-compare-row__side--missing' : ''}`}>
          <em>PMS</em>
          {missing ? '미등록' : pmsValue || '—'}
        </span>
      </div>
    </div>
  );
}

type RateCompareRowProps = {
  tl: ReconcileRecord['tl'];
  pms: ReconcileRecord['pms'];
  missing: boolean;
};

function RateCompareRow({ tl, pms, missing }: RateCompareRowProps) {
  const tlRate = tl ? normalizeRate(tl.rate) : null;
  const pmsRate = pms ? normalizeRate(pms.rate) : null;
  const mismatch =
    !missing && tlRate != null && pmsRate != null && tlRate !== pmsRate;
  const delta = mismatch && tlRate != null && pmsRate != null ? pmsRate - tlRate : null;
  const pmsAdjust =
    mismatch && tlRate != null && pmsRate != null ? tlRate - pmsRate : null;

  const tlValue = tl
    ? `${tl.rateDisplay}원${tl.count > 1 ? ` (${tl.breakdown.join(' + ')})` : ''}`
    : '';
  const pmsValue = pms ? `${pms.rateDisplay}원` : '';

  return (
    <div
      className={`rc-compare-row rc-compare-row--rate${mismatch ? ' rc-compare-row--bad' : ''}`}
    >
      <span className="rc-compare-row__label">객실료</span>
      <div className="rc-compare-row__values">
        <span className="rc-compare-row__side">
          <em>TL</em>
          {tlValue || '—'}
        </span>
        <span className="rc-compare-row__arrow" aria-hidden>
          →
        </span>
        <span className={`rc-compare-row__side${missing ? ' rc-compare-row__side--missing' : ''}`}>
          <em>PMS</em>
          {missing ? '미등록' : pmsValue || '—'}
        </span>
      </div>
      {mismatch && delta != null && pmsAdjust != null ? (
        <div className="rc-rate-adjust" aria-label="객실료 차이 및 PMS 조정">
          <span className="rc-rate-adjust__caption">차이 (PMS − TL)</span>
          <strong
            className={`rc-rate-adjust__amount${delta > 0 ? ' is-pms-high' : ' is-pms-low'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString()}원
          </strong>
          <p className="rc-rate-adjust__compare">
            {delta < 0 ? (
              <>
                PMS가 TL보다 <strong>{Math.abs(delta).toLocaleString()}원</strong> 적음
                <span className="rc-rate-adjust__hint">TL &gt; PMS</span>
              </>
            ) : (
              <>
                PMS가 TL보다 <strong>{delta.toLocaleString()}원</strong> 많음
                <span className="rc-rate-adjust__hint">PMS &gt; TL</span>
              </>
            )}
          </p>
          <p className="rc-rate-adjust__action">
            PMS 조정{' '}
            <strong>
              {pmsAdjust > 0 ? '+' : ''}
              {pmsAdjust.toLocaleString()}원
            </strong>
            <span className="rc-rate-adjust__hint">TL 기준 맞춤</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReconcileErrorCard({ record }: { record: ReconcileRecord }) {
  const [copied, setCopied] = useState(false);
  const missing = record.errors.includes('MISSING_IN_PMS');
  const tl = record.tl;
  const pms = record.pms;

  const statusDiff = !missing && tl && pms && !isStatusEqual(tl.status, pms.status);
  const dateDiff = !missing && tl && pms && !isDateEqual(tl.ciDate, pms.ciDate);
  const accDiff = !missing && tl && pms && !isAccountEqual(tl.account, pms.account);

  async function copyOta() {
    await navigator.clipboard.writeText(record.ota);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="rc-card">
      <header className="rc-card__head">
        <div className="rc-card__identity">
          <button type="button" className="rc-card__ota" onClick={() => void copyOta()}>
            {copied ? '복사됨' : record.ota}
          </button>
          <strong className="rc-card__guest">{record.guestName}</strong>
        </div>
      </header>

      <div className="rc-card__tags">
        {record.errors.map((err) => (
          <span key={err} className={`rc-tag rc-tag--${tagClass(err)}`}>
            {ERROR_LABELS[err]}
          </span>
        ))}
        {tl && tl.count > 1 ? <span className="rc-tag rc-tag--info">TL {tl.count}건 합산</span> : null}
        {pms && pms.count > 1 ? <span className="rc-tag rc-tag--info">PMS {pms.count}건 합산</span> : null}
      </div>

      <div className="rc-compare">
        <CompareRow
          label="상태"
          tlValue={tl?.status ?? ''}
          pmsValue={pms?.status ?? ''}
          mismatch={!!statusDiff}
          missing={missing}
        />
        <CompareRow
          label="체크인"
          tlValue={tl?.ciDate ?? ''}
          pmsValue={pms?.ciDate ?? ''}
          mismatch={!!dateDiff}
          missing={missing}
        />
        <RateCompareRow tl={tl} pms={pms} missing={missing} />
        <CompareRow
          label="Account"
          tlValue={tl?.account ?? ''}
          pmsValue={pms?.account ?? ''}
          mismatch={!!accDiff}
          missing={missing}
        />
      </div>
    </article>
  );
}

type UploadZoneProps = {
  id: string;
  title: string;
  hint: string;
  sheet: ParsedSheet | null;
  onFile: (file: File) => void;
};

function UploadZone({ id, title, hint, sheet, onFile }: UploadZoneProps) {
  return (
    <label
      htmlFor={id}
      className={`rc-upload${sheet ? ' rc-upload--ready' : ''}`}
    >
      <input
        id={id}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        className="rc-upload__input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className="rc-upload__icon" aria-hidden>
        {sheet ? '✓' : '📄'}
      </span>
      <span className="rc-upload__title">{title}</span>
      {sheet ? (
        <>
          <span className="rc-upload__file">{sheet.fileName}</span>
          <span className="rc-upload__meta">{sheet.rows.length.toLocaleString()}행</span>
        </>
      ) : (
        <span className="rc-upload__hint">{hint}</span>
      )}
      <span className="rc-upload__action">{sheet ? '다른 파일 선택' : '클릭하여 업로드'}</span>
    </label>
  );
}

export function RateConfirmPageClient() {
  const [tlSheet, setTlSheet] = useState<ParsedSheet | null>(null);
  const [pmsSheet, setPmsSheet] = useState<ParsedSheet | null>(null);
  const [tlMapping, setTlMapping] = useState<ColumnMappingFields>({
    ota: '',
    guestName: '',
    status: '',
    rate: '',
    account: '',
    ciDate: '',
  });
  const [pmsMapping, setPmsMapping] = useState<ColumnMappingFields>({
    ota: '',
    guestName: '',
    status: '',
    rate: '',
    account: '',
    ciDate: '',
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    if (!tlSheet || !pmsSheet || !mappingComplete(tlMapping) || !mappingComplete(pmsMapping)) {
      return null;
    }
    return performReconciliation(tlSheet, pmsSheet, tlMapping, pmsMapping);
  }, [tlSheet, pmsSheet, tlMapping, pmsMapping]);

  const query = search.trim().toLowerCase();
  const filteredErrors = useMemo(() => {
    if (!result) return [];
    if (!query) return result.errors;
    return result.errors.filter(
      (r) => r.ota.toLowerCase().includes(query) || r.guestName.toLowerCase().includes(query),
    );
  }, [result, query]);

  const filteredMatches = useMemo(() => {
    if (!result) return [];
    if (!query) return result.matches;
    return result.matches.filter(
      (r) => r.ota.toLowerCase().includes(query) || r.guestName.toLowerCase().includes(query),
    );
  }, [result, query]);

  const step = !tlSheet || !pmsSheet ? 1 : result ? 3 : 2;

  async function loadFile(file: File, target: 'tl' | 'pms') {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseRateFile(file);
      if (!parsed.headers.length) {
        setError('파일에서 헤더를 읽지 못했습니다.');
        return;
      }
      const mapping = guessColumnMapping(parsed.headers);
      if (target === 'tl') {
        setTlSheet(parsed);
        setTlMapping(mapping);
      } else {
        setPmsSheet(parsed);
        setPmsMapping(mapping);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '파일을 읽지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function renderMappingSelect(
    label: string,
    value: string,
    onChange: (v: string) => void,
    headers: string[],
  ) {
    return (
      <label className="rc-field">
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— 선택 —</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderMappingBlock(
    title: string,
    mapping: ColumnMappingFields,
    setMapping: (m: ColumnMappingFields) => void,
    headers: string[],
  ) {
    const set = (key: keyof ColumnMappingFields) => (v: string) =>
      setMapping({ ...mapping, [key]: v });

    return (
      <div className="rc-mapping-block">
        <h4>{title}</h4>
        <div className="rc-mapping-block__grid">
          {renderMappingSelect('예약번호 (OTA)', mapping.ota, set('ota'), headers)}
          {renderMappingSelect('고객명', mapping.guestName, set('guestName'), headers)}
          {renderMappingSelect('예약 상태', mapping.status, set('status'), headers)}
          {renderMappingSelect('체크인', mapping.ciDate, set('ciDate'), headers)}
          {renderMappingSelect('객실료', mapping.rate, set('rate'), headers)}
          {renderMappingSelect('Account', mapping.account, set('account'), headers)}
        </div>
      </div>
    );
  }

  return (
    <section className="rc-page">
      <header className="rc-page__hero">
        <div>
          <p className="rc-page__eyebrow">예약 대조</p>
          <h2>객실료 컨펌</h2>
          <p className="rc-page__lead">
            TL-Lincoln RAW와 PMS export를 <strong>예약번호(OTA)</strong>로 맞춥니다. 다중 객실은
            합산하고 TL 취소 건은 제외합니다.
          </p>
        </div>
        {result ? (
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={() => downloadReconcileCsv(result.errors, result.matches)}
          >
            CSV 내보내기
          </button>
        ) : null}
      </header>

      <ol className="rc-steps" aria-label="진행 단계">
        <li className={step >= 1 ? 'is-active' : ''}>① 파일 업로드</li>
        <li className={step >= 2 ? 'is-active' : ''}>② 열 확인</li>
        <li className={step >= 3 ? 'is-active' : ''}>③ 결과</li>
      </ol>

      <div className="rc-upload-row">
        <UploadZone
          id="rc-tl-file"
          title="TL-Lincoln RAW"
          hint="예약 목록 CSV / Excel"
          sheet={tlSheet}
          onFile={(f) => void loadFile(f, 'tl')}
        />
        <UploadZone
          id="rc-pms-file"
          title="PMS보내기"
          hint="산하 IT PMS export"
          sheet={pmsSheet}
          onFile={(f) => void loadFile(f, 'pms')}
        />
      </div>

      <p className="rc-samples">
        샘플:
        <Link href={`${SAMPLE_BASE}/tl-lincoln-sample.csv`} download>
          TL CSV
        </Link>
        <Link href={`${SAMPLE_BASE}/tl-lincoln-sample.xlsx`} download>
          TL Excel
        </Link>
        <Link href={`${SAMPLE_BASE}/pms-export-sample.csv`} download>
          PMS CSV
        </Link>
        <Link href={`${SAMPLE_BASE}/pms-export-sample.xlsx`} download>
          PMS Excel
        </Link>
      </p>

      {loading ? <p className="rc-status rc-status--loading">파일 분석 중…</p> : null}
      {error ? <p className="rc-status rc-status--error">{error}</p> : null}

      {tlSheet && pmsSheet ? (
        <details className="rc-mapping" open={!result}>
          <summary>열 매핑 설정</summary>
          <div className="rc-mapping__body">
            {renderMappingBlock('TL-Lincoln', tlMapping, setTlMapping, tlSheet.headers)}
            {renderMappingBlock('PMS', pmsMapping, setPmsMapping, pmsSheet.headers)}
          </div>
        </details>
      ) : null}

      {!tlSheet || !pmsSheet ? (
        <div className="rc-empty">
          <p>양쪽 파일을 모두 업로드하면 자동으로 대조합니다.</p>
        </div>
      ) : null}

      {result ? (
        <div className="rc-results">
          <div className="rc-metrics">
            <div className="rc-metric rc-metric--alert">
              <span>불일치</span>
              <strong>{result.summary.errorCount}</strong>
            </div>
            <div className="rc-metric rc-metric--ok">
              <span>일치</span>
              <strong>{result.matches.length}</strong>
            </div>
            <div className="rc-metric">
              <span>TL 예약</span>
              <strong>{result.summary.tlCount}</strong>
            </div>
            <div className="rc-metric">
              <span>PMS 예약</span>
              <strong>{result.summary.pmsCount}</strong>
            </div>
          </div>

          {result.summary.errorCount > 0 ? (
            <div className="rc-pills">
              {result.summary.missingCount > 0 ? (
                <span className="rc-pill rc-pill--missing">PMS 누락 {result.summary.missingCount}</span>
              ) : null}
              {result.summary.statusCount > 0 ? (
                <span className="rc-pill rc-pill--status">상태 {result.summary.statusCount}</span>
              ) : null}
              {result.summary.dateCount > 0 ? (
                <span className="rc-pill rc-pill--date">날짜 {result.summary.dateCount}</span>
              ) : null}
              {result.summary.rateCount > 0 ? (
                <span className="rc-pill rc-pill--rate">객실료 {result.summary.rateCount}</span>
              ) : null}
            </div>
          ) : (
            <p className="rc-banner rc-banner--ok">모든 예약이 일치합니다.</p>
          )}

          <div className="rc-toolbar">
            <input
              type="search"
              className="rc-toolbar__search"
              placeholder="고객명 · 예약번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="rc-toolbar__count">
              불일치 {filteredErrors.length} · 일치 {filteredMatches.length}
            </span>
          </div>

          {filteredErrors.length > 0 ? (
            <section className="rc-section">
              <h3 className="rc-section__title">수정 필요 ({filteredErrors.length})</h3>
              <div className="rc-card-list">
                {filteredErrors.map((record) => (
                  <ReconcileErrorCard key={record.ota} record={record} />
                ))}
              </div>
            </section>
          ) : result.summary.errorCount > 0 ? (
            <p className="rc-empty">검색 결과가 없습니다.</p>
          ) : null}

          {filteredMatches.length > 0 ? (
            <details className="rc-matches">
              <summary>일치 예약 ({filteredMatches.length})</summary>
              <ul className="rc-matches__list">
                {filteredMatches.map((record) => (
                  <li key={record.ota}>
                    <button
                      type="button"
                      className="rc-card__ota rc-card__ota--muted"
                      onClick={() => void navigator.clipboard.writeText(record.ota)}
                    >
                      {record.ota}
                    </button>
                    <span>{record.guestName}</span>
                    <span className="rc-matches__rate">{record.tl?.rateDisplay}원</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : tlSheet && pmsSheet ? (
        <p className="rc-status">예약번호·객실료 열을 선택하면 대조가 시작됩니다.</p>
      ) : null}
    </section>
  );
}
