'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY_OPTIONS, HANDOVER_COLUMNS, PRIORITY_LABELS } from '@/lib/handover/constants';
import { useIsManager } from '@/lib/handover/use-cards';
import type { ColumnId, Priority } from '@/lib/handover/types';
import {
  createChecklistDefinition,
  createStaff,
  deactivateCardTemplate,
  deactivateChecklistDefinition,
  deactivateStaff,
  invalidateSettingsQueries,
  saveCardTemplate,
  updateStaffName,
  useCardTemplates,
  useChecklistDefinitions,
  useStaffList,
  type CardTemplate,
  type CardTemplateInput,
} from '@/lib/settings/use-settings';

type TemplateModalProps = {
  open: boolean;
  template: CardTemplate | null;
  onClose: () => void;
  onSaved: () => void;
};

function TemplateModal({ open, template, onClose, onSaved }: TemplateModalProps) {
  const [form, setForm] = useState<CardTemplateInput>({
    label: '',
    priority: 'today',
    column_id: 'progress',
    category: '기타',
    title: '',
    next_action: '',
    details: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setForm({
        label: template.label,
        priority: template.priority,
        column_id: template.column_id,
        category: template.category,
        title: template.title,
        next_action: template.next_action,
        details: template.details,
      });
    } else {
      setForm({
        label: '',
        priority: 'today',
        column_id: 'progress',
        category: '기타',
        title: '',
        next_action: '',
        details: '',
      });
    }
  }, [open, template]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      await saveCardTemplate({ ...form, label: form.label.trim(), title: form.title.trim() }, template?.id);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{template ? '템플릿 수정' : '새 템플릿'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field field--full">
              <span>버튼 이름 *</span>
              <input
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    label,
                    title: !template && !prev.title.trim() && label.trim() ? `${label.trim()} — ` : prev.title,
                  }));
                }}
              />
            </label>
            <label className="field">
              <span>우선순위</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>칸</span>
              <select
                value={form.column_id}
                onChange={(e) => setForm({ ...form, column_id: e.target.value as ColumnId })}
              >
                {HANDOVER_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>카테고리</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>제목</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="field field--full">
              <span>다음 조치</span>
              <input value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} />
            </label>
            <label className="field field--full">
              <span>상세</span>
              <textarea rows={2} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </label>
          </div>

          <div className="modal__footer">
            <div className="modal__footer-left">
              {template ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={async () => {
                    if (!window.confirm('이 템플릿을 삭제합니다.')) return;
                    await deactivateCardTemplate(template.id);
                    onSaved();
                    onClose();
                  }}
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="submit" disabled={saving} className="btn btn--primary">
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SettingsPageClient() {
  const queryClient = useQueryClient();
  const { data: isManager = false } = useIsManager();
  const { data: staff = [], refetch: refetchStaff } = useStaffList(true);
  const { data: checklistItems = [], refetch: refetchChecklist } = useChecklistDefinitions();
  const { data: templates = [], refetch: refetchTemplates } = useCardTemplates();

  const [staffName, setStaffName] = useState('');
  const [checklistLabel, setChecklistLabel] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  function refreshAll() {
    invalidateSettingsQueries(queryClient);
    refetchStaff();
    refetchChecklist();
    refetchTemplates();
  }

  if (!isManager) {
    return (
      <section className="settings-page">
        <p className="empty-state">
          설정(직원·체크리스트·템플릿 관리)은 <strong>매니저</strong> 계정만 사용할 수 있습니다.
        </p>
      </section>
    );
  }

  const activeStaff = staff.filter((m) => m.is_active);

  return (
    <>
      <section className="settings-page">
        <div className="settings-page__intro">
          <div>
            <h2>설정</h2>
            <p>직원 목록, 체크리스트 항목, 인수인계 템플릿을 관리합니다.</p>
          </div>
        </div>

        <div className="settings-grid settings-grid--wide">
          <article className="schedule-panel">
            <div className="schedule-panel__header">
              <div>
                <h3>직원 목록</h3>
                <p>「지금 근무」 담당자 선택 목록에 반영됩니다.</p>
              </div>
            </div>
            <form
              className="staff-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!staffName.trim()) return;
                await createStaff(staffName.trim());
                setStaffName('');
                refreshAll();
                showToast('직원이 추가되었습니다.');
              }}
            >
              <input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="새 직원 이름"
                aria-label="새 직원 이름"
              />
              <button type="submit" className="btn btn--primary">
                추가
              </button>
            </form>
            <ul className="staff-list">
              {!activeStaff.length ? (
                <li className="staff-list__empty">등록된 직원이 없습니다.</li>
              ) : (
                activeStaff.map((member) => (
                  <li key={member.id} className="staff-list__item">
                    <span className="staff-list__name">{member.name}</span>
                    <div className="staff-list__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={async () => {
                          const next = window.prompt('새 이름', member.name);
                          if (!next?.trim()) return;
                          await updateStaffName(member.id, next.trim());
                          refreshAll();
                        }}
                      >
                        이름 수정
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={async () => {
                          if (!window.confirm(`${member.name} 직원을 삭제할까요?`)) return;
                          await deactivateStaff(member.id);
                          refreshAll();
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="schedule-panel">
            <div className="schedule-panel__header">
              <div>
                <h3>체크리스트 항목</h3>
                <p>교대 체크리스트 탭에 표시되는 확인 항목입니다.</p>
              </div>
            </div>
            <form
              className="staff-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!checklistLabel.trim()) return;
                await createChecklistDefinition(checklistLabel.trim());
                setChecklistLabel('');
                refreshAll();
                showToast('체크 항목이 추가되었습니다.');
              }}
            >
              <input
                value={checklistLabel}
                onChange={(e) => setChecklistLabel(e.target.value)}
                placeholder="새 체크 항목"
                aria-label="새 체크 항목"
              />
              <button type="submit" className="btn btn--primary">
                추가
              </button>
            </form>
            <ul className="staff-list">
              {!checklistItems.length ? (
                <li className="staff-list__empty">등록된 체크 항목이 없습니다.</li>
              ) : (
                checklistItems.map((item) => (
                  <li key={item.id} className="staff-list__item">
                    <span className="staff-list__name">{item.label}</span>
                    <div className="staff-list__actions">
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={async () => {
                          if (!window.confirm('이 체크 항목을 삭제할까요?')) return;
                          await deactivateChecklistDefinition(item.id);
                          refreshAll();
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="schedule-panel schedule-panel--full">
            <div className="schedule-panel__header schedule-panel__header--split">
              <div>
                <h3>인수인계 템플릿</h3>
                <p>새 인수인계 모달의 빠른 템플릿 버튼에 표시됩니다.</p>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateModalOpen(true);
                }}
              >
                + 새 템플릿
              </button>
            </div>
            {!templates.length ? (
              <div className="template-admin-empty">
                <p>등록된 템플릿이 없습니다.</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateModalOpen(true);
                  }}
                >
                  + 새 템플릿
                </button>
              </div>
            ) : (
              <div className="template-admin-grid">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="template-admin-card"
                    onClick={() => {
                      setEditingTemplate(template);
                      setTemplateModalOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setEditingTemplate(template);
                        setTemplateModalOpen(true);
                      }
                    }}
                  >
                    <div className="template-admin-card__top">
                      <span className="template-admin-card__label">{template.label}</span>
                    </div>
                    <div className="template-admin-card__badges">
                      <span className="template-admin-card__column">
                        {PRIORITY_LABELS[template.priority]} · {template.category}
                      </span>
                    </div>
                    {template.title ? (
                      <p className="template-admin-card__preview">
                        <span className="template-admin-card__preview-label">제목</span>
                        {template.title}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <TemplateModal
        open={templateModalOpen}
        template={editingTemplate}
        onClose={() => setTemplateModalOpen(false)}
        onSaved={() => {
          refreshAll();
          showToast('템플릿이 저장되었습니다.');
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
