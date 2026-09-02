'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ERROR_LABELS,
  performReconciliation,
  type ColumnMapping,
  type ReconcileError,
  type ReconcileRecord,
} from '@/lib/rate-confirm/compare-engine';
import { downloadReconcileCsv } from '@/lib/rate-confirm/export-csv';
import { getRecordRateMeta } from '@/lib/rate-confirm/record-meta';
import { sessionProgressLabel } from '@/lib/rate-confirm/session-payload';
import {
  useRateConfirmSessionDetail,
  useRateConfirmSessions,
} from '@/lib/rate-confirm/use-rate-confirm-history';
import {
  useGuestRateConfirmSessionDetail,
  useGuestRateConfirmSessions,
} from '@/lib/rate-confirm/use-rate-confirm-guest';
import type { RateConfirmItem } from '@/lib/rate-confirm/history-types';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import {
  detectRateFileFormat,
  guessColumnMapping,
  parseRateFile,
  type ColumnMappingFields,
  type ParsedSheet,
} from '@/lib/rate-confirm/parse';
import { RateConfirmHistoryPanel } from '@/components/rate-confirm/rate-confirm-history-panel';
import { RateConfirmGuestPinSettings } from '@/components/rate-confirm/rate-confirm-guest-pin-settings';
import {
  RateConfirmBlacklistAlertModal,
  RateConfirmBlacklistPanel,
} from '@/components/rate-confirm/rate-confirm-blacklist-panel';
import { RateConfirmResolutionForm } from '@/components/rate-confirm/rate-confirm-resolution-form';
import {
  buildBlacklistHitsByOta,
  findBlacklistHits,
  type BlacklistHit,
} from '@/lib/rate-confirm/blacklist-match';
import { useRateConfirmBlacklist } from '@/lib/rate-confirm/use-rate-confirm-blacklist';
import { useGuestRateConfirmBlacklist } from '@/lib/rate-confirm/use-rate-confirm-guest-blacklist';
import {
  ReconcileErrorsTable,
  ReconcileMatchesTable,
} from '@/components/rate-confirm/rate-confirm-table';

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
    ACCOUNT_MISMATCH: 'account',
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
  const meta = getRecordRateMeta({
    ota: '',
    guestName: '',
    errors: missing ? ['MISSING_IN_PMS'] : [],
    tl,
    pms,
  });

  const tlValue = tl
    ? `${tl.rateDisplay}원${tl.count > 1 ? ` (${tl.breakdown.join(' + ')})` : ''}`
    : '';
  const pmsValue = pms ? `${pms.rateDisplay}원` : '';

  return (
    <div
      className={`rc-compare-row rc-compare-row--rate rc-compare-row--compact${meta.rateMismatch ? ' rc-compare-row--bad' : ''}`}
    >
      <span className="rc-compare-row__label">객실료</span>
      <div className="rc-rate-inline">
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
        {meta.rateMismatch && meta.delta != null && meta.pmsAdjust != null ? (
          <span className="rc-rate-inline__adjust" aria-label="객실료 차이 및 PMS 조정">
            <span className="rc-rate-inline__delta">
              차이{' '}
              <strong className={meta.delta < 0 ? 'is-low' : 'is-high'}>
                {meta.delta > 0 ? '+' : ''}
                {meta.delta.toLocaleString()}원
              </strong>
            </span>
            <span className="rc-rate-inline__action">
              PMS 조정{' '}
              <strong>
                {meta.pmsAdjust > 0 ? '+' : ''}
                {meta.pmsAdjust.toLocaleString()}원
              </strong>
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReconcileErrorCard({
  record,
  blacklistHits,
}: {
  record: ReconcileRecord;
  blacklistHits?: BlacklistHit[];
}) {
  const [copied, setCopied] = useState(false);
  const meta = getRecordRateMeta(record);
  const { missing, statusDiff, dateDiff, accDiff, rateMismatch, delta } = meta;
  const tl = record.tl;
  const pms = record.pms;

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
        {rateMismatch && delta != null ? (
          <span className={`rc-card__diff${delta < 0 ? ' is-low' : ' is-high'}`}>
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString()}원
          </span>
        ) : null}
      </header>

      <div className="rc-card__tags">
        {blacklistHits?.length ? (
          <span className="rc-tag rc-tag--blacklist" title={blacklistHits.map((hit) => hit.entry.reason).join(' · ')}>
            ⚠ 블랙리스트
          </span>
        ) : null}
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
          label="OTA명"
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
  exampleName?: string;
  sheet: ParsedSheet | null;
  onFile: (file: File) => void;
};

function UploadZone({ id, title, hint, exampleName, sheet, onFile }: UploadZoneProps) {
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
        <>
          <span className="rc-upload__hint">{hint}</span>
          {exampleName ? (
            <span className="rc-upload__example" title="파일명 예시">
              {exampleName}
            </span>
          ) : null}
        </>
      )}
      <span className="rc-upload__action">{sheet ? '다른 파일 선택' : '클릭하여 업로드'}</span>
    </label>
  );
}

