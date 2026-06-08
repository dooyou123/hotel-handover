'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CATEGORY_OPTIONS, HANDOVER_COLUMNS, PRIORITY_LABELS } from '@/lib/handover/constants';
import { CHECKLIST_SCOPE_LABELS, type ChecklistScope } from '@/lib/constants';
import { FeedbackAdminPanel } from '@/components/feedback/feedback-admin-panel';
import { countOpenFeedback, fetchFeedbackList } from '@/lib/feedback/api';
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type SettingsTab = 'feedback' | 'staff' | 'checklist' | 'templates';

const SETTINGS_TABS: { id: SettingsTab; label: string; hint: string }[] = [
  { id: 'feedback', label: '개선 · 버그', hint: '직원 신고 확인' },
  { id: 'staff', label: '직원', hint: '담당자 목록' },
  { id: 'checklist', label: '체크리스트', hint: '공통 · A/B/C' },
  { id: 'templates', label: '템플릿', hint: '인수인계 빠른 입력' },
];

const STAFF_SETTINGS_TABS = new Set<SettingsTab>(['staff', 'templates']);

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
  const { confirm } = useConfirmDialog();

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
                    const ok = await confirm({
                      title: '템플릿 삭제',
                      message: '이 템플릿을 삭제합니다.',
                      tone: 'danger',
                      confirmLabel: '삭제',
                    });
                    if (!ok) return;
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
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, string>>({
    common: '',
    A: '',
    B: '',
    C: '',
  });
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('staff');
  const [toast, setToast] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  const { data: feedbackList = [] } = useQuery({
    queryKey: ['user-feedback'],
    queryFn: fetchFeedbackList,
    enabled: isManager,
  });

  const visibleTabs = isManager
    ? SETTINGS_TABS
    : SETTINGS_TABS.filter((tab) => STAFF_SETTINGS_TABS.has(tab.id));

  useEffect(() => {
    if (!STAFF_SETTINGS_TABS.has(activeTab) && !isManager) {
      setActiveTab('staff');
    }
  }, [activeTab, isManager]);

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

  const activeStaff = staff.filter((m) => m.is_active);
  const openFeedbackCount = countOpenFeedback(feedbackList);

  const tabCounts: Record<SettingsTab, number | null> = {
    feedback: openFeedbackCount,
    staff: activeStaff.length,
    checklist: checklistItems.length,
    templates: templates.length,
  };

  return (
    <>
      <section className="settings-page">
        <div className="settings-page__intro">
          <div>
            <h2>설정</h2>
            <p>
              {isManager
                ? '탭을 선택해 항목을 관리하세요. 한 화면에 하나씩만 표시됩니다.'
                : '직원 목록과 인수인계 템플릿을 관리할 수 있습니다.'}
            </p>
          </div>
        </div>

        <nav
          className={`settings-tabs${visibleTabs.length === 2 ? ' settings-tabs--2' : ''}`}
          aria-label="설정 메뉴"
        >
          {visibleTabs.map((tab) => {
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                className={`settings-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="settings-tab__label">{tab.label}</span>
                <span className="settings-tab__hint">{tab.hint}</span>
                {count != null && count > 0 ? (
                  <span className={`settings-tab__count${tab.id === 'feedback' && openFeedbackCount > 0 ? ' settings-tab__count--alert' : ''}`}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="settings-panel">
          {activeTab === 'feedback' ? <FeedbackAdminPanel /> : null}

          {activeTab === 'staff' ? (
            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>직원 목록</h3>
                  <p>「지금 근무」 담당자 선택 목록에 반영됩니다.</p>
                </div>
                <span className="shift-stat">
                  <strong>{activeStaff.length}</strong>명
                </span>
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
                            const ok = await confirm({
                              title: '직원 삭제',
                              message: `${member.name} 직원을 삭제할까요?`,
                              tone: 'danger',
                              confirmLabel: '삭제',
                            });
                            if (!ok) return;
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
          ) : null}

          {activeTab === 'checklist' ? (
            <article className="schedule-panel">
              <div className="schedule-panel__header">
                <div>
                  <h3>체크리스트 항목</h3>
                  <p>
                    <strong>공통</strong>은 전 조, <strong>A/B/C조</strong>는 해당 조만 표시됩니다.
                  </p>
                </div>
                <span className="shift-stat">
                  <strong>{checklistItems.length}</strong>개
                </span>
              </div>
              <div className="checklist-admin-grid">
                {(['common', 'A', 'B', 'C'] as ChecklistScope[]).map((scope) => {
                  const scopeItems = checklistItems.filter((item) => item.work_group === scope);
                  const scopeHint =
                    scope === 'common' ? '모든 조가 함께 확인' : `${scope}조 근무자만 확인`;

                  return (
                    <section key={scope} className="checklist-admin-section">
                      <div className="checklist-admin-section__header">
                        <h4>{CHECKLIST_SCOPE_LABELS[scope]}</h4>
                        <p>{scopeHint}</p>
                      </div>
                      <form
                        className="staff-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const label = checklistDrafts[scope]?.trim();
                          if (!label) return;
                          await createChecklistDefinition(label, scope);
                          setChecklistDrafts((prev) => ({ ...prev, [scope]: '' }));
                          refreshAll();
                          showToast(`${CHECKLIST_SCOPE_LABELS[scope]} 항목이 추가되었습니다.`);
                        }}
                      >
                        <input
                          value={checklistDrafts[scope] ?? ''}
                          onChange={(e) =>
                            setChecklistDrafts((prev) => ({ ...prev, [scope]: e.target.value }))
                          }
                          placeholder="새 체크 항목"
                          aria-label={`${CHECKLIST_SCOPE_LABELS[scope]} 새 항목`}
                        />
                        <button type="submit" className="btn btn--primary btn--small">
                          추가
                        </button>
                      </form>
                      <ul className="staff-list">
                        {!scopeItems.length ? (
                          <li className="staff-list__empty">항목 없음</li>
                        ) : (
                          scopeItems.map((item) => (
                            <li key={item.id} className="staff-list__item">
                              <span className="staff-list__name">{item.label}</span>
                              <div className="staff-list__actions">
                                <button
                                  type="button"
                                  className="btn btn--danger btn--small"
                                  onClick={async () => {
                                    const ok = await confirm({
                                      title: '체크 항목 삭제',
                                      message: `「${item.label}」 항목을 삭제할까요?`,
                                      tone: 'danger',
                                      confirmLabel: '삭제',
                                    });
                                    if (!ok) return;
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
                    </section>
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === 'templates' ? (
            <article className="schedule-panel">
              <div className="schedule-panel__header schedule-panel__header--split">
                <div>
                  <h3>인수인계 템플릿</h3>
                  <p>새 인수인계 모달의 빠른 템플릿 버튼에 표시됩니다.</p>
                </div>
                <div className="settings-panel__actions">
                  <span className="shift-stat">
                    <strong>{templates.length}</strong>개
                  </span>
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
          ) : null}
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
