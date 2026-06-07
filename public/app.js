const COLUMNS = [
  {
    id: 'urgent',
    title: '🔴 긴급',
    hint: '다음 교대가 반드시 확인·처리',
    className: 'column--urgent',
  },
  {
    id: 'progress',
    title: '🟡 진행중',
    hint: '처리 중이거나 오늘 중 마무리',
    className: 'column--progress',
  },
  {
    id: 'done',
    title: '✅ 완료',
    hint: '처리 완료 — 교대 끝나면 비우기',
    className: 'column--done',
  },
];

const PRIORITY_LABELS = {
  urgent: '🔴 긴급',
  today: '🟡 오늘',
  info: '⚪ 참고',
};

const CATEGORY_OPTIONS = [
  'VIP',
  '체크인/아웃',
  '룸이슈',
  '결제',
  '민원',
  '유실물',
  '공용',
  '기타',
];

const SESSION_KEY = 'handover-session';

const COLUMN_LABELS = {
  urgent: '🔴 긴급',
  progress: '🟡 진행중',
  done: '✅ 완료',
};

const HIGHLIGHT_KEYWORDS = ['119', '112', '경찰', 'VIP', '환불', '응급', '미수금', '소음'];

let cards = [];
let notices = [];
let editingId = null;
let editingNoticeId = null;
let draggedCardId = null;
let activeQuickFilter = 'all';
let handoverViewMode = 'board';
let selectedRoomKey = null;
let cardTemplates = [];
let currentSession = loadSession();

const boardEl = document.getElementById('board');
const roomViewEl = document.getElementById('roomView');
const summaryBarEl = document.getElementById('summaryBar');
const quickFiltersEl = document.getElementById('quickFilters');
const announcementListEl = document.getElementById('announcementList');
const changeListEl = document.getElementById('changeList');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const addCardBtn = document.getElementById('addCardBtn');
const clearDoneBtn = document.getElementById('clearDoneBtn');
const currentShiftEl = document.getElementById('currentShift');
const currentNameEl = document.getElementById('currentName');
const sessionStatusEl = document.getElementById('sessionStatus');
const cardAuthorField = document.getElementById('cardAuthorField');
const cardAssigneeShift = document.getElementById('cardAssigneeShift');
const cardAssigneeName = document.getElementById('cardAssigneeName');
const cardDueAt = document.getElementById('cardDueAt');
const templateBar = document.getElementById('templateBar');
const templateList = document.getElementById('templateList');
const cardModal = document.getElementById('cardModal');
const cardForm = document.getElementById('cardForm');
const modalTitle = document.getElementById('modalTitle');
const deleteCardBtn = document.getElementById('deleteCardBtn');
const deleteCardNote = document.getElementById('deleteCardNote');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const noticeModal = document.getElementById('noticeModal');
const noticeForm = document.getElementById('noticeForm');
const noticeModalTitle = document.getElementById('noticeModalTitle');
const noticeContentLabel = document.getElementById('noticeContentLabel');
const noticeTypeInput = document.getElementById('noticeType');
const deleteNoticeBtn = document.getElementById('deleteNoticeBtn');
const deleteNoticeNote = document.getElementById('deleteNoticeNote');
const closeNoticeModalBtn = document.getElementById('closeNoticeModalBtn');
const cancelNoticeModalBtn = document.getElementById('cancelNoticeModalBtn');
const shiftStartBtn = document.getElementById('shiftStartBtn');
const shiftStartModal = document.getElementById('shiftStartModal');
const shiftStartTitle = document.getElementById('shiftStartTitle');
const shiftStartMeta = document.getElementById('shiftStartMeta');
const shiftStartStats = document.getElementById('shiftStartStats');
const shiftStartContent = document.getElementById('shiftStartContent');
const closeShiftStartBtn = document.getElementById('closeShiftStartBtn');
const cancelShiftStartBtn = document.getElementById('cancelShiftStartBtn');
const completeShiftStartBtn = document.getElementById('completeShiftStartBtn');
const shiftEndBtn = document.getElementById('shiftEndBtn');
const shiftEndModal = document.getElementById('shiftEndModal');
const shiftEndTitle = document.getElementById('shiftEndTitle');
const shiftEndMeta = document.getElementById('shiftEndMeta');
const shiftEndStats = document.getElementById('shiftEndStats');
const shiftEndChecks = document.getElementById('shiftEndChecks');
const shiftEndContent = document.getElementById('shiftEndContent');
const shiftEndNote = document.getElementById('shiftEndNote');
const shiftEndClearDone = document.getElementById('shiftEndClearDone');
const closeShiftEndBtn = document.getElementById('closeShiftEndBtn');
const cancelShiftEndBtn = document.getElementById('cancelShiftEndBtn');
const completeShiftEndBtn = document.getElementById('completeShiftEndBtn');
const exportFromShiftBtn = document.getElementById('exportFromShiftBtn');
const exportSummaryBtn = document.getElementById('exportSummaryBtn');
const exportSummaryModal = document.getElementById('exportSummaryModal');
const exportSummaryMeta = document.getElementById('exportSummaryMeta');
const exportSummaryStats = document.getElementById('exportSummaryStats');
const exportSummaryPreview = document.getElementById('exportSummaryPreview');
const exportSummarySheet = document.getElementById('exportSummarySheet');
const closeExportSummaryBtn = document.getElementById('closeExportSummaryBtn');
const exportTextBtn = document.getElementById('exportTextBtn');
const exportPrintBtn = document.getElementById('exportPrintBtn');
const exportImageBtn = document.getElementById('exportImageBtn');
const duplicateCardBtn = document.getElementById('duplicateCardBtn');
const resolutionField = document.getElementById('resolutionField');
const cardExtraSection = document.getElementById('cardExtraSection');
const cardCommentsList = document.getElementById('cardCommentsList');
const cardCommentForm = document.getElementById('cardCommentForm');
const cardCommentInput = document.getElementById('cardCommentInput');
const cardCommentSubmitBtn = document.getElementById('cardCommentSubmitBtn');
const cardAttachmentsList = document.getElementById('cardAttachmentsList');
const cardAttachmentInput = document.getElementById('cardAttachmentInput');
const pinnedContactsBar = document.getElementById('pinnedContactsBar');
const pinnedContactsList = document.getElementById('pinnedContactsList');
const activityLogBtn = document.getElementById('activityLogBtn');
const activityLogModal = document.getElementById('activityLogModal');
const activityLogContent = document.getElementById('activityLogContent');
const closeActivityLogBtn = document.getElementById('closeActivityLogBtn');
const cancelActivityLogBtn = document.getElementById('cancelActivityLogBtn');
const toastEl = document.getElementById('toast');

const NOTICE_LABELS = {
  announcement: { title: '업무 공지', add: '공지 추가', edit: '공지 수정' },
  change: { title: '업무 변경', add: '변경 추가', edit: '변경 수정' },
};

const ACTION_LABELS = {
  create: '추가',
  update: '수정',
  delete: '삭제',
  move: '이동',
  clear_done: '완료칸 비우기',
};

init();

