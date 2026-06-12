'use client';

import { useEffect, useState } from 'react';
import { useNightRegister } from '@/lib/night-register/use-night-register';
import type { NightRegisterInput } from '@/lib/night-register/types';

type NightRegisterPanelProps = {
  workDate: string;
  authorLabel: string;
  requireSession: (action: string) => boolean;
  onSaved?: (message: string) => void;
};

export function NightRegisterPanel({ workDate, authorLabel, requireSession, onSaved }: NightRegisterPanelProps) {
  const { register, isLoading, saveRegister } = useNightRegister(workDate, 'C');
  const [form, setForm] = useState({
    cash_memo: '',
    card_memo: '',
    seal_notes: '',
    handover_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!register) {
      setForm({ cash_memo: '', card_memo: '', seal_notes: '', handover_notes: '' });
      return;
    }
    setForm({
      cash_memo: register.cash_memo,
      card_memo: register.card_memo,
      seal_notes: register.seal_notes,
      handover_notes: register.handover_notes,
    });
  }, [register]);

  async function handleSave() {
    if (!requireSession('야간 마감 메모 저장')) return;
    setSaving(true);
    try {
      const payload: NightRegisterInput = {
        work_date: workDate,
        shift: 'C',
        ...form,
        author: register?.author || authorLabel,
        updated_by: authorLabel,
      };
      await saveRegister.mutateAsync(payload);
      onSaved?.('야간 마감·레지스터 메모를 저장했습니다.');
    } catch (caught) {
      onSaved?.(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="night-register-panel">
      <div className="night-register-panel__head">
        <div>
          <h3>C조 야간 마감 · 레지스터</h3>
          <p>현금·카드 마감, 봉인·인수 메모를 Excel Shift Check List와 함께 기록합니다.</p>
        </div>
        {register?.updated_by ? (
          <span className="night-register-panel__meta">
            {register.updated_by} · {new Date(register.updated_at).toLocaleString('ko-KR')}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : (
        <div className="night-register-panel__grid">
          <label className="field field--full">
            <span>현금 마감 (Cashier Detail / 현금)</span>
            <textarea
              rows={3}
              value={form.cash_memo}
              onChange={(e) => setForm({ ...form, cash_memo: e.target.value })}
              placeholder="현금 마감 금액·차이·특이사항"
            />
          </label>
          <label className="field field--full">
            <span>카드·기타 결제 마감</span>
            <textarea
              rows={3}
              value={form.card_memo}
              onChange={(e) => setForm({ ...form, card_memo: e.target.value })}
              placeholder="카드 승인·미수·Deposit 등"
            />
          </label>
          <label className="field field--full">
            <span>봉인·레지스터 확인</span>
            <textarea
              rows={2}
              value={form.seal_notes}
              onChange={(e) => setForm({ ...form, seal_notes: e.target.value })}
              placeholder="Cashier Detail Report 봉인, 레지스터 백업 등"
            />
          </label>
          <label className="field field--full">
            <span>다음 교대 인수 메모</span>
            <textarea
              rows={2}
              value={form.handover_notes}
              onChange={(e) => setForm({ ...form, handover_notes: e.target.value })}
              placeholder="A조에 넘길 미완료·특이사항"
            />
          </label>
        </div>
      )}
      <div className="night-register-panel__actions">
        <button type="button" className="btn btn--primary" disabled={saving || isLoading} onClick={() => void handleSave()}>
          {saving ? '저장 중…' : '마감 메모 저장'}
        </button>
      </div>
    </section>
  );
}
