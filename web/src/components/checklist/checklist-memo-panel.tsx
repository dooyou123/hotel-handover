'use client';

import { useEffect, useState } from 'react';
import { useChecklistMemo } from '@/lib/checklist/use-checklist-memo';

type ChecklistMemoPanelProps = {
  workDate: string;
  shift: string;
  workGroup: string;
  authorLabel: string;
  requireSession: (action: string) => boolean;
  onSaved?: (message: string) => void;
};

export function ChecklistMemoPanel({
  workDate,
  shift,
  workGroup,
  authorLabel,
  requireSession,
  onSaved,
}: ChecklistMemoPanelProps) {
  const { memo, isLoading, saveMemo } = useChecklistMemo(workDate, shift, workGroup);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = text !== (memo?.memo ?? '');

  useEffect(() => {
    setText(memo?.memo ?? '');
  }, [memo?.memo, workDate, shift, workGroup]);

  async function handleSave() {
    if (!requireSession('체크리스트 메모 저장')) return;
    setSaving(true);
    try {
      await saveMemo.mutateAsync({
        work_date: workDate,
        shift,
        work_group: workGroup,
        memo: text,
        updated_by: authorLabel,
      });
      onSaved?.('체크리스트 메모를 저장했습니다.');
    } catch (caught) {
      onSaved?.(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="checklist-memo-panel">
      <div className="checklist-memo-panel__head">
        <div>
          <h3>수기 메모</h3>
          <p>종이 체크리스트에 펜으로 적던 특이사항·숫자·인수 내용을 여기에 남깁니다.</p>
        </div>
        {memo?.updated_by ? (
          <span className="checklist-memo-panel__meta">
            {memo.updated_by} · {new Date(memo.updated_at).toLocaleString('ko-KR')}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : (
        <textarea
            className="checklist-memo-panel__textarea"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="체크리스트 수기 메모"
            placeholder={`예) 1207 늦은 체크아웃 14시\n현금 마감 차이 3,000원\nA조 인수: 미니바 재고 확인 필요`}
          />
      )}
      <div className="checklist-memo-panel__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={saving || isLoading || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? '저장 중…' : '메모 저장'}
        </button>
        {dirty ? <span className="checklist-memo-panel__dirty">저장되지 않은 내용이 있습니다</span> : null}
      </div>
    </section>
  );
}