function init() {
  CATEGORY_OPTIONS.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  addCardBtn.addEventListener('click', () => openModal());
  activityLogBtn.addEventListener('click', openActivityLogModal);
  closeActivityLogBtn.addEventListener('click', closeActivityLogModal);
  cancelActivityLogBtn.addEventListener('click', closeActivityLogModal);
  clearDoneBtn.addEventListener('click', clearDoneCards);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  deleteCardBtn.addEventListener('click', deleteCurrentCard);
  duplicateCardBtn?.addEventListener('click', duplicateCurrentCard);
  cardCommentSubmitBtn?.addEventListener('click', submitCardComment);
  cardCommentInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCardComment(event);
    }
  });
  cardAttachmentInput?.addEventListener('change', uploadCardAttachment);
  cardForm.columnId?.addEventListener('change', syncResolutionField);
  cardForm.addEventListener('submit', saveCard);
  searchInput.addEventListener('input', render);
  categoryFilter.addEventListener('change', () => {
    const value = categoryFilter.value;
    activeQuickFilter = ['VIP', '결제', '민원', '룸이슈', '체크인/아웃'].includes(value) ? value : 'all';
    syncQuickFilterButtons();
    render();
  });

  document.querySelectorAll('[data-handover-view]').forEach((button) => {
    button.addEventListener('click', () => setHandoverViewMode(button.dataset.handoverView));
  });

  quickFiltersEl.querySelectorAll('.quick-filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeQuickFilter = button.dataset.filter;
      if (activeQuickFilter === 'all' || activeQuickFilter === 'unacked' || activeQuickFilter === 'mine' || activeQuickFilter === 'roomclean') {
        categoryFilter.value = '';
      } else {
        categoryFilter.value = activeQuickFilter;
      }
      syncQuickFilterButtons();
      render();
    });
  });

  shiftStartBtn.addEventListener('click', openShiftStartModal);
  shiftEndBtn.addEventListener('click', openShiftEndModal);
  closeShiftStartBtn.addEventListener('click', closeShiftStartModal);
  cancelShiftStartBtn.addEventListener('click', closeShiftStartModal);
  completeShiftStartBtn.addEventListener('click', completeShiftStart);
  closeShiftEndBtn.addEventListener('click', closeShiftEndModal);
  cancelShiftEndBtn.addEventListener('click', closeShiftEndModal);
  completeShiftEndBtn.addEventListener('click', completeShiftEnd);
  exportFromShiftBtn.addEventListener('click', () => {
    closeShiftStartModal();
    openExportSummaryModal();
  });

  document.querySelectorAll('[data-notice-type]').forEach((button) => {
    button.addEventListener('click', () => openNoticeModal(null, button.dataset.noticeType));
  });
  closeNoticeModalBtn.addEventListener('click', closeNoticeModal);
  cancelNoticeModalBtn.addEventListener('click', closeNoticeModal);
  deleteNoticeBtn.addEventListener('click', deleteCurrentNotice);
  noticeForm.addEventListener('submit', saveNotice);

  exportSummaryBtn.addEventListener('click', openExportSummaryModal);
  closeExportSummaryBtn.addEventListener('click', closeExportSummaryModal);
  exportSummaryModal.addEventListener('cancel', closeExportSummaryModal);
  exportTextBtn.addEventListener('click', exportSummaryAsText);
  exportPrintBtn.addEventListener('click', exportSummaryAsPrint);
  exportImageBtn.addEventListener('click', exportSummaryAsImage);

  pinnedContactsBar.querySelector('[data-view-link="contacts"]')?.addEventListener('click', () => {
    window.SchedulePage?.switchView?.('contacts');
  });

  initSessionBar();
  loadCardTemplates();
  loadAll();
}

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    return {
      shift: saved.shift || '',
      name: saved.name || '',
    };
  } catch {
    return { shift: '', name: '' };
  }
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
}

function initSessionBar() {
  currentShiftEl.value = currentSession.shift;
  currentNameEl.value = currentSession.name;
  updateSessionStatus();

  currentShiftEl.addEventListener('change', () => {
    currentSession.shift = currentShiftEl.value;
    saveSession();
    updateSessionStatus();
    renderSummary();
  });

  currentNameEl.addEventListener('change', () => {
    currentSession.name = currentNameEl.value.trim();
    saveSession();
    updateSessionStatus();
    renderSummary();
  });
}

function setCurrentShift(shift) {
  currentShiftEl.value = shift;
  currentSession.shift = shift;
  saveSession();
  updateSessionStatus();
  renderSummary();
}

window.HandoverApp = {
  setCurrentShift,
  showToast,
  requireSession,
  getSession: () => ({ shift: currentSession.shift, name: currentSession.name }),
  refreshPinnedContacts,
  reloadTemplates: loadCardTemplates,
};

function getAuditPayload(extra = {}) {
  return {
    audit: {
      shift: currentSession.shift,
      staffName: currentSession.name,
      ...extra,
    },
  };
}

async function requestDeleteReason(itemLabel) {
  if (!requireSession('삭제')) return null;

  const proceed = confirm(
    `${itemLabel}\n\n삭제 대신 ✅ 완료 칸으로 옮기는 것을 권장합니다.\n그래도 삭제하시겠습니까?`
  );
  if (!proceed) return null;

  const reason = prompt('삭제 사유를 입력해 주세요. (기록에 남습니다)');
  if (!reason || !reason.trim()) {
    showToast('삭제 사유를 입력해야 합니다.');
    return null;
  }

  return reason.trim();
}

function formatActivityDetail(log) {
  const details = log.details || {};
  if (details.reason) return `사유: ${details.reason}`;
  if (Array.isArray(details.changes) && details.changes.length > 0) {
    return details.changes.join(' · ');
  }
  if (Array.isArray(details.cards) && details.cards.length > 0) {
    return details.cards
      .slice(0, 3)
      .map((card) => `${card.room ? `[${card.room}] ` : ''}${card.title}`)
      .join(' · ');
  }
  return '';
}

async function openActivityLogModal() {
  try {
    const response = await fetch('/api/activity-logs?limit=80');
    const logs = await response.json();
    renderActivityLogs(logs);
    activityLogModal.showModal();
  } catch {
    showToast('변경 기록을 불러오지 못했습니다.');
  }
}

function closeActivityLogModal() {
  activityLogModal.close();
}

