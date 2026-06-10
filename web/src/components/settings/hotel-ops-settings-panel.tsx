'use client';

import { useEffect, useState } from 'react';
import { fetchHotelSettings, saveHotelAutoArchiveDays } from '@/lib/hotel-settings';

type HotelOpsSettingsPanelProps = {
  onSaved: (message: string) => void;
};

export function HotelOpsSettingsPanel({ onSaved }: HotelOpsSettingsPanelProps) {
  const [days, setDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHotelSettings()
      .then((s) => setDays(s.auto_archive_done_days))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveHotelAutoArchiveDays(days);
      onSaved('운영 설정이 저장되었습니다.');
    } catch (caught) {
      onSaved(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="empty-state">불러오는 중…</p>;

  return (
    <article className="schedule-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>운영 자동화</h3>
          <p>완료 카드 보관 · 알림 기준</p>
        </div>
      </div>
      <div className="form-grid" style={{ padding: '0 1rem 1rem' }}>
        <label className="field field--full">
          <span>완료 보관 자동화 (일)</span>
          <input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))}
          />
          <small style={{ color: 'var(--text-muted)' }}>
            0 = 사용 안 함. 완료 후 N일이 지난 카드를 자동으로 보관함으로 이동합니다. (하루 1회 실행)
          </small>
        </label>
        <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </article>
  );
}
