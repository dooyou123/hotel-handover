'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { ERROR_LABELS, type ReconcileError, type ReconcileRecord } from '@/lib/rate-confirm/compare-engine';
import { RESOLUTION_STATUS_LABELS, type RateConfirmItem } from '@/lib/rate-confirm/history-types';
import { getRecordRateMeta } from '@/lib/rate-confirm/record-meta';

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

function CopyOtaButton({ ota }: { ota: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(ota);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button type="button" className="rc-table__ota" onClick={() => void copy()}>
      {copied ? '복사됨' : ota}
    </button>
  );
}

function ErrorTags({ errors }: { errors: ReconcileError[] }) {
  return (
    <div className="rc-table__tags">
      {errors.map((err) => (
        <span key={err} className={`rc-tag rc-tag--${tagClass(err)}`}>
          {ERROR_LABELS[err]}
        </span>
      ))}
    </div>
  );
}

type ReconcileErrorsTableProps = {
  records: ReconcileRecord[];
  itemsByOta?: Map<string, RateConfirmItem>;
  renderResolution?: (item: RateConfirmItem) => ReactNode;
};

export function ReconcileErrorsTable({
  records,
  itemsByOta,
  renderResolution,
}: ReconcileErrorsTableProps) {
  const [expandedOta, setExpandedOta] = useState<string | null>(null);

  if (!records.length) return null;

  const hasResolution = Boolean(itemsByOta && renderResolution);

  return (
    <div className="rc-table-wrap">
      <table className="rc-table rc-table--errors">
        <thead>
          <tr>
            <th scope="col">예약번호</th>
            <th scope="col">고객명</th>
            <th scope="col">불일치</th>
            <th scope="col" className="rc-table__num">
              TL 객실료
            </th>
            <th scope="col" className="rc-table__num">
              PMS 객실료
            </th>
            <th scope="col" className="rc-table__num">
              차이
            </th>
            <th scope="col" className="rc-table__num">
              PMS 조정
            </th>
            {hasResolution ? <th scope="col">처리</th> : null}
            <th scope="col" className="rc-table__action-col" aria-label="상세" />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const meta = getRecordRateMeta(record);
            const expanded = expandedOta === record.ota;
            const tl = record.tl;
            const pms = record.pms;
            const item = itemsByOta?.get(record.ota);

            return (
              <Fragment key={record.ota}>
                <tr
                  className={`rc-table__row${meta.rateMismatch ? ' rc-table__row--rate-bad' : ''}${
                    item?.resolution_status === 'resolved' ? ' rc-table__row--resolved' : ''
                  }`}
                >
                  <td>
                    <CopyOtaButton ota={record.ota} />
                  </td>
                  <td className="rc-table__guest">{record.guestName}</td>
                  <td>
                    <ErrorTags errors={record.errors} />
                  </td>
                  <td className="rc-table__num">
                    {meta.missing ? (
                      <span className="rc-table__missing">미등록</span>
                    ) : (
                      tl?.rateDisplay ?? '—'
                    )}
                    {tl && tl.count > 1 ? (
                      <span className="rc-table__hint"> ({tl.count}건)</span>
                    ) : null}
                  </td>
                  <td className="rc-table__num">
                    {meta.missing ? (
                      <span className="rc-table__missing">미등록</span>
                    ) : (
                      pms?.rateDisplay ?? '—'
                    )}
                    {pms && pms.count > 1 ? (
                      <span className="rc-table__hint"> ({pms.count}건)</span>
                    ) : null}
                  </td>
                  <td className="rc-table__num">
                    {meta.delta != null ? (
                      <span
                        className={`rc-table__delta${meta.delta > 0 ? ' is-high' : meta.delta < 0 ? ' is-low' : ''}`}
                      >
                        {meta.delta > 0 ? '+' : ''}
                        {meta.delta.toLocaleString()}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="rc-table__num">
                    {meta.pmsAdjust != null ? (
                      <strong className="rc-table__adjust">
                        {meta.pmsAdjust > 0 ? '+' : ''}
                        {meta.pmsAdjust.toLocaleString()}
                      </strong>
                    ) : (
                      '—'
                    )}
                  </td>
                  {hasResolution && item ? (
                    <td>
                      <span
                        className={`rc-resolution__badge rc-resolution__badge--${item.resolution_status}`}
                      >
                        {RESOLUTION_STATUS_LABELS[item.resolution_status]}
                      </span>
                    </td>
                  ) : hasResolution ? (
                    <td>—</td>
                  ) : null}
                  <td className="rc-table__action-col">
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      aria-expanded={expanded}
                      onClick={() => setExpandedOta(expanded ? null : record.ota)}
                    >
                      {expanded ? '닫기' : hasResolution ? '처리' : '상세'}
                    </button>
                  </td>
                </tr>
                {expanded ? (
                  <tr className="rc-table__detail-row">
                    <td colSpan={hasResolution ? 9 : 8}>
                      <dl className="rc-table__detail">
                        <div>
                          <dt>상태</dt>
                          <dd>
                            TL {tl?.status || '—'} → PMS{' '}
                            {meta.missing ? '미등록' : pms?.status || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>체크인</dt>
                          <dd>
                            TL {tl?.ciDate || '—'} → PMS{' '}
                            {meta.missing ? '미등록' : pms?.ciDate || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>OTA명</dt>
                          <dd>
                            TL {tl?.account || '—'} → PMS{' '}
                            {meta.missing ? '미등록' : pms?.account || '—'}
                          </dd>
                        </div>
                      </dl>
                      {item && renderResolution ? renderResolution(item) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ReconcileMatchesTableProps = {
  records: ReconcileRecord[];
};

export function ReconcileMatchesTable({ records }: ReconcileMatchesTableProps) {
  if (!records.length) return null;

  return (
    <div className="rc-table-wrap rc-table-wrap--matches">
      <table className="rc-table rc-table--matches">
        <thead>
          <tr>
            <th scope="col">예약번호</th>
            <th scope="col">고객명</th>
            <th scope="col">OTA명</th>
            <th scope="col" className="rc-table__num">
              객실료
            </th>
            <th scope="col">체크인</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.ota} className="rc-table__row rc-table__row--ok">
              <td>
                <CopyOtaButton ota={record.ota} />
              </td>
              <td className="rc-table__guest">{record.guestName}</td>
              <td className="rc-table__ota-name">{record.tl?.account || '—'}</td>
              <td className="rc-table__num rc-table__match-rate">
                {record.tl?.rateDisplay ?? '—'}원
              </td>
              <td>{record.tl?.ciDate || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