function renderActivityLogs(logs) {
  if (!logs.length) {
    activityLogContent.innerHTML = '<div class="shift-empty">아직 기록된 변경 내역이 없습니다.</div>';
    return;
  }

  activityLogContent.innerHTML = logs
    .map((log) => {
      const detail = formatActivityDetail(log);
      const actor = log.shift && log.staffName ? `${log.shift} · ${log.staffName}` : '작성자 미입력';
      return `
        <article class="activity-item">
          <div class="activity-item__top">
            <span class="activity-item__action${log.action === 'delete' ? ' activity-item__action--delete' : ''}">${ACTION_LABELS[log.action] || log.action}</span>
            <span class="activity-item__time">${formatTime(log.createdAt)}</span>
          </div>
          <p class="activity-item__summary">${escapeHtml(log.summary)}</p>
          <p class="activity-item__meta">${escapeHtml(actor)}</p>
          ${detail ? `<p class="activity-item__detail">${escapeHtml(detail)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function updateSessionStatus() {
  const ready = Boolean(currentSession.shift && currentSession.name);
  sessionStatusEl.classList.toggle('is-ready', ready);
  sessionStatusEl.textContent = ready
    ? `근무 중: ${currentSession.shift} · ${currentSession.name}`
    : '교대와 이름을 선택해 주세요';
}

function getSessionAuthorLabel() {
  if (!currentSession.shift || !currentSession.name) return '';
  return `${currentSession.shift} · ${currentSession.name}`;
}

function requireSession(actionLabel) {
  if (currentSession.shift && currentSession.name) return true;
  showToast(`${actionLabel} 전에 상단에서 교대와 이름을 선택해 주세요.`);
  currentShiftEl.focus();
  return false;
}

async function loadAll() {
  try {
    const [cardsRes, noticesRes] = await Promise.all([
      fetch('/api/cards'),
      fetch('/api/notices'),
    ]);
    cards = await cardsRes.json();
    notices = await noticesRes.json();
    if (window.SchedulePage?.refresh) {
      await window.SchedulePage.refresh();
    }
    await refreshPinnedContacts();
    if (window.ChecklistPage?.refresh) {
      window.ChecklistPage.refresh();
    }
    render();
  } catch {
    showToast('서버 연결에 실패했습니다. npm start 로 실행해 주세요.');
  }
}

async function loadCards() {
  await loadAll();
}

function render() {
  renderNotices();
  renderSummary();
  document.querySelectorAll('[data-handover-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.handoverView === handoverViewMode);
  });

  if (handoverViewMode === 'room') {
    boardEl.classList.add('hidden');
    roomViewEl.classList.remove('hidden');
    renderRoomView();
  } else {
    boardEl.classList.remove('hidden');
    roomViewEl.classList.add('hidden');
    renderBoard();
  }
}

function renderNotices() {
  renderNoticeList('announcement', announcementListEl);
  renderNoticeList('change', changeListEl);
}

function renderNoticeList(type, container) {
  const items = notices
    .filter((notice) => notice.type === type)
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.id - a.id);

  if (items.length === 0) {
    container.innerHTML =
      type === 'announcement'
        ? '<div class="notice-empty">등록된 업무 공지가 없습니다.<br>+ 공지 추가로 올려 주세요.</div>'
        : '<div class="notice-empty">등록된 업무 변경이 없습니다.<br>+ 변경 추가로 올려 주세요.</div>';
    return;
  }

  container.innerHTML = '';
  items.forEach((notice) => {
    const itemEl = document.createElement('div');
    itemEl.className = `notice-item${notice.isPinned ? ' notice-item--pinned' : ''}`;

    const expiryLabel = formatExpiryLabel(notice.expiresAt);
    const tagsHtml = [
      notice.isPinned ? '<span class="notice-tag notice-tag--pin">📌 고정</span>' : '',
      expiryLabel
        ? `<span class="notice-tag ${expiryLabel.soon ? 'notice-tag--expire-soon' : 'notice-tag--expire'}">${escapeHtml(expiryLabel.text)}</span>`
        : '',
    ]
      .filter(Boolean)
      .join('');

    itemEl.innerHTML = `
      <div class="notice-item__head">
        <div class="notice-item__tags">${tagsHtml}</div>
        <button type="button" class="notice-pin-btn${notice.isPinned ? ' is-active' : ''}" aria-label="고정 토글" title="고정 토글">📌</button>
      </div>
      <p class="notice-item__content">${highlightKeywords(notice.content)}</p>
      <div class="notice-item__meta">
        <span>${escapeHtml(notice.author || '작성자 미입력')}</span>
        <span>${formatTime(notice.updatedAt || notice.createdAt)}</span>
      </div>
    `;

    itemEl.querySelector('.notice-pin-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      toggleNoticePin(notice.id);
    });
    itemEl.addEventListener('click', () => openNoticeModal(notice));
    container.appendChild(itemEl);
  });
}

function renderSummary() {
  const visible = getVisibleCards();
  const urgentCards = visible.filter((card) => card.columnId === 'urgent');
  const urgentCount = urgentCards.length;
  const unackedUrgentCount = urgentCards.filter((card) => (card.acknowledgments || []).length === 0).length;
  const progressCount = visible.filter((card) => card.columnId === 'progress').length;
  const doneCount = visible.filter((card) => card.columnId === 'done').length;

  summaryBarEl.innerHTML = `
    <div class="summary__chip">🔴 긴급 <strong>${urgentCount}</strong>건</div>
    ${
      unackedUrgentCount > 0
        ? `<div class="summary__chip summary__chip--warn">⚠️ 미확인 긴급 <strong>${unackedUrgentCount}</strong>건</div>`
        : ''
    }
    <div class="summary__chip">🟡 진행중 <strong>${progressCount}</strong>건</div>
    <div class="summary__chip">✅ 완료 <strong>${doneCount}</strong>건</div>
    <div class="summary__chip">전체 <strong>${visible.length}</strong>건</div>
  `;
}

function renderBoard() {
  boardEl.innerHTML = '';

  COLUMNS.forEach((column) => {
    const columnCards = getVisibleCards()
      .filter((card) => card.columnId === column.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    const columnEl = document.createElement('section');
    columnEl.className = `column ${column.className}`;
    columnEl.dataset.columnId = column.id;

    columnEl.innerHTML = `
      <div class="column__header">
        <h2 class="column__title">${column.title}</h2>
        <span class="column__count">${columnCards.length}</span>
      </div>
      <p class="column__hint">${column.hint}</p>
      <div class="column__list" data-dropzone="${column.id}"></div>
    `;

    const listEl = columnEl.querySelector('.column__list');
    setupDropzone(listEl, column.id);

    if (columnCards.length === 0) {
      listEl.innerHTML = '<div class="empty-state">카드를 여기로 드래그하거나<br>+ 새 인수인계로 추가하세요</div>';
    } else {
      columnCards.forEach((card) => {
        listEl.appendChild(createCardElement(card));
      });
    }

    boardEl.appendChild(columnEl);
  });
}

function createCardElement(card) {
  const cardEl = document.createElement('article');
  const isUrgent = card.columnId === 'urgent';
  const acks = card.acknowledgments || [];
  const isUnacked = isUrgent && acks.length === 0;
  const staleLevel = getStaleLevel(card);
  const hasKeyword = cardHasKeyword(card);
  const overdue = isCardOverdue(card);

  cardEl.className = `card${isUnacked ? ' card--unacked' : ''}${staleLevel ? ` card--stale-${staleLevel}` : ''}${hasKeyword ? ' card--keyword' : ''}${overdue ? ' card--overdue' : ''}`;
  cardEl.draggable = true;
  cardEl.dataset.cardId = String(card.id);

  const ackHtml = isUrgent
    ? `
      <div class="card__ack">
        ${
          acks.length > 0
            ? `<div class="card__ack-list">${acks
                .map(
                  (ack) =>
                    `<div class="card__ack-item">✓ 확인 — ${escapeHtml(ack.shift)} ${escapeHtml(ack.staffName)} · ${formatTime(ack.acknowledgedAt)}</div>`
                )
                .join('')}</div>`
            : ''
        }
        <button type="button" class="card__ack-btn">✓ 긴급 확인</button>
      </div>
    `
    : '';

  const metaBadges = [
    card.details?.trim() ? '<span class="card__detail-badge">상세</span>' : '',
    (card.comments || []).length ? `<span class="card__detail-badge">기록 ${card.comments.length}</span>` : '',
    (card.attachments || []).length ? `<span class="card__detail-badge">📷 ${card.attachments.length}</span>` : '',
    hasKeyword ? '<span class="card__detail-badge card__detail-badge--alert">주의</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  cardEl.innerHTML = `
    <div class="card__header">
      <div class="card__tags">
        <span class="badge badge--${card.priority}">${PRIORITY_LABELS[card.priority] || card.priority}</span>
        <span class="badge badge--category">${escapeHtml(card.category)}</span>
        ${
          card.columnId !== 'done'
            ? `<span class="card__elapsed">${formatElapsed(card.updatedAt || card.createdAt)}</span>`
            : ''
        }
      </div>
      ${card.room ? `<div class="card__room">${highlightText(card.room)}</div>` : ''}
    </div>
    <p class="card__title">${highlightText(card.title)}</p>
    ${metaBadges ? `<div class="card__badges">${metaBadges}</div>` : ''}
    ${
      formatAssigneeLabel(card)
        ? `<div class="card__assignee"><span class="card__action-label">담당</span><span>${escapeHtml(formatAssigneeLabel(card))}</span></div>`
        : ''
    }
    ${
      card.dueAt
        ? `<div class="card__due${overdue ? ' card__due--overdue' : ''}"><span class="card__action-label">마감</span><span>${escapeHtml(formatDueLabel(card.dueAt, overdue))}</span></div>`
        : ''
    }
    ${
      card.columnId === 'done' && card.resolution
        ? `<div class="card__resolution"><span class="card__action-label">결과</span><span>${highlightText(card.resolution)}</span></div>`
        : ''
    }
    ${
      card.nextAction
        ? `<div class="card__action"><span class="card__action-label">다음</span><span>${highlightText(card.nextAction)}</span></div>`
        : ''
    }
    <div class="card__meta">
      <span>${escapeHtml(card.author || '작성자 미입력')}</span>
      <span>${formatTime(card.updatedAt || card.createdAt)}</span>
    </div>
    ${ackHtml}
  `;

  const ackBtn = cardEl.querySelector('.card__ack-btn');
  if (ackBtn) {
    ackBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      acknowledgeCard(card.id);
    });
  }

  cardEl.addEventListener('dragstart', (event) => {
    draggedCardId = card.id;
    cardEl.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(card.id));
  });

  cardEl.addEventListener('dragend', () => {
    draggedCardId = null;
    cardEl.classList.remove('is-dragging');
    document.querySelectorAll('.column__list.is-drag-over').forEach((el) => {
      el.classList.remove('is-drag-over');
    });
  });

  cardEl.addEventListener('click', () => openModal(card));

  return cardEl;
}

function setupDropzone(listEl, columnId) {
  listEl.addEventListener('dragover', (event) => {
    event.preventDefault();
    listEl.classList.add('is-drag-over');
    event.dataTransfer.dropEffect = 'move';
  });

  listEl.addEventListener('dragleave', (event) => {
    if (!listEl.contains(event.relatedTarget)) {
      listEl.classList.remove('is-drag-over');
    }
  });

  listEl.addEventListener('drop', async (event) => {
    event.preventDefault();
    listEl.classList.remove('is-drag-over');

    const cardId = Number(event.dataTransfer.getData('text/plain') || draggedCardId);
    if (!cardId) return;

    const card = cards.find((item) => item.id === cardId);
    if (!card || card.columnId === columnId) {
      if (card && card.columnId === columnId) {
        await reorderWithinColumn(listEl, columnId);
      }
      return;
    }

    const targetCards = cards
      .filter((item) => item.columnId === columnId && item.id !== cardId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    const afterElement = getDragAfterElement(listEl, event.clientY);
    let sortOrder = targetCards.length;

    if (afterElement) {
      const afterId = Number(afterElement.dataset.cardId);
      const afterIndex = targetCards.findIndex((item) => item.id === afterId);
      sortOrder = afterIndex >= 0 ? afterIndex : targetCards.length;
    }

    try {
      let resolution = '';
      if (columnId === 'done' && card.columnId !== 'done') {
        resolution = prompt('처리 결과를 입력해 주세요.');
        if (!resolution || !resolution.trim()) {
          showToast('완료 처리 시 처리 결과를 입력해야 합니다.');
          return;
        }
        resolution = resolution.trim();
      }

      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, sortOrder, resolution, ...getAuditPayload() }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '이동 실패');
      }
      const updated = await response.json();
      cards = cards.map((item) => (item.id === updated.id ? updated : item));
      await normalizeColumnOrder(columnId);
      await loadCards();
      showToast('상태가 변경되었습니다.');
    } catch {
      showToast('이동에 실패했습니다.');
    }
  });
}

async function reorderWithinColumn(listEl, columnId) {
  const orderedIds = [...listEl.querySelectorAll('.card')]
    .map((el) => Number(el.dataset.cardId))
    .filter(Boolean);

  if (orderedIds.length === 0) return;

  try {
    await fetch('/api/cards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId, orderedIds }),
    });
    await loadCards();
  } catch {
    showToast('순서 변경에 실패했습니다.');
  }
}

async function normalizeColumnOrder(columnId) {
  const orderedIds = cards
    .filter((card) => card.columnId === columnId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((card) => card.id);

  if (orderedIds.length === 0) return;

  await fetch('/api/cards/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId, orderedIds }),
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.card:not(.is-dragging)')];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function getVisibleCards() {
  const query = searchInput.value.trim().toLowerCase();

  return cards.filter((card) => {
    const haystack = [
      card.room,
      card.title,
      card.details,
      card.nextAction,
      card.author,
      card.category,
      card.assigneeName,
      card.assigneeShift,
    ]
      .join(' ')
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);

    if (!matchesQuery) return false;

    if (activeQuickFilter === 'unacked') {
      return card.columnId === 'urgent' && !(card.acknowledgments || []).length;
    }

    if (activeQuickFilter === 'mine') {
      return cardMatchesMine(card);
    }

    if (activeQuickFilter === 'roomclean') {
      return matchesRoomCleanFilter(card);
    }

    if (activeQuickFilter !== 'all') {
      return card.category === activeQuickFilter;
    }

    const category = categoryFilter.value;
    return !category || card.category === category;
  });
}

function cardMatchesMine(card) {
  if (card.columnId === 'done') return false;
  const shift = currentSession.shift;
  const name = currentSession.name;
  if (!shift && !name) return false;
  if (card.assigneeName && name && card.assigneeName === name) return true;
  if (card.assigneeShift && shift && card.assigneeShift === shift && !card.assigneeName) return true;
  if (card.assigneeShift && shift && card.assigneeName && name) {
    return card.assigneeShift === shift && card.assigneeName === name;
  }
  return false;
}

function matchesRoomCleanFilter(card) {
  if (card.columnId === 'done') return false;
  const text = [card.title, card.details, card.nextAction, card.category].join(' ').toLowerCase();
  return /클린|청소|clean|dirty|룸클린|하우스키핑|hk/.test(text);
}

function normalizeRoomKey(room) {
  const trimmed = String(room || '').trim();
  return trimmed || '미지정';
}

function setHandoverViewMode(mode) {
  handoverViewMode = mode === 'room' ? 'room' : 'board';
  render();
}

function renderRoomView() {
  const visible = getVisibleCards().filter((card) => card.columnId !== 'done');
  const groups = new Map();

  visible.forEach((card) => {
    const key = normalizeRoomKey(card.room);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  });

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === '미지정') return 1;
    if (b === '미지정') return -1;
    return a.localeCompare(b, 'ko', { numeric: true });
  });

  if (!sortedKeys.length) {
    roomViewEl.innerHTML = '<div class="room-view__empty">표시할 업무가 없습니다. 필터를 바꾸거나 새 인수인계를 추가해 주세요.</div>';
    return;
  }

  if (!selectedRoomKey || !groups.has(selectedRoomKey)) {
    selectedRoomKey = sortedKeys[0];
  }

  roomViewEl.innerHTML = `
    <div class="room-view__layout">
      <aside class="room-view__sidebar">
        <div class="room-view__sidebar-header">
          <h3>객실 목록</h3>
          <span>${sortedKeys.length}개</span>
        </div>
        <div class="room-view__rooms">
          ${sortedKeys
            .map((key) => {
              const roomCards = groups.get(key);
              const urgentCount = roomCards.filter((card) => card.columnId === 'urgent').length;
              return `
                <button type="button" class="room-chip${selectedRoomKey === key ? ' is-active' : ''}${urgentCount ? ' room-chip--urgent' : ''}" data-room-key="${escapeHtml(key)}">
                  <span class="room-chip__name">${escapeHtml(key)}</span>
                  <span class="room-chip__count">${roomCards.length}건</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </aside>
      <div class="room-view__timeline" id="roomTimeline"></div>
    </div>
  `;

  roomViewEl.querySelectorAll('[data-room-key]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedRoomKey = button.dataset.roomKey;
      renderRoomView();
    });
  });

  renderRoomTimeline(groups.get(selectedRoomKey) || [], selectedRoomKey);
}

function renderRoomTimeline(roomCards, roomKey) {
  const timelineEl = document.getElementById('roomTimeline');
  if (!timelineEl) return;

  const sortedCards = [...roomCards].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  );

  timelineEl.innerHTML = `
    <div class="room-timeline__header">
      <h3>${escapeHtml(roomKey)}</h3>
      <span>${sortedCards.length}건 · 최신순</span>
    </div>
    <div class="room-timeline__list">
      ${
        sortedCards.length
          ? sortedCards.map((card) => renderRoomTimelineItem(card)).join('')
          : '<div class="room-view__empty">이 객실에 표시할 업무가 없습니다.</div>'
      }
    </div>
  `;

  timelineEl.querySelectorAll('[data-open-card]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = cards.find((item) => item.id === Number(button.dataset.openCard));
      if (card) openModal(card);
    });
  });
}

