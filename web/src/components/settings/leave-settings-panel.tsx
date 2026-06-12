'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addLeaveBlockedDate,
  fetchLeaveBlockedDates,
  fetchLeavePolicy,
  removeLeaveBlockedDate,
  saveLeavePolicy,
} from '@/lib/leave/policy';
import type { LeavePolicy } from '@/lib/leave/types';

type LeaveSettingsPanelProps = {
  onSaved: (message: string) => void;
};

export function LeaveSettingsPanel({ onSaved }: LeaveSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState<LeavePolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [blockMonth, setBlockMonth] = useState(12);
  const [blockDay, setBlockDay] = useState(25);
  const [blockLabel, setBlockLabel] = useState('');

  const { data: blocked = [], isLoading } = useQuery({
    queryKey: ['leave-blocked-dates'],
    queryFn: () => fetchLeaveBlockedDates(),
  });

  useEffect(() => {
    void fetchLeavePolicy().then(setPolicy);
  }, []);

  async function handleSavePolicy() {
    if (!policy) return;
    setSaving(true);
    try {
      await saveLeavePolicy(policy);
      void queryClient.invalidateQueries({ queryKey: ['leave-policy'] });
      onSaved('휴무 규칙이 저장되었습니다.');
    } catch (caught) {
      onSaved(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlocked() {
    if (!blockLabel.trim()) {
      onSaved('차단일 이름을 입력해 주세요.');
      return;
    }
    try {
      await addLeaveBlockedDate({
        block_month: blockMonth,
        block_day: blockDay,
        label: blockLabel.trim(),
      });
      setBlockLabel('');
      void queryClient.invalidateQueries({ queryKey: ['leave-blocked-dates'] });
      onSaved('신청 불가일이 추가되었습니다.');
    } catch (caught) {
      onSaved(caught instanceof Error ? caught.message : '추가에 실패했습니다.');
    }
  }

  if (!policy || isLoading) {
    return <p className="empty-state">불러오는 중…</p>;
  }

  return (
    <>
      <article className="schedule-panel">
        <div className="schedule-panel__header">
          <div>
            <h3>휴무 신청 규칙</h3>
            <p>직원 휴무 신청 한도와 신청 기간을 설정합니다.</p>
          </div>
        </div>
        <div className="form-grid" style={{ padding: '0 1rem 1rem' }}>
          <label className="field">
            <span>월 최대 휴무 (일/인)</span>
            <input
              type="number"
              min={1}
              max={31}
              value={policy.max_days_per_month}
              onChange={(event) =>
                setPolicy({ ...policy, max_days_per_month: Number(event.target.value) || 1 })
              }
            />
          </label>
          <label className="field">
            <span>하루 최대 휴무 (명)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={policy.max_staff_per_day}
              onChange={(event) =>
                setPolicy({ ...policy, max_staff_per_day: Number(event.target.value) || 1 })
              }
            />
          </label>
          <label className="field">
            <span>신청 대상 (몇 달 뒤)</span>
            <input
              type="number"
              min={0}
              max={6}
              value={policy.apply_month_offset}
              onChange={(event) =>
                setPolicy({ ...policy, apply_month_offset: Number(event.target.value) || 0 })
              }
            />
            <small style={{ color: 'var(--text-muted)' }}>1 = 다음 달 휴무 신청</small>
          </label>
          <label className="field">
            <span>신청 시작일 (매월)</span>
            <input
              type="number"
              min={1}
              max={28}
              value={policy.application_open_day}
              onChange={(event) =>
                setPolicy({ ...policy, application_open_day: Number(event.target.value) || 1 })
              }
            />
          </label>
          <label className="field">
            <span>신청 마감일 (매월)</span>
            <input
              type="number"
              min={1}
              max={31}
              value={policy.application_close_day}
              onChange={(event) =>
                setPolicy({ ...policy, application_close_day: Number(event.target.value) || 1 })
              }
            />
          </label>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSavePolicy}>
            {saving ? '저장 중…' : '규칙 저장'}
          </button>
        </div>
      </article>

      <article className="schedule-panel">
        <div className="schedule-panel__header">
          <div>
            <h3>신청 불가일</h3>
            <p>매년 반복되는 날짜 (크리스마스·연말 등)</p>
          </div>
        </div>
        <div className="form-grid form-grid--compact" style={{ padding: '0 1rem 1rem' }}>
          <label className="field">
            <span>월</span>
            <input
              type="number"
              min={1}
              max={12}
              value={blockMonth}
              onChange={(event) => setBlockMonth(Number(event.target.value) || 1)}
            />
          </label>
          <label className="field">
            <span>일</span>
            <input
              type="number"
              min={1}
              max={31}
              value={blockDay}
              onChange={(event) => setBlockDay(Number(event.target.value) || 1)}
            />
          </label>
          <label className="field field--full">
            <span>이름</span>
            <input
              value={blockLabel}
              onChange={(event) => setBlockLabel(event.target.value)}
              placeholder="예: 추석 연휴"
            />
          </label>
          <button type="button" className="btn btn--ghost" onClick={handleAddBlocked}>
            + 불가일 추가
          </button>
        </div>
        <ul className="leave-blocked-list">
          {blocked.map((item) => (
            <li key={item.id}>
              <span>
                {item.block_month}/{item.block_day} — {item.label}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={async () => {
                  await removeLeaveBlockedDate(item.id);
                  void queryClient.invalidateQueries({ queryKey: ['leave-blocked-dates'] });
                  onSaved('삭제했습니다.');
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}
