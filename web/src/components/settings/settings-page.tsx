'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CARD_COLUMN_OPTIONS, CATEGORY_OPTIONS, PRIORITY_LABELS } from '@/lib/handover/constants';
import { FeedbackAdminPanel } from '@/components/feedback/feedback-admin-panel';
import { countOpenFeedback, fetchFeedbackList } from '@/lib/feedback/api';
import { useIsManager } from '@/lib/handover/use-cards';
import type { ColumnId, Priority } from '@/lib/handover/types';
import {
  createStaff,
  deactivateCardTemplate,
  deactivateStaff,
  invalidateSettingsQueries,
  saveCardTemplate,
  updateStaffName,
  useCardTemplates,
  useChecklistDefinitions,
  useInactiveChecklistDefinitions,
  useStaffList,
  type CardTemplate,
  type CardTemplateInput,
} from '@/lib/settings/use-settings';
import { ChecklistAdminPanel } from '@/components/settings/checklist-admin-panel';
import { DataAdminPanel } from '@/components/settings/data-admin-panel';
import { HotelOpsSettingsPanel } from '@/components/settings/hotel-ops-settings-panel';
import { LeaveSettingsPanel } from '@/components/settings/leave-settings-panel';
import { NavVisibilityPanel } from '@/components/settings/nav-visibility-panel';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type SettingsTab = 'feedback' | 'staff' | 'checklist' | 'templates' | 'nav' | 'data';

const SETTINGS_TABS: { id: SettingsTab; label: string; hint: string }[] = [
  { id: 'feedback', label: '개선 · 버그', hint: '직원 신고 확인' },
  { id: 'staff', label: '직원', hint: '담당자 목록' },
  { id: 'checklist', label: '체크리스트', hint: '공통 · A~E조' },
  { id: 'templates', label: '템플릿', hint: '인수인계 빠른 입력' },
  { id: 'nav', label: '메뉴', hint: '사이드바 표시' },
  { id: 'data', label: '데이터', hint: '초기화 · 샘플' },
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
    work_group: '',
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
        work_group: template.work_group || '',
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
        work_group: '',
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
                {CARD_COLUMN_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>카테고리</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>조별 루틴</span>
              <select value={form.work_group} onChange={(e) => setForm({ ...form, work_group: e.target.value })}>
                <option value="">공통</option>
                {['A', 'B', 'C', 'D', 'E'].map((g) => (
                  <option key={g} value={g}>{g}조</option>
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
  const pageMeta = getNavPageMeta('/settings');
  const queryClient = useQueryClient();
  const { data: isManager = false } = useIsManager();
  const { data: staff = [], refetch: refetchStaff } = useStaffList(true);
  const { data: checklistItems = [], refetch: refetchChecklist } = useChecklistDefinitions();
  const { data: inactiveChecklistItems = [], refetch: refetchInactiveChecklist } =
    useInactiveChecklistDefinitions();
  const { data: templates = [], refetch: refetchTemplates } = useCardTemplates();

  const [staffName, setStaffName] = useState('');
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
    refetchInactiveChecklist();
    refetchTemplates();
  }

  const activeStaff = staff.filter((m) => m.is_active);
  const openFeedbackCount = countOpenFeedback(feedbackList);

  const tabCounts: Record<SettingsTab, number | null> = {
    feedback: openFeedbackCount,
    staff: activeStaff.length,
    checklist: checklistItems.length,
    templates: templates.length,
    nav: null,
    data: null,
  };

  return (
    <>
      <section className="project-board settings-page">
        <header className="project-board__head">
          <div>
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.description}</p>
          </div>
        </header>

        <nav
          className={`project-board__toolbar settings-tabs${visibleTabs.length === 2 ? ' settings-tabs--2' : ''}`}
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
            <ChecklistAdminPanel
              items={checklistItems}
              inactiveItems={inactiveChecklistItems}
              onRefresh={refreshAll}
              onToast={showToast}
            />
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

          {activeTab === 'nav' && isManager ? (
            <>
              <NavVisibilityPanel onSaved={() => showToast('사이드바 메뉴 설정이 저장되었습니다.')} />
              <LeaveSettingsPanel onSaved={showToast} />
              <HotelOpsSettingsPanel onSaved={showToast} />
            </>
          ) : null}

          {activeTab === 'data' && isManager ? <DataAdminPanel onToast={showToast} /> : null}
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
