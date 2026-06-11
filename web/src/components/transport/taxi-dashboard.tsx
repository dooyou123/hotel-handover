'use client';

import { useRef } from 'react';
import {
  computeTaxiDashboard,
  dashboardPeriodRange,
  type TaxiDashboardPeriod,
} from '@/lib/taxi/dashboard';
import { formatPickupCardDate } from '@/lib/taxi/format';
import type { TransportBooking } from '@/lib/transport/types';

type TaxiDashboardProps = {
  bookings: TransportBooking[];
  today: string;
  fromDate: string;
  toDate: string;
  onPeriodChange: (from: string, to: string) => void;
  onSwitchToList?: () => void;
};

const PERIOD_OPTIONS: { value: TaxiDashboardPeriod; label: string }[] = [
  { value: 'month', label: '이번 달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: 'year', label: '올해' },
];

function BarRow({
  label,
  value,
  max,
  sub,
  displayValue,
}: {
  label: string;
  value: number;
  max: number;
  sub?: string;
  displayValue?: string;
}) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="taxi-dash__bar-row">
      <span className="taxi-dash__bar-label" title={label}>
        {label}
        {sub ? <small className="taxi-dash__bar-sub">{sub}</small> : null}
      </span>
      <div className="taxi-dash__bar-track">
        <div className="taxi-dash__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="taxi-dash__bar-count">{displayValue ?? value}</span>
    </div>
  );
}

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export function TaxiDashboard({
  bookings,
  today,
  fromDate,
  toDate,
  onPeriodChange,
  onSwitchToList,
}: TaxiDashboardProps) {
  const periodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePeriodChange(period: TaxiDashboardPeriod) {
    if (periodTimer.current) clearTimeout(periodTimer.current);
    periodTimer.current = setTimeout(() => {
      const range = dashboardPeriodRange(period, today);
      onPeriodChange(range.from, range.to);
    }, 250);
  }

  const stats = computeTaxiDashboard(bookings, today);
  const maxMonthCount = Math.max(1, ...stats.byMonth.map((m) => m.count));
  const maxMonthRevenue = Math.max(1, ...stats.byMonth.map((m) => m.revenue));
  const maxDest = Math.max(1, ...stats.byDestination.map((d) => d.count));
  const maxSlot = Math.max(1, ...stats.byTimeSlot.map((s) => s.count));
  const maxStaff = Math.max(1, ...stats.byStaff.map((s) => s.count));

  const activePeriod =
    PERIOD_OPTIONS.find((opt) => {
      const range = dashboardPeriodRange(opt.value, today);
      return range.from === fromDate;
    })?.value ?? null;

  return (
    <section className="taxi-dash">
      <div className="taxi-dash__toolbar">
        <div className="taxi-dash__period">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`taxi-dash__period-btn${activePeriod === opt.value ? ' is-active' : ''}`}
              onClick={() => schedulePeriodChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="taxi-dash__range-meta">
          {fromDate} ~ {toDate} · {bookings.length}건
        </p>
      </div>

      <div className="taxi-dash__cards taxi-dash__cards--wide">
        <article className="taxi-dash__card">
          <span>총 예약</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="taxi-dash__card taxi-dash__card--blue">
          <span>진행중</span>
          <strong>{stats.pending}</strong>
        </article>
        <article className="taxi-dash__card taxi-dash__card--green">
          <span>완료</span>
          <strong>{stats.completed}</strong>
        </article>
        <article className="taxi-dash__card taxi-dash__card--red">
          <span>취소</span>
          <strong>{stats.cancelled}</strong>
        </article>
        <article className="taxi-dash__card taxi-dash__card--gold">
          <span>수입 (완료)</span>
          <strong>{formatWon(stats.revenue)}</strong>
        </article>
        <article className="taxi-dash__card">
          <span>평균 요금</span>
          <strong>{stats.completed ? formatWon(stats.avgFare) : '—'}</strong>
        </article>
      </div>

      <div className="taxi-dash__rates">
        <span>
          완료율 <strong>{stats.completionRate}%</strong>
        </span>
        <span>
          취소율 <strong>{stats.cancelRate}%</strong>
        </span>
        <span>
          점보 비율 <strong>{stats.jumboShare}%</strong>
        </span>
      </div>

      <div className="taxi-dash__split">
        <article className="taxi-dash__panel taxi-dash__panel--today">
          <h3>오늘 ({today})</h3>
          <dl className="taxi-dash__today-grid">
            <div>
              <dt>예약</dt>
              <dd>{stats.today.total}</dd>
            </div>
            <div>
              <dt>진행중</dt>
              <dd>{stats.today.pending}</dd>
            </div>
            <div>
              <dt>완료</dt>
              <dd>{stats.today.completed}</dd>
            </div>
            <div>
              <dt>수입</dt>
              <dd>{formatWon(stats.today.revenue)}</dd>
            </div>
          </dl>
        </article>

        <article className="taxi-dash__panel">
          <div className="taxi-dash__panel-head">
            <h3>다가오는 픽업</h3>
            {onSwitchToList ? (
              <button type="button" className="taxi-dash__link" onClick={onSwitchToList}>
                목록 보기
              </button>
            ) : null}
          </div>
          {stats.upcoming.length ? (
            <ul className="taxi-dash__upcoming">
              {stats.upcoming.map((b) => (
                <li key={b.id} className="taxi-dash__upcoming-row">
                  <span className="taxi-dash__upcoming-time">{b.pickup_time.slice(0, 5)}</span>
                  <span className="taxi-dash__upcoming-main">
                    <strong>
                      {b.room_number ? `${b.room_number}호` : '—'}{' '}
                      {b.booker_name || b.guest_name}
                    </strong>
                    <small>
                      {formatPickupCardDate(b)} · {b.destination || '—'}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">예정된 픽업이 없습니다.</p>
          )}
        </article>
      </div>

      <div className="taxi-dash__charts">
        <article className="taxi-dash__panel taxi-dash__panel--wide">
          <h3>월별 완료 · 수입</h3>
          {stats.byMonth.length ? (
            stats.byMonth.map((row) => (
              <div key={row.month} className="taxi-dash__month-row">
                <span className="taxi-dash__month-label">{row.label}</span>
                <BarRow label="완료" value={row.count} max={maxMonthCount} />
                <BarRow
                  label="수입"
                  value={row.revenue}
                  max={maxMonthRevenue}
                  displayValue={formatWon(row.revenue)}
                />
              </div>
            ))
          ) : (
            <p className="empty-state">완료 예약 데이터가 없습니다.</p>
          )}
        </article>

        <article className="taxi-dash__panel">
          <h3>인기 목적지</h3>
          {stats.byDestination.length ? (
            stats.byDestination.slice(0, 8).map((row) => (
              <BarRow
                key={row.destination}
                label={row.destination}
                value={row.count}
                max={maxDest}
                sub={`완료 ${row.completed} · ${formatWon(row.revenue)}`}
              />
            ))
          ) : (
            <p className="empty-state">목적지 데이터가 없습니다.</p>
          )}
        </article>

        <article className="taxi-dash__panel">
          <h3>픽업 시간대</h3>
          {stats.byTimeSlot.map((row) => (
            <BarRow key={row.slot} label={row.label} value={row.count} max={maxSlot} />
          ))}
        </article>

        <article className="taxi-dash__panel">
          <h3>차량 유형</h3>
          {stats.byVehicleType.map((row) => {
            const max = Math.max(1, ...stats.byVehicleType.map((v) => v.count));
            return (
              <BarRow
                key={row.vehicleType}
                label={row.vehicleType}
                value={row.count}
                max={max}
                sub={formatWon(row.revenue)}
              />
            );
          })}
        </article>

        <article className="taxi-dash__panel">
          <h3>등록 직원</h3>
          {stats.byStaff.length ? (
            stats.byStaff.map((row) => (
              <BarRow key={row.name} label={row.name} value={row.count} max={maxStaff} />
            ))
          ) : (
            <p className="empty-state">직원 데이터가 없습니다.</p>
          )}
        </article>

        <article className="taxi-dash__panel taxi-dash__panel--wide">
          <h3>목적지 상세</h3>
          {stats.byDestination.length ? (
            <div className="taxi-dash__table-wrap">
              <table className="taxi-dash__table">
                <thead>
                  <tr>
                    <th>목적지</th>
                    <th>예약</th>
                    <th>완료</th>
                    <th>수입</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDestination.map((row) => (
                    <tr key={row.destination}>
                      <td>{row.destination}</td>
                      <td>{row.count}</td>
                      <td>{row.completed}</td>
                      <td>{formatWon(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">데이터가 없습니다.</p>
          )}
        </article>
      </div>
    </section>
  );
}
