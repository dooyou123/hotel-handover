(function () {
  const staffForm = document.getElementById('staffForm');
  const staffNameInput = document.getElementById('staffNameInput');
  const staffListEl = document.getElementById('staffList');
  const checklistItemForm = document.getElementById('checklistItemForm');
  const checklistItemInput = document.getElementById('checklistItemInput');
  const checklistItemAdminListEl = document.getElementById('checklistItemAdminList');
  const cardTemplateAdminListEl = document.getElementById('cardTemplateAdminList');
  const addCardTemplateBtn = document.getElementById('addCardTemplateBtn');
  const templateModal = document.getElementById('templateModal');
  const templateForm = document.getElementById('templateForm');
  const templateModalTitle = document.getElementById('templateModalTitle');
  const templateLabelInput = document.getElementById('templateLabelInput');
  const templatePriorityInput = document.getElementById('templatePriorityInput');
  const templateColumnInput = document.getElementById('templateColumnInput');
  const templateCategoryInput = document.getElementById('templateCategoryInput');
  const templateTitleInput = document.getElementById('templateTitleInput');
  const templateNextActionInput = document.getElementById('templateNextActionInput');
  const templateDetailsInput = document.getElementById('templateDetailsInput');
  const closeTemplateModalBtn = document.getElementById('closeTemplateModalBtn');
  const cancelTemplateModalBtn = document.getElementById('cancelTemplateModalBtn');
  const deleteTemplateModalBtn = document.getElementById('deleteTemplateModalBtn');

  const TEMPLATE_PRIORITY_LABELS = {
    urgent: '🔴 긴급',
    today: '🟡 오늘',
    info: '⚪ 참고',
  };

  const TEMPLATE_COLUMN_LABELS = {
    urgent: '🔴 긴급',
    progress: '🟡 진행중',
    done: '✅ 완료',
  };

  let staff = [];
  let checklistItems = [];
  let cardTemplates = [];
  let editingTemplateId = null;

  initSettingsPage();

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error('서버 응답 오류입니다. 터미널에서 npm start로 서버를 재시작해 주세요.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '요청에 실패했습니다.');
    }
    return data;
  }

  function initSettingsPage() {
    staffForm?.addEventListener('submit', addStaff);
    checklistItemForm?.addEventListener('submit', addChecklistItem);
    addCardTemplateBtn?.addEventListener('click', () => openTemplateModal());
    closeTemplateModalBtn?.addEventListener('click', closeTemplateModal);
    cancelTemplateModalBtn?.addEventListener('click', closeTemplateModal);
    deleteTemplateModalBtn?.addEventListener('click', removeEditingTemplate);
    templateForm?.addEventListener('submit', saveTemplate);
    templateLabelInput?.addEventListener('input', syncTemplateTitlePreview);
  }

  async function refreshSettings() {
    await Promise.all([loadStaff(), loadChecklistItems(), loadCardTemplates()]);
    renderStaffList();
    renderChecklistItemAdminList();
    renderCardTemplateAdminList();
  }

  async function loadStaff() {
    staff = await fetchJson('/api/staff');
  }

  async function loadChecklistItems() {
    checklistItems = await fetchJson('/api/checklist/items');
  }

  async function loadCardTemplates() {
    cardTemplates = await fetchJson('/api/card-templates');
  }

  function renderStaffList() {
    if (!staffListEl) return;

    if (!staff.length) {
      staffListEl.innerHTML = '<li class="staff-list__empty">등록된 직원이 없습니다.</li>';
      return;
    }

    staffListEl.innerHTML = staff
      .filter((member) => member.isActive)
      .map(
        (member) => `
          <li class="staff-list__item">
            <span class="staff-list__name">${escapeHtml(member.name)}</span>
            <div class="staff-list__actions">
              <button type="button" class="btn btn--ghost btn--small" data-edit-staff="${member.id}">이름 수정</button>
              <button type="button" class="btn btn--ghost btn--small btn--danger-text" data-delete-staff="${member.id}">삭제</button>
            </div>
          </li>
        `
      )
      .join('');

    staffListEl.querySelectorAll('[data-edit-staff]').forEach((button) => {
      button.addEventListener('click', () => editStaff(Number(button.dataset.editStaff)));
    });
    staffListEl.querySelectorAll('[data-delete-staff]').forEach((button) => {
      button.addEventListener('click', () => removeStaff(Number(button.dataset.deleteStaff)));
    });
  }

  function renderChecklistItemAdminList() {
    if (!checklistItemAdminListEl) return;

    if (!checklistItems.length) {
      checklistItemAdminListEl.innerHTML = '<li class="staff-list__empty">등록된 체크 항목이 없습니다.</li>';
      return;
    }

    checklistItemAdminListEl.innerHTML = checklistItems
      .map(
        (item) => `
          <li class="staff-list__item">
            <span class="staff-list__name">${escapeHtml(item.label)}</span>
            <div class="staff-list__actions">
              <button type="button" class="btn btn--ghost btn--small btn--danger-text" data-delete-checklist-item="${item.id}">삭제</button>
            </div>
          </li>
        `
      )
      .join('');

    checklistItemAdminListEl.querySelectorAll('[data-delete-checklist-item]').forEach((button) => {
      button.addEventListener('click', () => removeChecklistItem(Number(button.dataset.deleteChecklistItem)));
    });
  }

  function renderCardTemplateAdminList() {
    if (!cardTemplateAdminListEl) return;

    if (!cardTemplates.length) {
      cardTemplateAdminListEl.innerHTML = `
        <div class="template-admin-empty">
          <p>등록된 템플릿이 없습니다.</p>
          <button type="button" class="btn btn--ghost" data-open-template-modal>첫 템플릿 만들기</button>
        </div>
      `;
      cardTemplateAdminListEl.querySelector('[data-open-template-modal]')?.addEventListener('click', () =>
        openTemplateModal()
      );
      return;
    }

    cardTemplateAdminListEl.innerHTML = cardTemplates
      .map(
        (template) => `
          <article class="template-admin-card">
            <div class="template-admin-card__top">
              <span class="template-admin-card__label">${escapeHtml(template.label)}</span>
              <div class="template-admin-card__actions">
                <button type="button" class="btn btn--ghost btn--small" data-edit-template="${template.id}">수정</button>
                <button type="button" class="btn btn--ghost btn--small btn--danger-text" data-delete-template="${template.id}">삭제</button>
              </div>
            </div>
            <div class="template-admin-card__badges">
              <span class="badge badge--${template.priority}">${escapeHtml(TEMPLATE_PRIORITY_LABELS[template.priority] || template.priority)}</span>
              <span class="badge badge--category">${escapeHtml(template.category)}</span>
              <span class="template-admin-card__column">${escapeHtml(TEMPLATE_COLUMN_LABELS[template.columnId] || template.columnId)}</span>
            </div>
            ${
              template.title
                ? `<p class="template-admin-card__preview"><span class="template-admin-card__preview-label">요약</span>${escapeHtml(template.title)}</p>`
                : ''
            }
            ${
              template.nextAction
                ? `<p class="template-admin-card__preview"><span class="template-admin-card__preview-label">다음</span>${escapeHtml(template.nextAction)}</p>`
                : ''
            }
          </article>
        `
      )
      .join('');

    cardTemplateAdminListEl.querySelectorAll('[data-edit-template]').forEach((button) => {
      button.addEventListener('click', () => {
        const template = cardTemplates.find((item) => item.id === Number(button.dataset.editTemplate));
        if (template) openTemplateModal(template);
      });
    });
    cardTemplateAdminListEl.querySelectorAll('[data-delete-template]').forEach((button) => {
      button.addEventListener('click', () => removeCardTemplate(Number(button.dataset.deleteTemplate)));
    });
  }

  function openTemplateModal(template = null) {
    editingTemplateId = template?.id ?? null;
    templateModalTitle.textContent = template ? '템플릿 수정' : '새 템플릿';
    deleteTemplateModalBtn.classList.toggle('hidden', !template);

    templateLabelInput.value = template?.label || '';
    templatePriorityInput.value = template?.priority || 'today';
    templateColumnInput.value = template?.columnId || 'progress';
    templateCategoryInput.value = template?.category || '기타';
    templateTitleInput.value = template?.title || '';
    templateNextActionInput.value = template?.nextAction || '';
    templateDetailsInput.value = template?.details || '';

    templateModal.showModal();
    templateLabelInput.focus();
  }

  function closeTemplateModal() {
    templateModal.close();
    editingTemplateId = null;
    templateForm.reset();
  }

  function syncTemplateTitlePreview() {
    if (editingTemplateId) return;
    const label = templateLabelInput.value.trim();
    if (!label || templateTitleInput.value.trim()) return;
    templateTitleInput.value = `${label} — `;
  }

  async function saveTemplate(event) {
    event.preventDefault();

    const payload = {
      label: templateLabelInput.value.trim(),
      priority: templatePriorityInput.value,
      columnId: templateColumnInput.value,
      category: templateCategoryInput.value,
      title: templateTitleInput.value.trim(),
      nextAction: templateNextActionInput.value.trim(),
      details: templateDetailsInput.value.trim(),
    };

    if (!payload.label) {
      window.HandoverApp?.showToast?.('버튼 이름을 입력해 주세요.');
      return;
    }

    try {
      const isEditing = Boolean(editingTemplateId);

      if (editingTemplateId) {
        await fetchJson(`/api/card-templates/${editingTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson('/api/card-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      closeTemplateModal();
      await refreshSettings();
      window.HandoverApp?.reloadTemplates?.();
      window.HandoverApp?.showToast?.(isEditing ? '템플릿이 수정되었습니다.' : '템플릿이 추가되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '저장에 실패했습니다.');
    }
  }

  async function removeEditingTemplate() {
    if (!editingTemplateId) return;
    await removeCardTemplate(editingTemplateId, true);
    closeTemplateModal();
  }

  async function addStaff(event) {
    event.preventDefault();
    const name = staffNameInput.value.trim();
    if (!name) return;

    try {
      await fetchJson('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      staffNameInput.value = '';
      await window.SchedulePage?.refresh?.();
      await refreshSettings();
      window.HandoverApp?.showToast?.('직원이 추가되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '직원 추가에 실패했습니다.');
    }
  }

  async function editStaff(id) {
    const member = staff.find((item) => item.id === id);
    if (!member) return;

    const nextName = prompt('수정할 이름을 입력해 주세요.', member.name);
    if (!nextName || !nextName.trim() || nextName.trim() === member.name) return;

    try {
      await fetchJson(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName.trim() }),
      });

      await window.SchedulePage?.refresh?.();
      await refreshSettings();
      window.HandoverApp?.showToast?.('직원 이름이 수정되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '수정에 실패했습니다.');
    }
  }

  async function removeStaff(id) {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    if (!confirm(`${member.name} 직원을 목록에서 삭제할까요?`)) return;

    try {
      await fetchJson(`/api/staff/${id}`, { method: 'DELETE' });

      await window.SchedulePage?.refresh?.();
      await refreshSettings();
      window.HandoverApp?.showToast?.('직원이 목록에서 제거되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '삭제에 실패했습니다.');
    }
  }

  async function addChecklistItem(event) {
    event.preventDefault();
    const label = checklistItemInput.value.trim();
    if (!label) return;

    try {
      await fetchJson('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });

      checklistItemInput.value = '';
      await refreshSettings();
      window.ChecklistPage?.refresh?.();
      window.HandoverApp?.showToast?.('체크 항목이 추가되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '추가에 실패했습니다.');
    }
  }

  async function removeChecklistItem(id) {
    const item = checklistItems.find((entry) => entry.id === id);
    if (!item) return;
    if (!confirm(`「${item.label}」 항목을 삭제할까요?`)) return;

    try {
      await fetchJson(`/api/checklist/${id}`, { method: 'DELETE' });

      await refreshSettings();
      window.ChecklistPage?.refresh?.();
      window.HandoverApp?.showToast?.('체크 항목이 삭제되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '삭제에 실패했습니다.');
    }
  }

  async function removeCardTemplate(id, skipConfirm = false) {
    const template = cardTemplates.find((item) => item.id === id);
    if (!template) return;
    if (!skipConfirm && !confirm(`「${template.label}」 템플릿을 삭제할까요?`)) return;

    try {
      await fetchJson(`/api/card-templates/${id}`, { method: 'DELETE' });
      await refreshSettings();
      window.HandoverApp?.reloadTemplates?.();
      window.HandoverApp?.showToast?.('템플릿이 삭제되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '삭제에 실패했습니다.');
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  window.SettingsPage = {
    refresh: refreshSettings,
  };
})();
