'use client';

import { WORK_GROUP_HOURS } from '@/lib/constants';
import type { CardTemplate } from '@/lib/settings/use-settings';

type RoutineTemplateBarProps = {
  workGroup: string;
  templates: CardTemplate[];
  onApply: (template: CardTemplate) => void;
};

export function RoutineTemplateBar({ workGroup, templates, onApply }: RoutineTemplateBarProps) {
  const routines = templates.filter((t) => t.work_group === workGroup);
  if (!routines.length) return null;

  const hours = workGroup ? WORK_GROUP_HOURS[workGroup] : '';

  return (
    <div className="routine-template-bar">
      <div className="routine-template-bar__head">
        <span className="routine-template-bar__label">
          {workGroup}조 루틴 제안{hours ? ` · ${hours}` : ''}
        </span>
      </div>
      <div className="routine-template-bar__list">
        {routines.map((template) => (
          <button
            key={template.id}
            type="button"
            className="routine-template-bar__btn"
            onClick={() => onApply(template)}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