function renderRoomTimelineItem(card) {
  const overdue = isCardOverdue(card);
  return `
    <article class="room-timeline-item room-timeline-item--${card.columnId}${overdue ? ' room-timeline-item--overdue' : ''}">
      <div class="room-timeline-item__top">
        <span class="badge badge--${card.priority}">${PRIORITY_LABELS[card.priority] || card.priority}</span>
        <span class="badge badge--category">${escapeHtml(card.category)}</span>
        <span class="room-timeline-item__status">${COLUMN_LABELS[card.columnId] || card.columnId}</span>
      </div>
      <p class="room-timeline-item__title">${highlightText(card.title)}</p>
      ${card.nextAction ? `<p class="room-timeline-item__action">다음: ${highlightText(card.nextAction)}</p>` : ''}
      <div class="room-timeline-item__meta">
        ${formatAssigneeLabel(card) ? `<span>${escapeHtml(formatAssigneeLabel(card))}</span>` : ''}
        ${formatDueLabel(card.dueAt, overdue) ? `<span class="${overdue ? 'card__due--overdue' : ''}">${escapeHtml(formatDueLabel(card.dueAt, overdue))}</span>` : ''}
        <span>${formatTime(card.updatedAt || card.createdAt)}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--small" data-open-card="${card.id}">카드 열기</button>
    </article>
  `;
}

async function loadCardTemplates() {
  try {
    const response = await fetch('/api/card-templates');
    if (!response.ok) throw new Error('load failed');
    cardTemplates = await response.json();
    renderTemplateButtons();
  } catch {
    cardTemplates = [];
    renderTemplateButtons();
  }
}

function renderTemplateButtons() {
  if (!templateList) return;
  templateList.innerHTML = '';

  if (!cardTemplates.length) {
    templateList.innerHTML = '<span class="template-bar__empty">설정 탭에서 템플릿을 추가하세요.</span>';
    return;
  }

  cardTemplates.forEach((template) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-btn';
    button.textContent = template.label;
    button.addEventListener('click', () => applyCardTemplate(template));
    templateList.appendChild(button);
  });
}

function syncQuickFilterButtons() {
  quickFiltersEl.querySelectorAll('.quick-filter').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === activeQuickFilter);
  });
}

function applyCardTemplate(template) {
  cardForm.priority.value = template.priority;
  cardForm.columnId.value = template.columnId;
  cardForm.category.value = template.category;
  cardForm.title.value = template.title;
  cardForm.nextAction.value = template.nextAction || '';
  cardForm.details.value = template.details || '';
  syncResolutionField();
  cardForm.room.focus();
  showToast(`${template.label} 템플릿이 적용되었습니다.`);
}

