'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStatsData, formatDurationMinutes, formatPercent } from '@/lib/stats/api';
import type { StatsPeriod } from '@/lib/stats/types';

function maxCount(values: number[]) {
  return Math.max(1, ...values);
}

function StatBarChart({
  items,
  valueKey,
  labelKey,
  unit = '건',
}: {
  items: { [key: string]: string | number }[];
  valueKey: string;
  labelKey: string;
  unit?: string;
}) {
  const max = maxCount(items.map((item) => Number(item[valueKey]) || 0));

  return (
    <div className="stats-bars">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = Math.round((value / max) * 100);
        return (
          <div key={String(item[labelKey])} className="stats-bar-row">
            <span className="stats-bar-row__label">{item[labelKey]}</span>
            <div className="stats-bar-row__track">
              <div className="stats-bar-row__fill" style={{ width: `${width}%` }} />
            </div>
            <span className="stats-bar-row__value">
              {value.toLocaleString()}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniDayChart({
  items,
  valueKey,
}: {
  items: { label: string; date: string; [key: string]: string | number }[];
  valueKey: string;
}) {
  const max = maxCount(items.map((item) => Number(item[valueKey]) || 0));

  return (
    <div className="stats-mini-chart">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const height = Math.max(4, Math.round((value / max) * 100));
        return (
          <div key={item.date} className="stats-mini-chart__col" title={`${item.label}: ${value}`}>
            <div className="stats-mini-chart__bar" style={{ height: `${height}%` }} />
            <span className="stats-mini-chart__label">{item.label.replace(/\(.*\)/, '')}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatsPageClient() {
  const [period, setPeriod] = useState<StatsPeriod>('week');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stats', period],
    queryFn: () => fetchStatsData(period),
  });

  return (
    <section className="stats-page">
      <div className="stats-page__header">
        <div>
          <h2>주간 · 월간 통계</h2>
          <p>교대별 인수인계, 긴급 처리 시간, 어메니티 소모 추이를 확인합니다.</p>
        </div>
        <div className="segmented-control segmented-control--compact" role="group" aria-label="기간 선택">
          <button
            type="button"
            className={`segmented-control__btn${period === 'week' ? ' is-active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            주간 (7일)
          </button>
          <button
            type="button"
            className={`segmented-control__btn${period === 'month' ? ' is-active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            월간 (30일)
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">통계를 불러오는 중…</p>
      ) : error ? (
        <p className="empty-state" style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.25)' }}>
          통계를 불러오지 못했습니다.
          <br />
          <button type="button" className="btn btn--ghost btn--small" style={{ marginTop: '0.75rem' }} onClick={() => void refetch()}>
            다시 시도
          </button>
        </p>
      ) : data ? (
        <>
          <p className="stats-page__range">{data.rangeLabel}</p>

          <div className="stats-summary stats-summary--wide">
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">인수인계 등록</p>
              <p className="stats-summary-card__value">
                {data.summary.totalHandovers.toLocaleString()}
                <span>건</span>
              </p>
            </article>
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">긴급 평균 처리</p>
              <p className="stats-summary-card__value">
                {formatDurationMinutes(data.summary.urgentAvgMinutes)}
              </p>
              <p className="stats-summary-card__sub">
                긴급 {data.summary.urgentCount}건 중 {data.summary.urgentResolvedCount}건 처리됨
              </p>
            </article>
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">체크리스트 완료율</p>
              <p className="stats-summary-card__value">{formatPercent(data.summary.checklistCompletionRate)}</p>
              <p className="stats-summary-card__sub">체크 {data.summary.checklistCompletions.toLocaleString()}회</p>
            </article>
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">할일 완료율</p>
              <p className="stats-summary-card__value">{formatPercent(data.summary.todoCompletionRate)}</p>
              <p className="stats-summary-card__sub">
                {data.summary.todoCompletedCount}/{data.summary.todoDueCount}건 완료
              </p>
            </article>
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">리뷰 후속 처리</p>
              <p className="stats-summary-card__value">{formatPercent(data.summary.reviewFollowUpRate)}</p>
              <p className="stats-summary-card__sub">
                {data.summary.reviewFollowUpCount}/{data.summary.reviewCount}건 인수인계 연결
              </p>
            </article>
            <article className="stats-summary-card">
              <p className="stats-summary-card__label">어메니티 출고</p>
              <p className="stats-summary-card__value">
                {data.summary.amenityOutboundTotal.toLocaleString()}
                <span>개</span>
              </p>
              <p className="stats-summary-card__sub">출고 {data.summary.amenityTransactionCount}회</p>
            </article>
          </div>

          <div className="stats-grid">
            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>교대별 인수인계</h3>
                  <p>기간 내 새로 등록된 인수인계 건수</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <StatBarChart
                  items={data.handoversByShift}
                  labelKey="shift"
                  valueKey="count"
                />
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>일별 인수인계 추이</h3>
                  <p>날짜별 등록 건수</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <MiniDayChart items={data.handoversByDay} valueKey="count" />
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>어메니티 소모 (품목별)</h3>
                  <p>출고 수량 상위 품목</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                {!data.amenityByItem.length ? (
                  <p className="empty-state">출고 기록이 없습니다.</p>
                ) : (
                  <StatBarChart
                    items={data.amenityByItem.slice(0, 8).map((item) => ({
                      label: item.name,
                      count: item.totalItems,
                    }))}
                    labelKey="label"
                    valueKey="count"
                    unit="개"
                  />
                )}
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>어메니티 일별 출고</h3>
                  <p>날짜별 총 출고 개수</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <MiniDayChart items={data.amenityByDay} valueKey="totalItems" />
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>교대별 긴급 확인</h3>
                  <p>기간 내 긴급 카드 확인 건수</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <StatBarChart items={data.urgentAcksByShift} labelKey="shift" valueKey="count" />
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>교대별 어메니티 출고</h3>
                  <p>출고 기록 작성자 교대 기준</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <StatBarChart items={data.amenityOutboundByShift} labelKey="shift" valueKey="count" unit="회" />
              </div>
            </article>

            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>HK EB 추가·제거 추이</h3>
                  <p>하우스키핑 보고서 EB 조치 건수 (일별)</p>
                </div>
              </div>
              <div className="schedule-panel__body">
                <MiniDayChart items={data.hkEbByDay} valueKey="count" />
              </div>
            </article>
          </div>

          <p className="stats-page__note">
            긴급 처리 시간은 등록 후 <strong>첫 긴급 확인</strong> 또는 <strong>완료 이동</strong> 중 더 빠른
            시점까지의 평균입니다. 체크리스트 완료율은 활성 항목 × 기간 일수 × 3교대 대비 체크 횟수입니다.
          </p>
        </>
      ) : null}
    </section>
  );
}
