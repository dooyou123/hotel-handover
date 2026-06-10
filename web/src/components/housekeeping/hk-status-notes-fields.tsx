'use client';

import {
  HK_STATUS_NOTE_FIELDS,
  type HkStatusNoteKey,
  type HkStatusNotes,
} from '@/lib/housekeeping/types';

type HkStatusNotesFieldsProps = {
  value: HkStatusNotes;
  onChange: (next: HkStatusNotes) => void;
  readOnly?: boolean;
};

export function HkStatusNotesFields({ value, onChange, readOnly = false }: HkStatusNotesFieldsProps) {
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
            <h4>{field.label}</h4>
            <p>{value[field.key]}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="hk-status-notes">
      {HK_STATUS_NOTE_FIELDS.map((field) => (
        <label
          key={field.key}
          className={`field hk-status-notes__field${'fullWidth' in field && field.fullWidth ? ' field--full' : ''}`}
        >
          <span>{field.label}</span>
          <textarea
            rows={'fullWidth' in field && field.fullWidth ? 3 : 2}
            value={value[field.key]}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.hint}
          />
        </label>
      ))}
    </div>
  );
}
