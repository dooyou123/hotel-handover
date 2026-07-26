'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CATEGORY_OPTIONS } from '@/lib/handover/constants';
import type { CardTemplate } from '@/lib/settings/use-settings';
import { WORK_GROUP_HOURS } from '@/lib/constants';

type HandoverCreateTemplatesProps = {
  workGroup?: string;
  templates: CardTemplate[];
  activeCategory?: string;
  onApply: (template: CardTemplate) => void;
};

function groupGeneralTemplates(templates: CardTemplate[]): { category: string; items: CardTemplate[] }[] {
  const general = templates.filter((template) => !(template.work_group || '').trim());
  const byCategory = new Map<string, CardTemplate[]>();

  for (const template of general) {
    const category = template.category || '기타';
    const bucket = byCategory.get(category) ?? [];
    bucket.push(template);
    byCategory.set(category, bucket);
  }

  const orderedCategories = [
    ...CATEGORY_OPTIONS.filter((category) => byCategory.has(category)),
    ...[...byCategory.keys()].filter((category) => !CATEGORY_OPTIONS.includes(category as (typeof CATEGORY_OPTIONS)[number])),
  ];

  return orderedCategories.map((category) => ({
    category,
    items: (byCategory.get(category) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'ko')),
  }));
}

export function HandoverCreateTemplates({
  workGroup,
  templates,
  activeCategory,
  onApply,
}: HandoverCreateTemplatesProps) {
  const routines = useMemo(
    () =>
      workGroup
        ? templates
            .filter((template) => template.work_group === workGroup)
            .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'ko'))
        : [],
    [templates, workGroup],
  );

  const grouped = useMemo(() => groupGeneralTemplates(templates), [templates]);
  const hasGeneral = grouped.some((group) => group.items.length > 0);
  const routineHours = workGroup ? WORK_GROUP_HOURS[workGroup] : '';

  if (!routines.length && !hasGeneral) {
    return (
      <section className="handover-create-templates handover-create-templates--empty">
        <p className="handover-create-templates__empty">
          등록된 템플릿이 없습니다.{' '}
          <Link href="/settings" className="link-btn">
            설정
          </Link>
          에서 자주 쓰는 문구를 추가해 두면 빠르게 작성할 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="handover-create-templates" aria-label="인수인계 템플릿">
      <div className="handover-create-templates__head">
        <div>
          <h3 className="handover-create-templates__title">템플릿으로 시작</h3>
          <p className="handover-create-templates__intro">자주 쓰는 항목을 고르면 제목·내용이 채워집니다.</p>
        </div>
        <Link href="/settings" className="handover-create-templates__manage link-btn">
          템플릿 관리
        </Link>
      </div>

      {routines.length ? (
        <div className="handover-create-templates__section handover-create-templates__section--routine">
          <span className="handover-create-templates__section-label">
            {workGroup}조 루틴{routineHours ? ` · ${routineHours}` : ''}
          </span>
          <div className="handover-create-templates__list">
            {routines.map((template) => (
              <button
                key={template.id}
                type="button"
                className="handover-create-templates__btn handover-create-templates__btn--routine"
                onClick={() => onApply(template)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {grouped.map(({ category, items }) =>
        items.length ? (
          <div
            key={category}
            className={`handover-create-templates__section${activeCategory === category ? ' is-active-category' : ''}`}
          >
            <span className="handover-create-templates__section-label">{category}</span>
            <div className="handover-create-templates__list">
              {items.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="handover-create-templates__btn"
                  title={template.title}
                  onClick={() => onApply(template)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </section>
  );
}