function openModal(card = null) {
  if (!card && !requireSession('인수인계 추가')) return;

  editingId = card?.id ?? null;
  modalTitle.textContent = card ? '인수인계 수정' : '새 인수인계';
  deleteCardBtn.classList.toggle('hidden', !card);
  deleteCardNote.classList.toggle('hidden', !card);
  duplicateCardBtn.classList.toggle('hidden', !card);
  templateBar.classList.toggle('hidden', Boolean(card));
  cardExtraSection.classList.toggle('hidden', !card);

  cardForm.priority.value = card?.priority || 'urgent';
  cardForm.columnId.value = card?.columnId || 'urgent';
  cardForm.category.value = card?.category || '기타';
  cardForm.room.value = card?.room || '';
  cardForm.title.value = card?.title || '';
  cardForm.details.value = card?.details || '';
  cardForm.resolution.value = card?.resolution || '';
  cardForm.nextAction.value = card?.nextAction || '';
  cardAssigneeShift.value = card?.assigneeShift || currentSession.shift || '';
  cardAssigneeName.value = card?.assigneeName || (!card ? currentSession.name : '') || '';
  cardDueAt.value = card?.dueAt ? toDatetimeLocalValue(card.dueAt) : '';
  cardAuthorField.value = card?.author || getSessionAuthorLabel() || currentSession.shift || '';

  syncResolutionField();
  if (card) {
    renderCardComments(card.comments || []);
    renderCardAttachments(card.attachments || []);
  } else {
    cardCommentsList.innerHTML = '';
    cardAttachmentsList.innerHTML = '';
  }

  cardModal.showModal();
  cardForm.title.focus();
}

function syncResolutionField() {
  const isDone = cardForm.columnId.value === 'done';
  resolutionField.classList.toggle('hidden', !isDone);
  cardForm.resolution.required = isDone;
}

function renderCardComments(comments) {
  if (!comments.length) {
    cardCommentsList.innerHTML = '<div class="card-extra__empty">아직 추가 기록이 없습니다.</div>';
    return;
  }

  cardCommentsList.innerHTML = comments
    .map(
      (comment) => `
        <div class="card-comment">
          <p class="card-comment__content">${escapeHtml(comment.content)}</p>
          <p class="card-comment__meta">${escapeHtml(comment.shift)} · ${escapeHtml(comment.staffName)} · ${formatTime(comment.createdAt)}</p>
        </div>
      `
    )
    .join('');
}

function renderCardAttachments(attachments) {
  if (!attachments.length) {
    cardAttachmentsList.innerHTML = '';
    return;
  }

  cardAttachmentsList.innerHTML = attachments
    .map(
      (file) => `
        <div class="card-attachment">
          <a href="${escapeHtml(file.url)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.filename)}" />
          </a>
          <button type="button" class="card-attachment__delete" data-attachment-id="${file.id}">삭제</button>
        </div>
      `
    )
    .join('');

  cardAttachmentsList.querySelectorAll('.card-attachment__delete').forEach((button) => {
    button.addEventListener('click', () => deleteCardAttachment(Number(button.dataset.attachmentId)));
  });
}

async function submitCardComment(event) {
  event?.preventDefault?.();
  if (!editingId || !requireSession('추가 기록')) return;

  const content = cardCommentInput.value.trim();
  if (!content) return;

  try {
    const response = await fetch(`/api/cards/${editingId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        shift: currentSession.shift,
        staffName: currentSession.name,
        audit: { shift: currentSession.shift, staffName: currentSession.name },
      }),
    });
    const updated = await response.json();
    if (!response.ok) throw new Error(updated.error || '기록 실패');

    cardCommentInput.value = '';
    cards = cards.map((item) => (item.id === updated.id ? updated : item));
    renderCardComments(updated.comments || []);
    render();
    showToast('추가 기록이 저장되었습니다.');
  } catch (error) {
    showToast(error.message || '기록에 실패했습니다.');
  }
}

async function uploadCardAttachment() {
  if (!editingId || !requireSession('사진 추가')) return;

  const file = cardAttachmentInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 등록할 수 있습니다.');
    cardAttachmentInput.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('2MB 이하 이미지만 등록할 수 있습니다.');
    cardAttachmentInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const response = await fetch(`/api/cards/${editingId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: reader.result,
          mimeType: file.type,
          filename: file.name,
        }),
      });
      const attachment = await response.json();
      if (!response.ok) throw new Error(attachment.error || '업로드 실패');

      await loadCards();
      const card = cards.find((item) => item.id === editingId);
      renderCardAttachments(card?.attachments || []);
      showToast('사진이 추가되었습니다.');
    } catch (error) {
      showToast(error.message || '사진 추가에 실패했습니다.');
    } finally {
      cardAttachmentInput.value = '';
    }
  };
  reader.readAsDataURL(file);
}

async function deleteCardAttachment(attachmentId) {
  if (!confirm('이 사진을 삭제할까요?')) return;

  try {
    const response = await fetch(`/api/cards/${editingId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('삭제 실패');
    await loadCards();
    const card = cards.find((item) => item.id === editingId);
    renderCardAttachments(card?.attachments || []);
    showToast('사진을 삭제했습니다.');
  } catch {
    showToast('사진 삭제에 실패했습니다.');
  }
}

async function duplicateCurrentCard() {
  if (!editingId || !requireSession('복제')) return;

  try {
    const response = await fetch(`/api/cards/${editingId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: getSessionAuthorLabel(),
        audit: { shift: currentSession.shift, staffName: currentSession.name },
      }),
    });
    const card = await response.json();
    if (!response.ok) throw new Error(card.error || '복제 실패');

    closeModal();
    await loadCards();
    showToast('카드가 복제되었습니다.');
  } catch (error) {
    showToast(error.message || '복제에 실패했습니다.');
  }
}

async function refreshPinnedContacts() {
  try {
    const response = await fetch('/api/contacts/pinned');
    const contacts = await response.json();
    if (!contacts.length) {
      pinnedContactsBar.classList.add('hidden');
      return;
    }

    pinnedContactsBar.classList.remove('hidden');
    pinnedContactsList.innerHTML = contacts
      .map(
        (contact) => `
          <a class="pinned-contact" href="tel:${String(contact.phone).replace(/[^\d+]/g, '')}">
            <span class="pinned-contact__name">${escapeHtml(contact.name)}</span>
            <span class="pinned-contact__phone">${escapeHtml(contact.phone)}</span>
          </a>
        `
      )
      .join('');
  } catch {
    pinnedContactsBar.classList.add('hidden');
  }
}

function cardHasKeyword(card) {
  const text = [card.title, card.details, card.nextAction, card.category, card.room].join(' ');
  return HIGHLIGHT_KEYWORDS.some((keyword) => text.includes(keyword));
}

function highlightKeywords(text) {
  return highlightText(text);
}

function highlightText(text) {
  let html = escapeHtml(text || '');
  const query = searchInput.value.trim();
  if (query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    html = html.replace(regex, '<mark class="search-mark">$1</mark>');
  }
  HIGHLIGHT_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    html = html.replace(regex, '<mark class="keyword-mark">$1</mark>');
  });
  return html;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatAssigneeLabel(card) {
  if (card.assigneeShift && card.assigneeName) return `${card.assigneeShift} · ${card.assigneeName}`;
  if (card.assigneeName) return card.assigneeName;
  if (card.assigneeShift) return `${card.assigneeShift} 교대`;
  return '';
}

function formatDueLabel(value, overdue = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const label = date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return overdue ? `⚠️ ${label} 지남` : `${label}까지`;
}

function isCardOverdue(card) {
  if (!card.dueAt || card.columnId === 'done') return false;
  const due = new Date(card.dueAt);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

function toDatetimeLocalValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatElapsed(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}분 경과`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 경과`;

  const days = Math.floor(hours / 24);
  return `${days}일 경과`;
}

