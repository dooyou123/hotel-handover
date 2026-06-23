'use client';

import { COMPLAINT_REMEDY_NONE_ID, COMPLAINT_REMEDY_OPTIONS } from '@/lib/handover/complaint-remedies';

type ComplaintRemedyPickerProps = {
  remedies: string[];
  other: string;
  onChange: (remedies: string[], other: string) => void;
};

export function ComplaintRemedyPicker({ remedies, other, onChange }: ComplaintRemedyPickerProps) {
  function toggle(id: string) {
    if (id === COMPLAINT_REMEDY_NONE_ID) {
      const next = remedies.includes(id) ? [] : [COMPLAINT_REMEDY_NONE_ID];
      onChange(next, remedies.includes(id) ? other : '');
      return;
    }

    const withoutNone = remedies.filter((item) => item !== COMPLAINT_REMEDY_NONE_ID);
    const next = withoutNone.includes(id)
      ? withoutNone.filter((item) => item !== id)
      : [...withoutNone, id];
    onChange(next, other);
  }

  return (
    <div className="field field--full complaint-remedy-picker">
      <span className="complaint-remedy-picker__label">제공 품목</span>
      <div className="complaint-remedy-picker__options">
        {COMPLAINT_REMEDY_OPTIONS.map((option) => (
          <label key={option.id} className="field field--checkbox complaint-remedy-picker__option">
            <input type="checkbox" checked={remedies.includes(option.id)} onChange={() => toggle(option.id)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <label className="field field--full">
        <span>기타</span>
        <input
          value={other}
          onChange={(event) => onChange(remedies, event.target.value)}
          placeholder="직접 입력"
          disabled={remedies.includes(COMPLAINT_REMEDY_NONE_ID)}
        />
      </label>
    </div>
  );
}
