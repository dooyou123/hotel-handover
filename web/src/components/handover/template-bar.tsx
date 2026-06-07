'use client';

import type { CardTemplate } from '@/lib/settings/use-settings';

type TemplateBarProps = {
  templates: CardTemplate[];
  onApply: (template: CardTemplate) => void;
};

export function TemplateBar({ templates, onApply }: TemplateBarProps) {
  if (!templates.length) {
    return (
      <div className="template-bar">
        <span className="template-bar__label">
          템플릿이 없습니다.{' '}
          <a href="/settings" className="link-btn">
            설정
          </a>
          에서 추가하세요.
        </span>
      </div>
    );
  }

  return (
    <div className="template-bar">
      <span className="template-bar__label">템플릿으로 빠르게 채우기</span>
      <div className="template-bar__list">
        {templates.map((template) => (
          <button key={template.id} type="button" onClick={() => onApply(template)} className="template-btn">
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