function getStaleLevel(card) {
  if (card.columnId === 'done') return '';

  const date = new Date(card.updatedAt || card.createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const hours = (Date.now() - date.getTime()) / 3600000;
  if (hours >= 12) return 'high';
  if (hours >= 4) return 'mid';
  return '';
}

function closeModal() {
  cardModal.close();
  editingId = null;
  cardForm.reset();
}

async function saveCard(event) {
  event.preventDefault();
  if (!requireSession('저장')) return;

  const payload = {
    priority: cardForm.priority.value,
    columnId: cardForm.columnId.value,
    category: cardForm.category.value,
    room: cardForm.room.value.trim(),
    title: cardForm.title.value.trim(),
    details: cardForm.details.value.trim(),
    resolution: cardForm.resolution.value.trim(),
    nextAction: cardForm.nextAction.value.trim(),
    assigneeShift: cardAssigneeShift.value,
    assigneeName: cardAssigneeName.value.trim(),
    dueAt: cardDueAt.value ? new Date(cardDueAt.value).toISOString() : null,
    author: getSessionAuthorLabel() || cardAuthorField.value,
    ...getAuditPayload(),
  };

  if (payload.columnId === 'done' && !payload.resolution) {
    showToast('완료 칸으로 저장하려면 처리 결과를 입력해 주세요.');
    return;
  }

  try {
    const response = await fetch(editingId ? `/api/cards/${editingId}` : '/api/cards', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '저장 실패');
    }

    closeModal();
    await loadCards();
    showToast(editingId ? '수정되었습니다.' : '인수인계가 추가되었습니다.');
  } catch (error) {
    showToast(error.message || '저장에 실패했습니다.');
  }
}

async function deleteCurrentCard() {
  if (!editingId) return;

  const reason = await requestDeleteReason('이 인수인계를 삭제합니다.');
  if (!reason) return;

  try {
    const response = await fetch(`/api/cards/${editingId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getAuditPayload({ reason })),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '삭제 실패');
    }
    closeModal();
    await loadAll();
    showToast('삭제되었습니다. 변경 기록에 남았습니다.');
  } catch (error) {
    showToast(error.message || '삭제에 실패했습니다.');
  }
}

async function clearDoneCards() {
  const doneCount = cards.filter((card) => card.columnId === 'done').length;
  if (doneCount === 0) {
    showToast('완료 칸이 비어 있습니다.');
    return;
  }
  if (!requireSession('완료 칸 비우기')) return;
  if (!confirm(`완료 칸 ${doneCount}건을 모두 비울까요?\n기록에 남습니다.`)) return;

  try {
    const response = await fetch('/api/cards/clear-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getAuditPayload()),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '완료 칸 비우기 실패');
    }
    await loadAll();
    showToast('완료 칸을 비웠습니다.');
  } catch (error) {
    showToast(error.message || '완료 칸 비우기에 실패했습니다.');
  }
}

function openNoticeModal(notice = null, type = notice?.type || 'announcement') {
  if (!notice && !requireSession('공지 등록')) return;

  editingNoticeId = notice?.id ?? null;
  const labels = NOTICE_LABELS[type];

  noticeModalTitle.textContent = notice ? labels.edit : labels.add;
  noticeContentLabel.textContent = `${labels.title} 내용 *`;
  noticeTypeInput.value = type;
  deleteNoticeBtn.classList.toggle('hidden', !notice);
  deleteNoticeNote.classList.toggle('hidden', !notice);
  noticeForm.content.value = notice?.content || '';
  noticeForm.author.value = notice?.author || getSessionAuthorLabel() || currentSession.shift || '';
  noticeForm.expiresAt.value = notice?.expiresAt || '';
  noticeForm.isPinned.checked = Boolean(notice?.isPinned);

  noticeModal.showModal();
  noticeForm.content.focus();
}

function closeNoticeModal() {
  noticeModal.close();
  editingNoticeId = null;
  noticeForm.reset();
}

async function saveNotice(event) {
  event.preventDefault();
  if (!requireSession('저장')) return;

  const payload = {
    type: noticeTypeInput.value,
    content: noticeForm.content.value.trim(),
    author: getSessionAuthorLabel() || noticeForm.author.value,
    expiresAt: noticeForm.expiresAt.value || null,
    isPinned: noticeForm.isPinned.checked,
    ...getAuditPayload(),
  };

  try {
    const response = await fetch(
      editingNoticeId ? `/api/notices/${editingNoticeId}` : '/api/notices',
      {
        method: editingNoticeId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '저장 실패');
    }

    closeNoticeModal();
    await loadAll();
    showToast(editingNoticeId ? '수정되었습니다.' : '등록되었습니다.');
  } catch (error) {
    showToast(error.message || '저장에 실패했습니다.');
  }
}

async function deleteCurrentNotice() {
  if (!editingNoticeId) return;

  const reason = await requestDeleteReason('이 공지/변경 항목을 삭제합니다.');
  if (!reason) return;

  try {
    const response = await fetch(`/api/notices/${editingNoticeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getAuditPayload({ reason })),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '삭제 실패');
    }
    closeNoticeModal();
    await loadAll();
    showToast('삭제되었습니다. 변경 기록에 남았습니다.');
  } catch (error) {
    showToast(error.message || '삭제에 실패했습니다.');
  }
}

async function toggleNoticePin(id) {
  if (!requireSession('고정 변경')) return;

  try {
    const response = await fetch(`/api/notices/${id}/toggle-pin`, { method: 'POST' });
    if (!response.ok) throw new Error('고정 변경 실패');
    await loadAll();
    showToast('고정 상태가 변경되었습니다.');
  } catch {
    showToast('고정 변경에 실패했습니다.');
  }
}