function formatTodayGuide(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    label: `${now.getMonth() + 1}월 ${now.getDate()}일`,
    ymd: `${y}${m}${d}`,
  };
}

type PageTab = 'reconcile' | 'history' | 'blacklist';

type RateConfirmPageClientProps = {
  mode?: 'staff' | 'guest';
};

export function RateConfirmPageClient({ mode = 'staff' }: RateConfirmPageClientProps) {
  const isGuest = mode === 'guest';
  const pageMeta = getNavPageMeta('/rate-confirm');
  const { session, authorLabel, requireSession } = useWorkSession();
  const [guestAuthor, setGuestAuthor] = useState('');
  const guestWorkGroup = '게스트';
  const staffSessions = useRateConfirmSessions(!isGuest);
  const guestSessions = useGuestRateConfirmSessions(isGuest);
  const { createSession } = isGuest ? guestSessions : staffSessions;
  const [pageTab, setPageTab] = useState<PageTab>('reconcile');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const autoSaveStartedRef = useRef(false);
  const staffDetail = useRateConfirmSessionDetail(activeSessionId, !isGuest);
  const guestDetail = useGuestRateConfirmSessionDetail(activeSessionId, isGuest);
  const { detailQuery: activeSessionQuery, saveResolution } = isGuest ? guestDetail : staffDetail;
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
  const [resultView, setResultView] = useState<'table' | 'cards'>('table');
  const staffBlacklist = useRateConfirmBlacklist(!isGuest);
  const guestBlacklist = useGuestRateConfirmBlacklist(isGuest);
  const blacklistEntries = isGuest ? guestBlacklist.listQuery.data ?? [] : staffBlacklist.listQuery.data ?? [];
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const blacklistAlertShownRef = useRef<string | null>(null);

  const result = useMemo(() => {
    if (!tlSheet || !pmsSheet || !mappingComplete(tlMapping) || !mappingComplete(pmsMapping)) {
      return null;
    }
    return performReconciliation(tlSheet, pmsSheet, tlMapping, pmsMapping);
  }, [tlSheet, pmsSheet, tlMapping, pmsMapping]);

  const query = search.trim().toLowerCase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blacklistHits = useMemo(() => {
    if (!result || !blacklistEntries.length) return [];
    return findBlacklistHits([...result.errors, ...result.matches], blacklistEntries);
  }, [result, blacklistEntries]);

  const blacklistHitsByOta = useMemo(() => buildBlacklistHitsByOta(blacklistHits), [blacklistHits]);
  const reconcileKey =
    tlSheet && pmsSheet ? `${tlSheet.fileName}:${pmsSheet.fileName}:${blacklistHits.length}` : null;

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
  const todayGuide = useMemo(() => formatTodayGuide(), []);
  const tlExampleName = `예약검색${todayGuide.ymd}2006-1.csv`;
  const pmsExampleName = `Reservation+List_${todayGuide.ymd}-1.xlsx`;

  const itemsByOta = useMemo(() => {
    const map = new Map<string, RateConfirmItem>();
    for (const item of activeSessionQuery.data?.items ?? []) {
      map.set(item.ota, item);
    }
    return map;
  }, [activeSessionQuery.data?.items]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function resetSavedSession() {
    setActiveSessionId(null);
    autoSaveStartedRef.current = false;
    blacklistAlertShownRef.current = null;
    setBlacklistModalOpen(false);
  }

  useEffect(() => {
    if (!result || !blacklistHits.length || !reconcileKey) return;
    if (blacklistAlertShownRef.current === reconcileKey) return;
    blacklistAlertShownRef.current = reconcileKey;
    setBlacklistModalOpen(true);
  }, [result, blacklistHits, reconcileKey]);

  useEffect(() => {
    if (!result || !tlSheet || !pmsSheet || activeSessionId || autoSaveStartedRef.current) return;

    const author = isGuest ? guestAuthor.trim() : authorLabel;
    const workGroup = isGuest ? guestWorkGroup : session.group;
    if (isGuest) {
      if (!guestAuthor.trim()) return;
    } else if (!session.group || !session.name) {
      return;
    }

    autoSaveStartedRef.current = true;

    void createSession
      .mutateAsync({
        author,
        workGroup,
        tlFileName: tlSheet.fileName,
        pmsFileName: pmsSheet.fileName,
        notes: '',
        result,
      })
      .then((detail) => {
        setActiveSessionId(detail.id);
        showToast('대조 결과를 자동 저장했습니다.');
      })
      .catch((caught: unknown) => {
        autoSaveStartedRef.current = false;
        showToast(caught instanceof Error ? caught.message : '자동 저장에 실패했습니다.');
      });
  }, [
    result,
    tlSheet,
    pmsSheet,
    activeSessionId,
    isGuest,
    guestAuthor,
    session.group,
    session.name,
    authorLabel,
    createSession,
  ]);

  async function loadFile(file: File, target: 'tl' | 'pms') {
    resetSavedSession();
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseRateFile(file);
      if (!parsed.headers.length) {
        setError('파일에서 헤더를 읽지 못했습니다.');
        return;
      }
      const mapping = guessColumnMapping(parsed.headers, target);
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

  function formatLabel(headers: string[]): string | null {
    const format = detectRateFileFormat(headers);
    if (format === 'tl_booking_search') return '예약검색 RAW 포맷 자동 인식';
    if (format === 'pms_reservation_list') return 'PMS Reservation List 자동 인식';
    return null;
  }

  function renderMappingBlock(
    title: string,
    mapping: ColumnMappingFields,
    setMapping: (m: ColumnMappingFields) => void,
    headers: string[],
  ) {
    const set = (key: keyof ColumnMappingFields) => (v: string) =>
      setMapping({ ...mapping, [key]: v });
    const detected = formatLabel(headers);

    return (
      <div className="rc-mapping-block">
        <h4>
          {title}
          {detected ? <span className="rc-mapping-block__format">{detected}</span> : null}
        </h4>
        <div className="rc-mapping-block__grid">
          {renderMappingSelect('예약번호 (OTA)', mapping.ota, set('ota'), headers)}
          {renderMappingSelect('고객명', mapping.guestName, set('guestName'), headers)}
          {renderMappingSelect('예약 상태', mapping.status, set('status'), headers)}
          {renderMappingSelect('체크인', mapping.ciDate, set('ciDate'), headers)}
          {renderMappingSelect('객실료', mapping.rate, set('rate'), headers)}
          {renderMappingSelect('OTA명 / Account', mapping.account, set('account'), headers)}
        </div>
      </div>
    );
  }

  return (
    <section className="rc-page">
      <header className="rc-page__hero">
        <div>
          <p className="rc-page__eyebrow">예약 대조</p>
          <h2>{pageMeta.label}</h2>
          <p className="rc-page__lead">{pageMeta.description}</p>
        </div>
        {result && pageTab === 'reconcile' ? (
          <div className="rc-page__hero-actions">
            <span className="rc-page__save-status" aria-live="polite">
              {activeSessionId
                ? '자동 저장됨'
                : createSession.isPending
                  ? '자동 저장 중…'
                  : isGuest
                    ? guestAuthor.trim()
                      ? '저장 대기'
                      : '담당자 이름 입력 후 자동 저장'
                    : session.group && session.name
                      ? '저장 대기'
                      : '조·담당자 선택 후 자동 저장'}
            </span>
            <button
              type="button"
              className="btn btn--outline btn--small"
              onClick={() => downloadReconcileCsv(result.errors, result.matches)}
            >
              CSV보내기
            </button>
          </div>
        ) : null}
      </header>

      {isGuest ? (
        <div className="rc-guest-identity">
          <div className="rc-guest-identity__head">
            <h3>1단계 · 담당자 이름</h3>
            <p className="rc-muted">이름을 먼저 적어야 결과가 저장됩니다. (조는 「게스트」로 기록)</p>
          </div>
          <label className="field">
            <span>담당자 이름 (기록용)</span>
            <input
              value={guestAuthor}
              onChange={(e) => setGuestAuthor(e.target.value)}
              placeholder="예: 김프런트"
              maxLength={40}
              autoComplete="name"
            />
          </label>
          {guestAuthor.trim() ? (
            <p className="rc-guest-identity__ok">준비됨 · 이제 TL·PMS 파일을 업로드하세요.</p>
          ) : (
            <p className="rc-guest-identity__warn">이름이 비어 있으면 자동 저장·처리 기록이 되지 않습니다.</p>
          )}
        </div>
      ) : (
        <RateConfirmGuestPinSettings />
      )}

      <div className="rc-page__tabs" role="tablist" aria-label="객실료 컨펌">
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'reconcile'}
          className={`rc-page__tab${pageTab === 'reconcile' ? ' is-active' : ''}`}
          onClick={() => setPageTab('reconcile')}
        >
          새 대조
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'history'}
          className={`rc-page__tab${pageTab === 'history' ? ' is-active' : ''}`}
          onClick={() => setPageTab('history')}
        >
          이력
        </button>
        {!isGuest ? (
          <button
            type="button"
            role="tab"
            aria-selected={pageTab === 'blacklist'}
            className={`rc-page__tab${pageTab === 'blacklist' ? ' is-active' : ''}`}
            onClick={() => setPageTab('blacklist')}
          >
            블랙리스트
          </button>
        ) : null}
      </div>

      {pageTab === 'history' ? (
        <RateConfirmHistoryPanel
          mode={mode}
          guestAuthor={guestAuthor}
          guestWorkGroup={guestWorkGroup}
          activeSessionId={activeSessionId}
          onOpenSession={(id) => setActiveSessionId(id)}
        />
      ) : null}

      {pageTab === 'blacklist' && !isGuest ? (
        <RateConfirmBlacklistPanel authorLabel={authorLabel} />
      ) : null}

      {pageTab === 'reconcile' ? (
        <>
      <ol className="rc-steps" aria-label="진행 단계">
        <li className={step >= 1 ? 'is-active' : ''}>① 파일 업로드</li>
        <li className={step >= 2 ? 'is-active' : ''}>② 열 확인</li>
        <li className={step >= 3 ? 'is-active' : ''}>③ 결과</li>
      </ol>

      <aside className="rc-file-guide" aria-label="파일 준비 안내">
        <p className="rc-file-guide__date">
          오늘 <strong>{todayGuide.label}</strong> → TL·PMS 모두{' '}
          <strong>{todayGuide.label} 체크인</strong>으로 검색·보내기한 파일만 사용하세요.
          날짜가 다른 파일은 함께 올리지 마세요.
        </p>
        <ul className="rc-file-guide__list">
          <li>
            <span>TL-Lincoln RAW</span>
            <code>{tlExampleName}</code>
          </li>
          <li>
            <span>PMS보내기</span>
            <code>{pmsExampleName}</code>
          </li>
        </ul>
      </aside>

      <div className="rc-upload-row">
        <UploadZone
          id="rc-tl-file"
          title="TL-Lincoln RAW"
          hint="예약검색 CSV / Excel"
          exampleName={tlExampleName}
          sheet={tlSheet}
          onFile={(f) => void loadFile(f, 'tl')}
        />
        <UploadZone
          id="rc-pms-file"
          title="PMS보내기"
          hint="Reservation List Excel / CSV"
          exampleName={pmsExampleName}
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
          <p>
            양쪽 파일을 모두 업로드하면 자동으로 대조합니다.
            <br />
            <strong>{todayGuide.label} 체크인</strong> 자료만 올렸는지 확인하세요.
          </p>
        </div>
      ) : null}

      {result && activeSessionId && activeSessionQuery.data ? (
        <p className="rc-banner rc-banner--saved">
          자동 저장됨 · {sessionProgressLabel(activeSessionQuery.data.items)}
          {' · '}
          <button type="button" className="rc-banner__link" onClick={() => setPageTab('history')}>
            이력에서 보기
          </button>
        </p>
      ) : result && createSession.isPending ? (
        <p className="rc-banner">대조 결과를 자동 저장하는 중…</p>
      ) : result && !(isGuest ? guestAuthor.trim() : session.group && session.name) ? (
        <p className="rc-banner">
          {isGuest ? (
            <>
              대조가 끝났습니다. 위쪽 <strong>담당자 이름</strong>을 입력하면 이 결과가 자동으로
              저장됩니다. 저장 후 불일치 건마다 처리 기록을 남길 수 있습니다.
            </>
          ) : (
            <>
              대조가 끝났습니다. <strong>조·담당자</strong>를 선택하면 자동으로 기록이 저장됩니다.
            </>
          )}
        </p>
      ) : result ? (
        <p className="rc-banner">대조가 끝났습니다. 저장이 끝나면 불일치 건마다 처리 기록을 남겨 주세요.</p>
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
              {result.summary.accountCount > 0 ? (
                <span className="rc-pill rc-pill--account">OTA명 {result.summary.accountCount}</span>
              ) : null}
            </div>
          ) : (
            <p className="rc-banner rc-banner--ok">모든 예약이 일치합니다.</p>
          )}

          {blacklistHits.length > 0 ? (
            <p className="rc-banner rc-banner--blacklist">
              ⚠ 블랙리스트 고객 <strong>{blacklistHits.length}</strong>건이 발견되었습니다.{' '}
              <button type="button" className="rc-banner__link" onClick={() => setBlacklistModalOpen(true)}>
                경고 다시 보기
              </button>
            </p>
          ) : null}

          <div className="rc-toolbar">
            <input
              type="search"
              className="rc-toolbar__search"
              placeholder="고객명 · 예약번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rc-view-toggle" role="group" aria-label="결과 보기 방식">
              <button
                type="button"
                className={`rc-view-toggle__btn${resultView === 'table' ? ' is-active' : ''}`}
                onClick={() => setResultView('table')}
              >
                테이블
              </button>
              <button
                type="button"
                className={`rc-view-toggle__btn${resultView === 'cards' ? ' is-active' : ''}`}
                onClick={() => setResultView('cards')}
              >
                카드
              </button>
            </div>
            <span className="rc-toolbar__count">
              불일치 {filteredErrors.length} · 일치 {filteredMatches.length}
            </span>
          </div>

          {filteredErrors.length > 0 ? (
            <section className="rc-section">
              <h3 className="rc-section__title">수정 필요 ({filteredErrors.length})</h3>
              {resultView === 'table' ? (
                <ReconcileErrorsTable
                  records={filteredErrors}
                  itemsByOta={activeSessionId ? itemsByOta : undefined}
                  blacklistHitsByOta={blacklistHitsByOta}
                  renderResolution={
                    activeSessionId
                      ? (item) => (
                          <RateConfirmResolutionForm
                            item={item}
                            disabled={isGuest ? !guestAuthor.trim() : !session.name}
                            onSave={async (input) => {
                              if (isGuest) {
                                if (!guestAuthor.trim() || !activeSessionId) return;
                              } else if (!requireSession('처리 기록') || !activeSessionId) {
                                return;
                              }
                              await saveResolution.mutateAsync({
                                itemId: item.id,
                                sessionId: activeSessionId,
                                input,
                                author: isGuest ? guestAuthor.trim() : authorLabel,
                                workGroup: isGuest ? guestWorkGroup : session.group,
                              });
                              showToast('처리 기록을 저장했습니다.');
                            }}
                          />
                        )
                      : undefined
                  }
                />
              ) : (
                <div className="rc-card-list">
                  {filteredErrors.map((record) => (
                    <ReconcileErrorCard
                      key={record.ota}
                      record={record}
                      blacklistHits={blacklistHitsByOta.get(record.ota)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : result.summary.errorCount > 0 ? (
            <p className="rc-empty">검색 결과가 없습니다.</p>
          ) : null}

          {filteredMatches.length > 0 ? (
            <details className="rc-matches" open={resultView === 'table'}>
              <summary>일치 예약 ({filteredMatches.length})</summary>
              {resultView === 'table' ? (
                <ReconcileMatchesTable
                  records={filteredMatches}
                  blacklistHitsByOta={blacklistHitsByOta}
                />
              ) : (
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
              )}
            </details>
          ) : null}
        </div>
      ) : tlSheet && pmsSheet ? (
        <p className="rc-status">예약번호·객실료 열을 선택하면 대조가 시작됩니다.</p>
      ) : null}
        </>
      ) : null}

      {blacklistModalOpen && blacklistHits.length ? (
        <RateConfirmBlacklistAlertModal hits={blacklistHits} onClose={() => setBlacklistModalOpen(false)} />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
