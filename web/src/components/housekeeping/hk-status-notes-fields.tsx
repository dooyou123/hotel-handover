'use client';

import {
  HK_STATUS_NOTE_FIELDS,
  type HkStatusNoteKey,
  type HkStatusNotes,
} from '@/lib/housekeeping/types';
import { canCreateHandoverFromStatusNote } from '@/lib/housekeeping/handover-draft';

type HkStatusNotesFieldsProps = {
  value: HkStatusNotes;
  onChange: (next: HkStatusNotes) => void;
  readOnly?: boolean;
  onCreateHandover?: (key: HkStatusNoteKey) => void;
};

export function HkStatusNotesFields({
  value,
  onChange,
  readOnly = false,
  onCreateHandover,
}: HkStatusNotesFieldsProps) {
  function updateField(key: HkStatusNoteKey, text: string) {
    onChange({ ...value, [key]: text });
  }

  if (readOnly) {
    const filled = HK_STATUS_NOTE_FIELDS.filter((field) => value[field.key].trim());
    if (!filled.length) return null;

    return (
      <div className="hk-status-notes hk-status-notes--readonly">
        {filled.map((field) => (
          <article key={field.key} className="hk-status-notes__item">
            <div className="hk-status-notes__item-head">
              <h4>{field.label}</h4>
              {onCreateHandover && canCreateHandoverFromStatusNote(field.key) ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--xs hk-status-notes__handover"
                  onClick={() => onCreateHandover(field.key)}
                >
                  인수인계
                </button>
              ) : null}
            </div>
            <p>{value[field.key]}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="hk-status-notes">
      {HK_STATUS_NOTE_FIELDS.map((field) => (
        <div
          key={field.key}
          className={`hk-status-notes__row${'fullWidth' in field && field.fullWidth ? ' hk-status-notes__row--full' : ''}`}
        >
          <label className="field hk-status-notes__field">
            <span>{field.label}</span>
            <textarea
              rows={'fullWidth' in field && field.fullWidth ? 3 : 2}
              value={value[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={field.hint}
            />
          </label>
          {onCreateHandover && canCreateHandoverFromStatusNote(field.key) && value[field.key].trim() ? (
            <button
              type="button"
              className="btn btn--ghost btn--small hk-status-notes__handover"
              onClick={() => onCreateHandover(field.key)}
            >
              인수인계
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
