'use client';

import { useEffect, useState } from 'react';
import { fetchHotelSettings, saveHotelAutoArchiveDays } from '@/lib/hotel-settings';
import { fetchTaxiWhatsAppRecipient, saveTaxiWhatsAppRecipient } from '@/lib/taxi/settings';

type HotelOpsSettingsPanelProps = {
  onSaved: (message: string) => void;
};

export function HotelOpsSettingsPanel({ onSaved }: HotelOpsSettingsPanelProps) {
  const [days, setDays] = useState(1);
  const [whatsApp, setWhatsApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchHotelSettings(), fetchTaxiWhatsAppRecipient()])
      .then(([s, wa]) => {
        setDays(s.auto_archive_done_days);
        setWhatsApp(wa);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([saveHotelAutoArchiveDays(days), saveTaxiWhatsAppRecipient(whatsApp)]);
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
          <p>완료 카드 보관 · 택시 WhatsApp · 알림</p>
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
            0 = 사용 안 함. 기본 1일(약 24시간). 완료 후 N일이 지난 카드를 자동으로 보관함으로
            이동합니다. (접속 시 하루 1회 실행)
          </small>
        </label>
        <label className="field field--full">
          <span>택시 WhatsApp 수신 번호</span>
          <input
            value={whatsApp}
            onChange={(e) => setWhatsApp(e.target.value)}
            placeholder="821012345678 (국가코드 포함, + 제외)"
          />
          <small style={{ color: 'var(--text-muted)' }}>
            신규 예약·WhatsApp 버튼 클릭 시 wa.me로 메시지를 보냅니다.
          </small>
        </label>
        <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </article>
  );
}
