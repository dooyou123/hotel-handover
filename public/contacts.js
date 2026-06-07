(function () {
  const DEPARTMENTS = ['전체', '엔지니어링', '하우스키핑', 'F&B', '매니저', '보안', '응급', '업체', '기타'];

  const state = {
    contacts: [],
    filter: '전체',
    query: '',
    editingId: null,
  };

  const contactsGridEl = document.getElementById('contactsGrid');
  const contactFiltersEl = document.getElementById('contactFilters');
  const contactSearchInputEl = document.getElementById('contactSearchInput');
  const addContactBtn = document.getElementById('addContactBtn');
  const contactModal = document.getElementById('contactModal');
  const contactForm = document.getElementById('contactForm');
  const contactModalTitle = document.getElementById('contactModalTitle');
  const deleteContactBtn = document.getElementById('deleteContactBtn');
  const closeContactModalBtn = document.getElementById('closeContactModalBtn');
  const cancelContactModalBtn = document.getElementById('cancelContactModalBtn');

  initContactsPage();

  function initContactsPage() {
    renderFilters();

    addContactBtn.addEventListener('click', () => openContactModal());
    closeContactModalBtn.addEventListener('click', closeContactModal);
    cancelContactModalBtn.addEventListener('click', closeContactModal);
    deleteContactBtn.addEventListener('click', deleteCurrentContact);
    contactForm.addEventListener('submit', saveContact);
    contactSearchInputEl.addEventListener('input', () => {
      state.query = contactSearchInputEl.value.trim().toLowerCase();
      renderContacts();
    });

    loadContacts();
  }

  function renderFilters() {
    contactFiltersEl.innerHTML = DEPARTMENTS.map(
      (department) =>
        `<button type="button" class="contacts-filter${department === state.filter ? ' is-active' : ''}" data-department="${department}">${department}</button>`
    ).join('');

    contactFiltersEl.querySelectorAll('.contacts-filter').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.department;
        renderFilters();
        renderContacts();
      });
    });
  }

  async function loadContacts() {
    try {
      const response = await fetch('/api/contacts');
      state.contacts = await response.json();
      renderContacts();
    } catch {
      contactsGridEl.innerHTML = '<div class="shift-empty">연락처를 불러오지 못했습니다.</div>';
    }
  }

  function getVisibleContacts() {
    return state.contacts.filter((contact) => {
      const matchesDepartment = state.filter === '전체' || contact.department === state.filter;
      if (!matchesDepartment) return false;

      if (!state.query) return true;
      const haystack = [contact.name, contact.department, contact.phone, contact.phoneAlt, contact.note]
        .join(' ')
        .toLowerCase();
      return haystack.includes(state.query);
    });
  }

  function renderContacts() {
    const contacts = getVisibleContacts();

    if (!contacts.length) {
      contactsGridEl.innerHTML =
        '<div class="shift-empty">등록된 연락처가 없습니다.<br>+ 연락처 추가로 등록해 주세요.</div>';
      return;
    }

    contactsGridEl.innerHTML = contacts
      .map(
        (contact) => `
          <article class="contact-card" data-contact-id="${contact.id}">
            <div class="contact-card__top">
              <span class="contact-card__dept">${escapeHtml(contact.department)}</span>
              <div class="contact-card__actions">
                <button type="button" class="contact-card__pin${contact.isPinned ? ' is-active' : ''}" data-pin-contact="${contact.id}" title="즐겨찾기">⭐</button>
                <button type="button" class="contact-card__edit">수정</button>
              </div>
            </div>
            <h3 class="contact-card__name">${escapeHtml(contact.name)}</h3>
            <div class="contact-card__phones">
              <a class="contact-card__phone" href="${phoneHref(contact.phone)}">${escapeHtml(contact.phone)}</a>
              ${
                contact.phoneAlt
                  ? `<a class="contact-card__phone contact-card__phone--alt" href="${phoneHref(contact.phoneAlt)}">${escapeHtml(contact.phoneAlt)}</a>`
                  : ''
              }
            </div>
            ${contact.note ? `<p class="contact-card__note">${escapeHtml(contact.note)}</p>` : ''}
          </article>
        `
      )
      .join('');

    contactsGridEl.querySelectorAll('.contact-card').forEach((cardEl) => {
      const id = Number(cardEl.dataset.contactId);
      cardEl.querySelector('[data-pin-contact]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleContactPin(id);
      });
      cardEl.querySelector('.contact-card__edit')?.addEventListener('click', (event) => {
        event.stopPropagation();
        const contact = state.contacts.find((item) => item.id === id);
        if (contact) openContactModal(contact);
      });
      cardEl.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        const contact = state.contacts.find((item) => item.id === id);
        if (contact) openContactModal(contact);
      });
    });
  }

  function phoneHref(value) {
    const digits = String(value || '').replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : '#';
  }

  function openContactModal(contact = null) {
    state.editingId = contact?.id ?? null;
    contactModalTitle.textContent = contact ? '연락처 수정' : '연락처 추가';
    deleteContactBtn.classList.toggle('hidden', !contact);

    contactForm.department.value = contact?.department || '기타';
    contactForm.name.value = contact?.name || '';
    contactForm.phone.value = contact?.phone || '';
    contactForm.phoneAlt.value = contact?.phoneAlt || '';
    contactForm.note.value = contact?.note || '';

    contactModal.showModal();
    contactForm.name.focus();
  }

  function closeContactModal() {
    contactModal.close();
    state.editingId = null;
    contactForm.reset();
  }

  async function saveContact(event) {
    event.preventDefault();

    const payload = {
      department: contactForm.department.value,
      name: contactForm.name.value.trim(),
      phone: contactForm.phone.value.trim(),
      phoneAlt: contactForm.phoneAlt.value.trim(),
      note: contactForm.note.value.trim(),
    };

    try {
      const response = await fetch(
        state.editingId ? `/api/contacts/${state.editingId}` : '/api/contacts',
        {
          method: state.editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '저장 실패');

      const wasEditing = Boolean(state.editingId);
      closeContactModal();
      await loadContacts();
      window.HandoverApp?.showToast?.(wasEditing ? '연락처가 수정되었습니다.' : '연락처가 추가되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '저장에 실패했습니다.');
    }
  }

  async function deleteCurrentContact() {
    if (!state.editingId) return;
    const contact = state.contacts.find((item) => item.id === state.editingId);
    if (!contact) return;
    if (!confirm(`「${contact.name}」 연락처를 삭제할까요?`)) return;

    try {
      const response = await fetch(`/api/contacts/${state.editingId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '삭제 실패');

      closeContactModal();
      await loadContacts();
      window.HandoverApp?.refreshPinnedContacts?.();
      window.HandoverApp?.showToast?.('연락처가 삭제되었습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '삭제에 실패했습니다.');
    }
  }

  async function toggleContactPin(id) {
    try {
      const response = await fetch(`/api/contacts/${id}/toggle-pin`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '즐겨찾기 변경 실패');
      await loadContacts();
      window.HandoverApp?.refreshPinnedContacts?.();
      window.HandoverApp?.showToast?.(result.isPinned ? '즐겨찾기에 추가했습니다.' : '즐겨찾기를 해제했습니다.');
    } catch (error) {
      window.HandoverApp?.showToast?.(error.message || '즐겨찾기 변경에 실패했습니다.');
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

  window.ContactsPage = {
    refresh: loadContacts,
  };
})();