async function acknowledgeCard(cardId) {
  if (!requireSession('긴급 확인')) return;

  try {
    const response = await fetch(`/api/cards/${cardId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift: currentSession.shift,
        staffName: currentSession.name,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '확인 실패');
    }

    await loadAll();
    showToast('긴급 건 확인이 기록되었습니다.');
  } catch (error) {
    showToast(error.message || '확인에 실패했습니다.');
  }
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function buildShiftSummaryData() {
  const todayCards = cards.filter((card) => isToday(card.createdAt) || isToday(card.updatedAt));
  const unackedUrgent = cards.filter(
    (card) => card.columnId === 'urgent' && !(card.acknowledgments || []).length
  );
  const urgentActive = cards.filter((card) => card.columnId === 'urgent');
  const progressActive = cards.filter((card) => card.columnId === 'progress');
  const doneToday = todayCards.filter((card) => card.columnId === 'done');
  const todayActive = todayCards.filter((card) => card.columnId !== 'done');
  const announcements = notices.filter((notice) => notice.type === 'announcement');
  const pinnedAnnouncements = announcements.filter((notice) => notice.isPinned);
  const changes = notices.filter((notice) => notice.type === 'change');

  return {
    todayCards,
    todayActive,
    unackedUrgent,
    urgentActive,
    progressActive,
    doneToday,
    announcements,
    pinnedAnnouncements,
    changes,
  };
}

function renderShiftSummaryItem(card, warn = false) {
  return `
    <div class="shift-item${warn ? ' shift-item--warn' : ''}">
      <div class="shift-item__top">
        <span class="shift-item__status">${COLUMN_LABELS[card.columnId] || card.columnId} · ${escapeHtml(card.category)}</span>
        ${card.room ? `<span class="shift-item__room">${escapeHtml(card.room)}</span>` : ''}
      </div>
      <p class="shift-item__title">${escapeHtml(card.title)}</p>
      ${card.nextAction ? `<p class="shift-item__action">다음: ${escapeHtml(card.nextAction)}</p>` : ''}
      <p class="shift-item__meta">${escapeHtml(card.author || '작성자 미입력')} · ${formatTime(card.updatedAt || card.createdAt)}</p>
    </div>
  `;
}

function renderShiftNoticeItem(notice) {
  const tags = [
    notice.isPinned ? '📌 고정' : '',
    notice.type === 'change' ? '변경' : '공지',
  ]
    .filter(Boolean)
    .join(' · ');

  return `
    <div class="shift-item">
      <div class="shift-item__top">
        <span class="shift-item__status">${escapeHtml(tags)}</span>
      </div>
      <p class="shift-item__title">${escapeHtml(notice.content)}</p>
      <p class="shift-item__meta">${escapeHtml(notice.author || '작성자 미입력')} · ${formatTime(notice.updatedAt || notice.createdAt)}</p>
    </div>
  `;
}

function renderShiftSection(title, subtitle, items, warn = false) {
  if (!items.length) return '';

  const itemsHtml = items
    .map((item) =>
      item.columnId !== undefined
        ? renderShiftSummaryItem(item, warn && !(item.acknowledgments || []).length)
        : item.summary !== undefined
          ? renderShiftActivityItem(item)
          : renderShiftNoticeItem(item)
    )
    .join('');

  return `
    <section class="shift-section${warn ? ' shift-section--warn' : ''}">
      <div class="shift-section__header">
        <h3>${title} (${items.length}건)</h3>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      <div class="shift-section__list">${itemsHtml}</div>
    </section>
  `;
}

function renderShiftActivityItem(log) {
  const detail = formatActivityDetail(log);
  const actor = log.shift && log.staffName ? `${log.shift} · ${log.staffName}` : '작성자 미입력';

  return `
    <div class="shift-item">
      <div class="shift-item__top">
        <span class="shift-item__status">${escapeHtml(ACTION_LABELS[log.action] || log.action)} · ${formatTime(log.createdAt)}</span>
      </div>
      <p class="shift-item__title">${escapeHtml(log.summary)}</p>
      <p class="shift-item__meta">${escapeHtml(actor)}${detail ? ` · ${escapeHtml(detail)}` : ''}</p>
    </div>
  `;
}

function getSummaryMetaLine() {
  const now = new Date();
  const sessionLabel = getSessionAuthorLabel() || '근무자 미선택';
  return `${getTodayLabel()} · ${sessionLabel} · ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderSummaryStatsHtml(data) {
  return `
    ${data.unackedUrgent.length > 0 ? `<div class="shift-stat shift-stat--warn">⚠️ 미확인 긴급 <strong>${data.unackedUrgent.length}</strong>건</div>` : ''}
    <div class="shift-stat">🔴 긴급 <strong>${data.urgentActive.length}</strong>건</div>
    <div class="shift-stat">🟡 진행중 <strong>${data.progressActive.length}</strong>건</div>
    <div class="shift-stat">📋 오늘 업무 <strong>${data.todayCards.length}</strong>건</div>
    <div class="shift-stat">✅ 오늘 완료 <strong>${data.doneToday.length}</strong>건</div>
  `;
}

function buildSummarySections(data, activityLogs = []) {
  return [
    renderShiftSection(
      '⚠️ 미확인 긴급',
      '교대 시작 후 카드에서 ✓ 긴급 확인을 눌러 주세요.',
      data.unackedUrgent,
      true
    ),
    renderShiftSection('🔴 현재 긴급', '긴급 칸에 남아 있는 업무입니다.', data.urgentActive),
    renderShiftSection('🟡 현재 진행중', '진행중 칸의 업무입니다.', data.progressActive),
    renderShiftSection(
      '📢 업무 공지',
      data.pinnedAnnouncements.length > 0 ? `고정 공지 ${data.pinnedAnnouncements.length}건 포함` : '',
      data.announcements
    ),
    renderShiftSection('🔄 업무 변경', '운영·절차 변경 사항입니다.', data.changes),
    renderShiftSection('✅ 오늘 완료', '오늘 처리 완료된 업무입니다.', data.doneToday),
    renderShiftSection('📝 오늘 변경 기록', '추가 · 수정 · 삭제 · 이동 내역입니다.', activityLogs),
  ].filter(Boolean);
}

function renderSummaryCardText(card) {
  const lines = [];
  const prefix = card.room ? `[${card.room}] ` : '';
  lines.push(`- ${prefix}${card.title}`);
  lines.push(`  ${COLUMN_LABELS[card.columnId] || card.columnId} · ${card.category}`);
  if (card.details?.trim()) lines.push(`  상세: ${card.details.trim()}`);
  if (card.nextAction) lines.push(`  다음: ${card.nextAction}`);
  lines.push(`  ${card.author || '작성자 미입력'} · ${formatTime(card.updatedAt || card.createdAt)}`);
  return lines.join('\n');
}

function renderSummaryNoticeText(notice) {
  const tags = [notice.isPinned ? '📌 고정' : '', notice.type === 'change' ? '변경' : '공지']
    .filter(Boolean)
    .join(' · ');
  return [
    `- ${notice.content}`,
    `  ${tags || '공지'} · ${notice.author || '작성자 미입력'} · ${formatTime(notice.updatedAt || notice.createdAt)}`,
  ].join('\n');
}

function renderSummaryActivityText(log) {
  const detail = formatActivityDetail(log);
  const actor = log.shift && log.staffName ? `${log.shift} · ${log.staffName}` : '작성자 미입력';
  return `- [${ACTION_LABELS[log.action] || log.action}] ${log.summary}\n  ${actor} · ${formatTime(log.createdAt)}${detail ? ` · ${detail}` : ''}`;
}

function buildSummaryText(data, activityLogs = []) {
  const sections = [
    ['⚠️ 미확인 긴급', data.unackedUrgent, renderSummaryCardText],
    ['🔴 현재 긴급', data.urgentActive, renderSummaryCardText],
    ['🟡 현재 진행중', data.progressActive, renderSummaryCardText],
    ['📢 업무 공지', data.announcements, renderSummaryNoticeText],
    ['🔄 업무 변경', data.changes, renderSummaryNoticeText],
    ['✅ 오늘 완료', data.doneToday, renderSummaryCardText],
    ['📝 오늘 변경 기록', activityLogs, renderSummaryActivityText],
  ];

  const lines = [
    '프런트 인수인계 일일 요약',
    getSummaryMetaLine(),
    '',
    '[요약]',
    `미확인 긴급 ${data.unackedUrgent.length}건 · 긴급 ${data.urgentActive.length}건 · 진행중 ${data.progressActive.length}건 · 오늘 완료 ${data.doneToday.length}건`,
    '',
  ];

  sections.forEach(([title, items, formatter]) => {
    if (!items.length) return;
    lines.push(`${title} (${items.length}건)`);
    items.forEach((item) => lines.push(formatter(item)));
    lines.push('');
  });

  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length <= 6) {
    lines.push('표시할 업무가 없습니다.');
  }

  return lines.join('\n');
}

function getExportFilename(ext) {
  const date = new Date().toISOString().slice(0, 10);
  return `인수인계_${date}.${ext}`;
}

function downloadTextFile(content, filename) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function fetchTodayActivityLogs() {
  try {
    const response = await fetch('/api/activity-logs?limit=200');
    if (!response.ok) return [];
    const logs = await response.json();
    return logs.filter((log) => isToday(log.createdAt));
  } catch {
    return [];
  }
}

let exportActivityLogs = [];

async function openExportSummaryModal() {
  const data = buildShiftSummaryData();
  exportActivityLogs = await fetchTodayActivityLogs();

  exportSummaryMeta.textContent = getSummaryMetaLine();
  exportSummaryStats.innerHTML = renderSummaryStatsHtml(data);

  const sections = buildSummarySections(data, exportActivityLogs);
  exportSummaryPreview.innerHTML =
    sections.join('') ||
    '<div class="shift-empty">오늘 표시할 업무가 없습니다. 보드에서 새 인수인계를 추가해 주세요.</div>';

  exportSummaryModal.showModal();
}

function closeExportSummaryModal() {
  exportSummaryModal.close();
}

function exportSummaryAsText() {
  const data = buildShiftSummaryData();
  downloadTextFile(buildSummaryText(data, exportActivityLogs), getExportFilename('txt'));
  showToast('텍스트 파일을 저장했습니다.');
}

function buildPrintDocumentHtml() {
  const data = buildShiftSummaryData();
  const sections = buildSummarySections(data, exportActivityLogs);
  const content =
    sections.join('') ||
    '<div class="shift-empty">오늘 표시할 업무가 없습니다.</div>';

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>프런트 인수인계 일일 요약</title>
    <style>
      body { font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif; color: #0f172a; margin: 24px; }
      h1 { margin: 0 0 6px; font-size: 1.35rem; }
      .meta { margin: 0 0 18px; color: #64748b; font-size: 0.92rem; }
      .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
      .stat { padding: 8px 12px; border: 1px solid #dbeafe; border-radius: 999px; background: #f8fafc; font-size: 0.86rem; }
      .stat--warn { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
      section { margin-bottom: 18px; page-break-inside: avoid; }
      h3 { margin: 0 0 8px; font-size: 1rem; }
      .item { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; }
      .item__title { margin: 0 0 4px; font-weight: 600; line-height: 1.45; }
      .item__meta { margin: 0; color: #64748b; font-size: 0.82rem; }
      .empty { color: #64748b; text-align: center; padding: 24px 0; }
      @media print { body { margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>프런트 인수인계 일일 요약</h1>
    <p class="meta">${escapeHtml(getSummaryMetaLine())}</p>
    <div class="stats">${renderSummaryStatsHtml(data).replaceAll('shift-stat', 'stat').replaceAll('shift-stat--warn', 'stat stat--warn')}</div>
    ${content.replaceAll('shift-section', 'section').replaceAll('shift-item', 'item').replaceAll('shift-item__', 'item__').replaceAll('shift-section__', '').replaceAll('shift-empty', 'empty')}
  </body>
</html>`;
}

function exportSummaryAsPrint() {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    showToast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintDocumentHtml());
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
  showToast('인쇄 창을 열었습니다. PDF로 저장하려면 「PDF로 저장」을 선택하세요.');
}

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('이미지 라이브러리를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

function buildExportSheetHtml() {
  const data = buildShiftSummaryData();
  const sections = buildSummarySections(data, exportActivityLogs);

  return `
    <div class="export-sheet__inner">
      <h1 class="export-sheet__title">프런트 인수인계 일일 요약</h1>
      <p class="export-sheet__meta">${escapeHtml(getSummaryMetaLine())}</p>
      <div class="export-sheet__stats">${renderSummaryStatsHtml(data)}</div>
      <div class="export-sheet__body">${sections.join('') || '<div class="shift-empty">오늘 표시할 업무가 없습니다.</div>'}</div>
    </div>
  `;
}

async function exportSummaryAsImage() {
  exportImageBtn.disabled = true;

  try {
    await loadHtml2Canvas();
    exportSummarySheet.innerHTML = buildExportSheetHtml();
    exportSummarySheet.classList.remove('hidden');

    const canvas = await window.html2canvas(exportSummarySheet, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = getExportFilename('png');
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('이미지 파일을 저장했습니다.');
  } catch (error) {
    showToast(error.message || '이미지 저장에 실패했습니다.');
  } finally {
    exportSummarySheet.classList.add('hidden');
    exportSummarySheet.innerHTML = '';
    exportImageBtn.disabled = false;
  }
}

function openShiftStartModal() {
  if (!requireSession('교대 시작')) return;

  const data = buildShiftSummaryData();

  shiftStartTitle.textContent = '교대 시작 — 오늘 업무 요약';
  shiftStartMeta.textContent = getSummaryMetaLine();
  shiftStartStats.innerHTML = renderSummaryStatsHtml(data);

  const sections = buildSummarySections(data);
  shiftStartContent.innerHTML =
    sections.join('') ||
    '<div class="shift-empty">오늘 표시할 업무가 없습니다. 보드에서 새 인수인계를 추가해 주세요.</div>';

  shiftStartModal.showModal();
}

function closeShiftStartModal() {
  shiftStartModal.close();
}

async function completeShiftStart() {
  if (!requireSession('인수 완료')) return;

  const data = buildShiftSummaryData();

  try {
    const response = await fetch('/api/shift-handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift: currentSession.shift,
        staffName: currentSession.name,
        handoverType: 'start',
        unackedUrgent: data.unackedUrgent.length,
        urgentCount: data.urgentActive.length,
        progressCount: data.progressActive.length,
        todayCount: data.todayCards.length,
        progressRemaining: data.progressActive.length,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '인수 기록 실패');
    }

    closeShiftStartModal();
    showToast(`${currentSession.shift} · ${currentSession.name} 교대 인수가 기록되었습니다.`);
  } catch (error) {
    showToast(error.message || '인수 기록에 실패했습니다.');
  }
}

async function buildShiftEndContext() {
  const data = buildShiftSummaryData();
  let checklistItems = [];
  let checklistIncomplete = 0;

  try {
    const response = await fetch(`/api/checklist?shift=${encodeURIComponent(currentSession.shift)}`);
    const checklist = await response.json();
    checklistItems = checklist.items || [];
    checklistIncomplete = checklistItems.filter((item) => !item.completed).length;
  } catch {
    checklistItems = [];
  }

  return {
    ...data,
    checklistItems,
    checklistIncomplete,
  };
}

function renderShiftEndChecks(context) {
  const completed = context.checklistItems.length - context.checklistIncomplete;
  const checks = [
    {
      warn: context.unackedUrgent.length > 0,
      title: '미확인 긴급',
      value: `${context.unackedUrgent.length}건`,
      detail: context.unackedUrgent.length > 0 ? '카드에서 ✓ 긴급 확인 필요' : '모두 확인됨',
    },
    {
      warn: context.progressActive.length > 0,
      title: '진행중 잔여',
      value: `${context.progressActive.length}건`,
      detail: context.progressActive.length > 0 ? '다음 교대에 넘김' : '진행중 없음',
    },
    {
      warn: context.checklistIncomplete > 0,
      title: '체크리스트',
      value: context.checklistItems.length
        ? `${completed}/${context.checklistItems.length} 완료`
        : '항목 없음',
      detail:
        context.checklistIncomplete > 0
          ? `미완료 ${context.checklistIncomplete}건`
          : context.checklistItems.length
            ? '모두 완료'
            : '설정에서 항목 추가 가능',
    },
    {
      warn: context.urgentActive.length > 0,
      title: '긴급 칸 잔여',
      value: `${context.urgentActive.length}건`,
      detail: '다음 교대 인수 대상',
    },
  ];

  shiftEndChecks.innerHTML = checks
    .map(
      (check) => `
        <div class="shift-check${check.warn ? ' shift-check--warn' : ' shift-check--ok'}">
          <div class="shift-check__title">${escapeHtml(check.title)}</div>
          <div class="shift-check__value">${escapeHtml(check.value)}</div>
          <div class="shift-check__detail">${escapeHtml(check.detail)}</div>
        </div>
      `
    )
    .join('');
}

async function openShiftEndModal() {
  if (!requireSession('교대 종료')) return;

  const context = await buildShiftEndContext();
  const hasWarnings =
    context.unackedUrgent.length > 0 ||
    context.checklistIncomplete > 0 ||
    context.progressActive.length > 0;

  shiftEndTitle.textContent = '교대 종료 — 마감 체크';
  shiftEndMeta.textContent = getSummaryMetaLine();
  shiftEndStats.innerHTML = renderSummaryStatsHtml(context);
  renderShiftEndChecks(context);

  const sections = [
    renderShiftSection(
      '⚠️ 미확인 긴급',
      '종료 전 확인이 필요한 긴급 업무입니다.',
      context.unackedUrgent,
      true
    ),
    renderShiftSection('🟡 진행중 (넘김)', '다음 교대에 넘기는 업무입니다.', context.progressActive),
    renderShiftSection('🔴 긴급 (넘김)', '긴급 칸에 남은 업무입니다.', context.urgentActive, true),
  ].filter(Boolean);

  shiftEndContent.innerHTML =
    sections.join('') ||
    '<div class="shift-empty">넘길 업무가 없습니다. 체크리스트만 확인하고 종료하세요.</div>';

  shiftEndNote.textContent = hasWarnings
    ? '주의 항목이 있습니다. 확인 후 종료하면 다음 교대 인수 기록에 남습니다.'
    : '마감 체크가 완료되었습니다. 종료를 눌러 기록하세요.';
  shiftEndClearDone.checked = false;
  shiftEndModal.showModal();
}

function closeShiftEndModal() {
  shiftEndModal.close();
}

async function completeShiftEnd() {
  if (!requireSession('교대 종료')) return;

  const context = await buildShiftEndContext();
  const hasBlockers = context.unackedUrgent.length > 0;

  if (hasBlockers) {
    const proceed = confirm(
      `미확인 긴급 ${context.unackedUrgent.length}건이 남아 있습니다.\n그래도 교대 종료를 기록할까요?`
    );
    if (!proceed) return;
  }

  try {
    const response = await fetch('/api/shift-handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift: currentSession.shift,
        staffName: currentSession.name,
        handoverType: 'end',
        unackedUrgent: context.unackedUrgent.length,
        urgentCount: context.urgentActive.length,
        progressCount: context.progressActive.length,
        todayCount: context.todayCards.length,
        checklistIncomplete: context.checklistIncomplete,
        progressRemaining: context.progressActive.length,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '교대 종료 기록 실패');
    }

    if (shiftEndClearDone.checked) {
      const doneCount = cards.filter((card) => card.columnId === 'done').length;
      if (doneCount > 0) {
        const clearResponse = await fetch('/api/cards/clear-done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getAuditPayload()),
        });
        if (!clearResponse.ok) throw new Error('완료 칸 비우기 실패');
      }
    }

    closeShiftEndModal();
    await loadAll();
    showToast(`${currentSession.shift} · ${currentSession.name} 교대 종료가 기록되었습니다.`);
  } catch (error) {
    showToast(error.message || '교대 종료 기록에 실패했습니다.');
  }
}

function formatExpiryLabel(expiresAt) {
  if (!expiresAt) return null;

  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(`${expiresAt}T00:00:00`));
  if (Number.isNaN(expiry.getTime())) return null;

  const diffDays = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  const dateText = expiry.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });

  if (diffDays < 0) return { text: '만료됨', soon: true };
  if (diffDays === 0) return { text: '오늘까지', soon: true };
  if (diffDays === 1) return { text: '내일까지', soon: true };
  if (diffDays <= 3) return { text: `${dateText}까지`, soon: true };
  return { text: `${dateText}까지`, soon: false };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2400);
}
