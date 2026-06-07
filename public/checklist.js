(function () {
  const checklistListEl = document.getElementById('checklistList');
  const checklistMetaEl = document.getElementById('checklistMeta');
  const currentShiftEl = document.getElementById('currentShift');

  initChecklist();

  function initChecklist() {
    currentShiftEl?.addEventListener('change', loadChecklist);
  }

  async function loadChecklist() {
    const shift = currentShiftEl?.value;

    if (!shift) {
      if (checklistMetaEl) checklistMetaEl.textContent = '';
      if (checklistListEl) {
        checklistListEl.innerHTML =
          '<div class="checklist-empty">상단에서 교대를 선택하면 체크리스트가 표시됩니다.</div>';
      }
      return;
    }

    try {
      const response = await fetch(`/api/checklist?shift=${encodeURIComponent(shift)}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      renderChecklistMeta(data);
      renderChecklist(data.items || []);
    } catch (error) {
      if (checklistMetaEl) checklistMetaEl.textContent = '';
      if (checklistListEl) {
        checklistListEl.innerHTML = `<div class="checklist-empty">${escapeHtml(
          error.message || '체크리스트를 불러오지 못했습니다.'
        )}</div>`;
      }
    }
  }

  function renderChecklistMeta(data) {
    if (!checklistMetaEl) return;

    const items = data.items || [];
    const completed = items.filter((item) => item.completed).length;
    const total = items.length;
    const dateLabel = formatWorkDate(data.workDate);

    if (!total) {
      checklistMetaEl.textContent = `${dateLabel} · ${data.shift} · 등록된 항목 없음`;
      return;
    }

    checklistMetaEl.textContent = `${dateLabel} · ${data.shift} · ${completed}/${total} 완료`;
  }

  function renderChecklist(items) {
    if (!checklistListEl) return;

    if (!items.length) {
      checklistListEl.innerHTML =
        '<div class="checklist-empty">등록된 체크 항목이 없습니다. <button type="button" class="link-btn" data-view-link="settings">설정에서 추가</button></div>';
      checklistListEl.querySelector('[data-view-link="settings"]')?.addEventListener('click', () => {
        window.SchedulePage?.switchView?.('settings');
      });
      return;
    }

    checklistListEl.innerHTML = items
      .map(
        (item) => `
          <label class="checklist-item checklist-item--page${item.completed ? ' is-done' : ''}">
            <input type="checkbox" data-checklist-id="${item.id}" ${item.completed ? 'checked' : ''} />
            <span class="checklist-item__body">
              <span class="checklist-item__label">${escapeHtml(item.label)}</span>
              ${
                item.completed
                  ? `<span class="checklist-item__meta">${escapeHtml(item.completedBy)} · ${formatTime(item.completedAt)}</span>`
                  : ''
              }
            </span>
          </label>
        `
      )
      .join('');

    checklistListEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => toggleChecklistItem(Number(input.dataset.checklistId)));
    });
  }

  async function toggleChecklistItem(id) {
    if (!window.HandoverApp?.requireSession?.('체크')) {
      await loadChecklist();
      return;
    }

    const session = window.HandoverApp.getSession();

    try {
      const response = await fetch(`/api/checklist/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift: session.shift,
          staffName: session.name,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '체크 실패');
      renderChecklistMeta(result);
      renderChecklist(result.items || []);
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '체크에 실패했습니다.');
      loadChecklist();
    }
  }

  function formatWorkDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  window.ChecklistPage = {
    refresh: loadChecklist,
  };
})();
