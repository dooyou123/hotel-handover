'use client';

import { useState } from 'react';
import {
  MAX_CHECKLIST_ITEMS,
  checklistProgress,
  toggleChecklistItem,
} from '@/lib/handover/checklist';
import type { ChecklistItem } from '@/lib/handover/types';

type CardChecklistEditorProps = {
  items: ChecklistItem[];
  /** 체크 완료 시 done_by에 기록할 이름 */
  staffName: string;
  onChange: (items: ChecklistItem[]) => void;
};

function doneMeta(item: ChecklistItem): string {
  if (!item.done) return '';
  const parts: string[] = [];
  if (item.done_by) parts.push(item.done_by);
  if (item.done_at) {
    const date = new Date(item.done_at);
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }));
    }
  }
  return parts.join(' · ');
}

export function CardChecklistEditor({ items, staffName, onChange }: CardChecklistEditorProps) {
  const [draft, setDraft] = useState('');
  const progress = checklistProgress(items);

  function addItem() {
    const text = draft.trim();
    if (!text || items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([...items, { id: crypto.randomUUID(), text, done: false, done_by: null, done_at: null }]);
    setDraft('');
  }

  return (
    <div className="card-checklist">
      <div className="card-checklist__head">
        <span className="card-checklist__label">체크리스트</span>
        {progress.total ? (
          <span className={`card-checklist__progress${progress.done === progress.total ? ' is-complete' : ''}`}>
            {progress.done}/{progress.total} 완료
          </span>
        ) : null}
      </div>

      {items.length ? (
        <ul className="card-checklist__list">
          {items.map((item) => {
            const meta = doneMeta(item);
            return (
              <li key={item.id} className={`card-checklist__item${item.done ? ' is-done' : ''}`}>
                <label className="card-checklist__check">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onChange(toggleChecklistItem(items, item.id, staffName))}
                  />
                  <span className="card-checklist__text">{item.text}</span>
                </label>
                {meta ? <span className="card-checklist__meta">{meta}</span> : null}
                <button
                  type="button"
                  className="card-checklist__remove"
                  aria-label={`"${item.text}" 항목 삭제`}
                  onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {items.length < MAX_CHECKLIST_ITEMS ? (
        <div className="card-checklist__add">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addItem();
              }
            }}
            placeholder="단계 추가 (예: 업체 연락)"
            aria-label="체크리스트 항목 추가"
          />
          <button type="button" className="btn btn--ghost btn--small" onClick={addItem} disabled={!draft.trim()}>
            추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
