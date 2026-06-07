const SHIFT_ORDER = ['주간', '오후', '야간'];

const scheduleState = {
  staff: [],
  todaySchedule: null,
  currentMonth: new Date().toISOString().slice(0, 7),
};

const handoverViewEl = document.getElementById('handoverView');
const scheduleViewEl = document.getElementById('scheduleView');
const contactsViewEl = document.getElementById('contactsView');
const checklistViewEl = document.getElementById('checklistView');
const settingsViewEl = document.getElementById('settingsView');
const navButtons = document.querySelectorAll('.app-nav__btn');
const headerHandoverActions = document.querySelector('.header__actions--handover');
const todayStaffDateEl = document.getElementById('todayStaffDate');
const todayStaffGridEl = document.getElementById('todayStaffGrid');
const staffNameSelectEl = document.getElementById('currentName');
const scheduleMonthInput = document.getElementById('scheduleMonthInput');
const scheduleFileInput = document.getElementById('scheduleFileInput');
const scheduleCsvInput = document.getElementById('scheduleCsvInput');
const uploadScheduleBtn = document.getElementById('uploadScheduleBtn');
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const scheduleUploadNote = document.getElementById('scheduleUploadNote');
const scheduleTableTitle = document.getElementById('scheduleTableTitle');
const scheduleTableMeta = document.getElementById('scheduleTableMeta');
const scheduleTableWrap = document.getElementById('scheduleTableWrap');

initSchedulePage();

function initSchedulePage() {
  scheduleMonthInput.value = scheduleState.currentMonth;

  navButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  document.querySelectorAll('[data-view-link]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.viewLink));
  });

  scheduleFileInput.addEventListener('change', readScheduleFile);
  uploadScheduleBtn.addEventListener('click', uploadSchedule);
  downloadTemplateBtn.addEventListener('click', downloadSampleCsv);
  scheduleMonthInput.addEventListener('change', () => {
    scheduleState.currentMonth = scheduleMonthInput.value;
    loadMonthSchedule(scheduleState.currentMonth);
  });

  refreshScheduleData();
}

function switchView(view) {
  const isHandover = view === 'handover';

  navButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });

  handoverViewEl.classList.toggle('hidden', !isHandover);
  scheduleViewEl.classList.toggle('hidden', view !== 'schedule');
  contactsViewEl.classList.toggle('hidden', view !== 'contacts');
  checklistViewEl.classList.toggle('hidden', view !== 'checklist');
  settingsViewEl.classList.toggle('hidden', view !== 'settings');
  headerHandoverActions.classList.toggle('hidden', !isHandover);

  if (view === 'schedule') {
    loadMonthSchedule(scheduleState.currentMonth);
  }
  if (view === 'contacts') {
    window.ContactsPage?.refresh?.();
  }
  if (view === 'checklist') {
    window.ChecklistPage?.refresh?.();
  }
  if (view === 'settings') {
    window.SettingsPage?.refresh?.();
  }
}

async function refreshScheduleData() {
  await Promise.all([loadStaff(), loadTodaySchedule()]);
  renderStaffSelect();
  renderTodayStaffBar();
  await loadMonthSchedule(scheduleState.currentMonth);
}

async function loadStaff() {
  const response = await fetch('/api/staff');
  scheduleState.staff = await response.json();
}

async function loadTodaySchedule() {
  const response = await fetch('/api/schedule/today');
  scheduleState.todaySchedule = await response.json();
}

async function loadMonthSchedule(month) {
  if (!month) return;

  try {
    const response = await fetch(`/api/schedule?month=${encodeURIComponent(month)}`);
    if (!response.ok) {
      renderScheduleTable([]);
      return;
    }
    const schedule = await response.json();
    renderScheduleTable(schedule);
  } catch {
    renderScheduleTable([]);
  }
}

function renderStaffSelect() {
  const selected = staffNameSelectEl.value;
  staffNameSelectEl.innerHTML = '<option value="">선택</option>';
  scheduleState.staff
    .filter((member) => member.isActive)
    .forEach((member) => {
      const option = document.createElement('option');
      option.value = member.name;
      option.textContent = member.name;
      staffNameSelectEl.appendChild(option);
    });

  if (selected && scheduleState.staff.some((member) => member.name === selected && member.isActive)) {
    staffNameSelectEl.value = selected;
  }
}

function renderTodayStaffBar() {
  const data = scheduleState.todaySchedule;
  if (!data) return;

  const dateLabel = new Date(`${data.workDate}T00:00:00`).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  todayStaffDateEl.textContent = dateLabel;

  const hasAny = SHIFT_ORDER.some((shift) => (data.shifts[shift] || []).length > 0);

  if (!hasAny) {
    todayStaffGridEl.innerHTML = `
      <div class="today-staff-empty">
        오늘 등록된 근무 스케줄이 없습니다.
        <button type="button" class="link-btn" data-view-link="schedule">스케줄</button>
        에서 CSV를 업로드하세요.
      </div>
    `;
    todayStaffGridEl.querySelector('[data-view-link="schedule"]')?.addEventListener('click', () => {
      switchView('schedule');
    });
    return;
  }

  todayStaffGridEl.innerHTML = SHIFT_ORDER.map((shift) => {
    const names = data.shifts[shift] || [];
    const namesHtml = names.length
      ? names
          .map(
            (name) =>
              `<button type="button" class="today-staff-chip" data-shift="${escapeHtml(shift)}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`
          )
          .join('')
      : '<span class="today-staff-empty-shift">미등록</span>';

    return `
      <article class="today-staff-card">
        <span class="today-staff-card__shift">${shift}</span>
        <div class="today-staff-card__names">${namesHtml}</div>
      </article>
    `;
  }).join('');

  todayStaffGridEl.querySelectorAll('.today-staff-chip').forEach((button) => {
    button.addEventListener('click', () => {
      staffNameSelectEl.value = button.dataset.name;
      staffNameSelectEl.dispatchEvent(new Event('change'));
      if (window.HandoverApp?.setCurrentShift) {
        window.HandoverApp.setCurrentShift(button.dataset.shift);
      }
      window.HandoverApp?.showToast?.(`${button.dataset.shift} · ${button.dataset.name} 선택됨`);
    });
  });
}

function renderScheduleTable(entries) {
  scheduleTableTitle.textContent = `${scheduleState.currentMonth} 근무표`;
  scheduleTableMeta.textContent = entries.length
    ? `${entries.length}건 등록됨`
    : '아직 업로드된 스케줄이 없습니다.';

  if (!entries.length) {
    scheduleTableWrap.innerHTML = '<div class="shift-empty">아직 업로드된 스케줄이 없습니다.</div>';
    return;
  }

  const byDate = new Map();
  entries.forEach((entry) => {
    if (!byDate.has(entry.workDate)) {
      byDate.set(entry.workDate, { 주간: [], 오후: [], 야간: [] });
    }
    byDate.get(entry.workDate)[entry.shift]?.push(entry.staffName);
  });

  const rows = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([workDate, shifts]) => {
      const label = new Date(`${workDate}T00:00:00`).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      });

      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${formatShiftCell(shifts.주간)}</td>
          <td>${formatShiftCell(shifts.오후)}</td>
          <td>${formatShiftCell(shifts.야간)}</td>
        </tr>
      `;
    })
    .join('');

  scheduleTableWrap.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>날짜</th>
          <th>주간</th>
          <th>오후</th>
          <th>야간</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatShiftCell(names) {
  if (!names || names.length === 0) return '<span class="schedule-table__empty">-</span>';
  return escapeHtml(names.join(', '));
}

function readScheduleFile() {
  const file = scheduleFileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    scheduleCsvInput.value = String(reader.result || '');
  };
  reader.readAsText(file, 'UTF-8');
}

async function uploadSchedule() {
  const month = scheduleMonthInput.value;
  const csvText = scheduleCsvInput.value.trim();

  if (!month) {
    window.HandoverApp?.showToast?.('업로드할 월을 선택해 주세요.');
    return;
  }
  if (!csvText) {
    window.HandoverApp?.showToast?.('CSV 파일을 선택하거나 내용을 붙여넣어 주세요.');
    return;
  }

  uploadScheduleBtn.disabled = true;

  try {
    const response = await fetch('/api/schedule/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, csvText, replace: true }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '업로드 실패');

    scheduleState.currentMonth = month;
    scheduleUploadNote.textContent = `${month} 스케줄 ${result.totalRows}행 중 ${result.inserted}건 등록${
      result.skippedErrors?.length ? ` · ${result.skippedErrors.length}행 확인 필요` : ''
    }`;

    await refreshScheduleData();
    renderScheduleTable(result.schedule || []);
    window.HandoverApp?.showToast?.('스케줄이 업로드되었습니다.');
  } catch (error) {
    window.HandoverApp?.showToast?.(error.message || '업로드에 실패했습니다.');
  } finally {
    uploadScheduleBtn.disabled = false;
  }
}

function downloadSampleCsv() {
  const month = scheduleMonthInput.value || scheduleState.currentMonth;
  const sample = `날짜,교대,이름
${month}-01,주간,김프런
${month}-01,오후,이데스크
${month}-01,야간,최야간
${month}-02,주간,박체크
${month}-02,오후,김프런
${month}-02,야간,이데스크`;

  const blob = new Blob([`\uFEFF${sample}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `근무표_샘플_${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.SchedulePage = {
  refresh: refreshScheduleData,
  switchView,
};
