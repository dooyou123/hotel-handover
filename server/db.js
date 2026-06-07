const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'handover.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id TEXT NOT NULL DEFAULT 'urgent',
    priority TEXT NOT NULL DEFAULT 'urgent',
    category TEXT NOT NULL DEFAULT '기타',
    room TEXT DEFAULT '',
    title TEXT NOT NULL,
    details TEXT DEFAULT '',
    next_action TEXT DEFAULT '',
    author TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

const cardColumns = db.prepare('PRAGMA table_info(cards)').all();
if (!cardColumns.some((column) => column.name === 'details')) {
  db.exec("ALTER TABLE cards ADD COLUMN details TEXT DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('announcement', 'change')),
    content TEXT NOT NULL,
    author TEXT DEFAULT '',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const noticeColumns = db.prepare('PRAGMA table_info(notices)').all();
if (!noticeColumns.some((column) => column.name === 'is_pinned')) {
  db.exec('ALTER TABLE notices ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
}
if (!noticeColumns.some((column) => column.name === 'expires_at')) {
  db.exec('ALTER TABLE notices ADD COLUMN expires_at TEXT DEFAULT NULL');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS shift_handovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    unacked_urgent INTEGER NOT NULL DEFAULT 0,
    urgent_count INTEGER NOT NULL DEFAULT 0,
    progress_count INTEGER NOT NULL DEFAULT 0,
    today_count INTEGER NOT NULL DEFAULT 0,
    handover_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS card_acknowledgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    shift TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    acknowledged_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    shift TEXT DEFAULT '',
    staff_name TEXT DEFAULT '',
    summary TEXT NOT NULL,
    details TEXT DEFAULT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(work_date, shift, staff_name)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_schedule_work_date ON schedule_entries(work_date)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '기타',
    phone TEXT NOT NULL,
    phone_alt TEXT DEFAULT '',
    note TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS card_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    shift TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS card_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS checklist_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    work_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE(item_id, work_date, shift),
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
  )
`);

if (!cardColumns.some((column) => column.name === 'resolution')) {
  db.exec("ALTER TABLE cards ADD COLUMN resolution TEXT DEFAULT ''");
}

const cardColumnsExtended = db.prepare('PRAGMA table_info(cards)').all();
if (!cardColumnsExtended.some((column) => column.name === 'assignee_shift')) {
  db.exec("ALTER TABLE cards ADD COLUMN assignee_shift TEXT DEFAULT ''");
}
if (!cardColumnsExtended.some((column) => column.name === 'assignee_name')) {
  db.exec("ALTER TABLE cards ADD COLUMN assignee_name TEXT DEFAULT ''");
}
if (!cardColumnsExtended.some((column) => column.name === 'due_at')) {
  db.exec('ALTER TABLE cards ADD COLUMN due_at TEXT DEFAULT NULL');
}

const shiftHandoverColumns = db.prepare('PRAGMA table_info(shift_handovers)').all();
if (!shiftHandoverColumns.some((column) => column.name === 'handover_type')) {
  db.exec("ALTER TABLE shift_handovers ADD COLUMN handover_type TEXT NOT NULL DEFAULT 'start'");
}
if (!shiftHandoverColumns.some((column) => column.name === 'work_date')) {
  db.exec('ALTER TABLE shift_handovers ADD COLUMN work_date TEXT DEFAULT NULL');
}
if (!shiftHandoverColumns.some((column) => column.name === 'checklist_incomplete')) {
  db.exec('ALTER TABLE shift_handovers ADD COLUMN checklist_incomplete INTEGER NOT NULL DEFAULT 0');
}
if (!shiftHandoverColumns.some((column) => column.name === 'progress_remaining')) {
  db.exec('ALTER TABLE shift_handovers ADD COLUMN progress_remaining INTEGER NOT NULL DEFAULT 0');
}
if (!shiftHandoverColumns.some((column) => column.name === 'notes')) {
  db.exec("ALTER TABLE shift_handovers ADD COLUMN notes TEXT DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS card_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'today',
    column_id TEXT NOT NULL DEFAULT 'progress',
    category TEXT NOT NULL DEFAULT '기타',
    title TEXT NOT NULL DEFAULT '',
    next_action TEXT DEFAULT '',
    details TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const contactColumns = db.prepare('PRAGMA table_info(contacts)').all();
if (!contactColumns.some((column) => column.name === 'is_pinned')) {
  db.exec('ALTER TABLE contacts ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
}

const VALID_SHIFTS = ['주간', '오후', '야간'];

const staffCount = db.prepare('SELECT COUNT(*) AS n FROM staff').get().n;
if (staffCount === 0) {
  const now = new Date().toISOString();
  const insertStaff = db.prepare(`
    INSERT INTO staff (name, is_active, sort_order, created_at)
    VALUES (@name, 1, @sortOrder, @createdAt)
  `);
  ['김프런', '이데스크', '박체크', '최야간'].forEach((name, index) => {
    insertStaff.run({ name, sortOrder: index, createdAt: now });
  });
}

const contactCount = db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n;
if (contactCount === 0) {
  const now = new Date().toISOString();
  const insertContact = db.prepare(`
    INSERT INTO contacts (name, department, phone, phone_alt, note, sort_order, is_active, created_at, updated_at)
    VALUES (@name, @department, @phone, @phoneAlt, @note, @sortOrder, 1, @createdAt, @updatedAt)
  `);

  const sampleContacts = [
    {
      name: '엔지니어링 실',
      department: '엔지니어링',
      phone: '02-1234-5678',
      phoneAlt: '내선 210',
      note: '냉난방·설비 긴급',
      sortOrder: 0,
    },
    {
      name: '하우스키핑 당직',
      department: '하우스키핑',
      phone: '02-1234-5680',
      phoneAlt: '내선 220',
      note: '객실 정비·어메니티',
      sortOrder: 1,
    },
    {
      name: 'F&B 매니저',
      department: 'F&B',
      phone: '02-1234-5690',
      phoneAlt: '',
      note: '조식·룸서비스 문의',
      sortOrder: 2,
    },
    {
      name: '당직 매니저',
      department: '매니저',
      phone: '010-1234-5678',
      phoneAlt: '내선 101',
      note: '야간/주말 승인·민원',
      sortOrder: 3,
    },
    {
      name: '보안실',
      department: '보안',
      phone: '02-1234-5600',
      phoneAlt: '내선 119',
      note: '출입·분실·보안',
      sortOrder: 4,
    },
    {
      name: '응급의료',
      department: '응급',
      phone: '119',
      phoneAlt: '',
      note: '응급 상황',
      sortOrder: 5,
    },
    {
      name: '세탁 업체',
      department: '업체',
      phone: '010-9876-5432',
      phoneAlt: '',
      note: '수·금 픽업',
      sortOrder: 6,
    },
  ];

  sampleContacts.forEach((contact) => {
    insertContact.run({ ...contact, createdAt: now, updatedAt: now });
  });
}

const checklistCount = db.prepare('SELECT COUNT(*) AS n FROM checklist_items').get().n;
if (checklistCount === 0) {
  const now = new Date().toISOString();
  const insertChecklist = db.prepare(`
    INSERT INTO checklist_items (label, sort_order, is_active, created_at)
    VALUES (@label, @sortOrder, 1, @createdAt)
  `);
  [
    '고정 공지 확인',
    'VIP·단체 체크인 확인',
    '조식/ F&B 준비 확인',
    '마스터키·무선기 수량 확인',
    '시재(캐시) 확인',
  ].forEach((label, index) => {
    insertChecklist.run({ label, sortOrder: index, createdAt: now });
  });
}

const cardTemplateCount = db.prepare('SELECT COUNT(*) AS n FROM card_templates').get().n;
if (cardTemplateCount === 0) {
  const now = new Date().toISOString();
  const insertTemplate = db.prepare(`
    INSERT INTO card_templates (label, priority, column_id, category, title, next_action, details, sort_order, is_active, created_at, updated_at)
    VALUES (@label, @priority, @columnId, @category, @title, @nextAction, @details, @sortOrder, 1, @createdAt, @updatedAt)
  `);
  const defaultTemplates = [
    {
      label: 'VIP 체크인',
      priority: 'urgent',
      columnId: 'urgent',
      category: 'VIP',
      title: 'VIP 체크인 — ',
      nextAction: '조용한 객실 배정 확인, 어메니티 추가',
      details: '',
    },
    {
      label: '냉난방 이슈',
      priority: 'urgent',
      columnId: 'urgent',
      category: '룸이슈',
      title: '냉난방 불량 — ',
      nextAction: '엔지니어링 호출 후 결과 기록',
      details: '',
    },
    {
      label: '미수금',
      priority: 'today',
      columnId: 'progress',
      category: '결제',
      title: '미수금 — ',
      nextAction: '체크아웃 전 결제 확인',
      details: '',
    },
    {
      label: '유실물',
      priority: 'today',
      columnId: 'progress',
      category: '유실물',
      title: '유실물 보관 — ',
      nextAction: '보관함 번호 기록, 분실센터 등록',
      details: '',
    },
    {
      label: '층간 소음',
      priority: 'today',
      columnId: 'progress',
      category: '민원',
      title: '층간 소음 민원 — ',
      nextAction: '양측 확인 후 조치 기록',
      details: '',
    },
    {
      label: '룸클린 대기',
      priority: 'today',
      columnId: 'progress',
      category: '룸이슈',
      title: '룸클린 대기 — ',
      nextAction: 'HK에 클린 요청 후 완료 확인',
      details: '',
    },
    {
      label: '체크아웃',
      priority: 'today',
      columnId: 'progress',
      category: '체크인/아웃',
      title: '늦은 체크아웃 — ',
      nextAction: '추가 요금·객실 상태 확인',
      details: '',
    },
  ];
  defaultTemplates.forEach((template, index) => {
    insertTemplate.run({ ...template, sortOrder: index, createdAt: now, updatedAt: now });
  });
}

const count = db.prepare('SELECT COUNT(*) AS n FROM cards').get().n;
if (count === 0) {
  const now = new Date().toISOString();
  const seed = db.prepare(`
    INSERT INTO cards (column_id, priority, category, room, title, next_action, author, created_at, updated_at, sort_order)
    VALUES (@column_id, @priority, @category, @room, @title, @next_action, @author, @created_at, @updated_at, @sort_order)
  `);

  const samples = [
    {
      column_id: 'urgent',
      priority: 'urgent',
      category: '룸이슈',
      room: '1205',
      title: '냉방 불량 — 투숙객 불편 호소',
      next_action: '엔지니어링 호출 후 결과 기록',
      author: '주간',
      sort_order: 0,
    },
    {
      column_id: 'urgent',
      priority: 'urgent',
      category: 'VIP',
      room: '1802',
      title: '내일 14:00 VIP 체크인 — 조용한 객실 요청',
      next_action: '코너룸 배정 확인, 어메니티 추가',
      author: '주간',
      sort_order: 1,
    },
    {
      column_id: 'progress',
      priority: 'today',
      category: '결제',
      room: '808',
      title: '미수금 50,000원',
      next_action: '체크아웃 전 결제 확인',
      author: '오후',
      sort_order: 0,
    },
    {
      column_id: 'progress',
      priority: 'today',
      category: '민원',
      room: '502',
      title: '층간 소음 민원 — 2회 접수',
      next_action: '502·504 양측 확인 후 조치',
      author: '오후',
      sort_order: 1,
    },
    {
      column_id: 'done',
      priority: 'info',
      category: '유실물',
      room: '로비',
      title: '우산 1개 보관함 보관 완료',
      next_action: '—',
      author: '주간',
      sort_order: 0,
    },
  ];

  for (const item of samples) {
    seed.run({ ...item, created_at: now, updated_at: now });
  }
}

const noticeCount = db.prepare('SELECT COUNT(*) AS n FROM notices').get().n;
if (noticeCount === 0) {
  const now = new Date().toISOString();
  const seedNotice = db.prepare(`
    INSERT INTO notices (type, content, author, is_pinned, expires_at, created_at, updated_at)
    VALUES (@type, @content, @author, @is_pinned, @expires_at, @created_at, @updated_at)
  `);

  seedNotice.run({
    type: 'announcement',
    content: '금일 15:00~17:00 로비 리모델링 공사 — 안내 멘트 준비',
    author: '주간',
    is_pinned: 1,
    expires_at: null,
    created_at: now,
    updated_at: now,
  });
  seedNotice.run({
    type: 'change',
    content: '조식 운영 시간 변경: 07:00~10:00 → 06:30~09:30 (내일부터)',
    author: '매니저',
    is_pinned: 0,
    expires_at: null,
    created_at: now,
    updated_at: now,
  });
}

function rowToCard(row) {
  return {
    id: row.id,
    columnId: row.column_id,
    priority: row.priority,
    category: row.category,
    room: row.room,
    title: row.title,
    details: row.details || '',
    resolution: row.resolution || '',
    nextAction: row.next_action,
    author: row.author,
    assigneeShift: row.assignee_shift || '',
    assigneeName: row.assignee_name || '',
    dueAt: row.due_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    acknowledgments: getCardAcknowledgments(row.id),
    comments: getCardComments(row.id),
    attachments: getCardAttachments(row.id),
  };
}

function rowToComment(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    shift: row.shift,
    staffName: row.staff_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

function rowToAttachment(row) {
  const relative = path.relative(uploadsDir, row.file_path).split(path.sep).join('/');
  return {
    id: row.id,
    cardId: row.card_id,
    filename: row.filename,
    mimeType: row.mime_type,
    url: `/uploads/${relative}`,
    createdAt: row.created_at,
  };
}

function getCardComments(cardId) {
  return db
    .prepare('SELECT * FROM card_comments WHERE card_id = ? ORDER BY id ASC')
    .all(cardId)
    .map(rowToComment);
}

function getCardAttachments(cardId) {
  return db
    .prepare('SELECT * FROM card_attachments WHERE card_id = ? ORDER BY id ASC')
    .all(cardId)
    .map(rowToAttachment);
}

function deleteCardAttachments(cardId) {
  const rows = db.prepare('SELECT * FROM card_attachments WHERE card_id = ?').all(cardId);
  rows.forEach((row) => {
    if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  });
  db.prepare('DELETE FROM card_attachments WHERE card_id = ?').run(cardId);
}

function rowToAck(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    shift: row.shift,
    staffName: row.staff_name,
    acknowledgedAt: row.acknowledged_at,
  };
}

function getCardAcknowledgments(cardId) {
  const rows = db
    .prepare('SELECT * FROM card_acknowledgments WHERE card_id = ? ORDER BY id DESC')
    .all(cardId);
  return rows.map(rowToAck);
}

function clearCardAcknowledgments(cardId) {
  db.prepare('DELETE FROM card_acknowledgments WHERE card_id = ?').run(cardId);
}

function acknowledgeCard(cardId, data) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO card_acknowledgments (card_id, shift, staff_name, acknowledged_at)
    VALUES (@cardId, @shift, @staffName, @acknowledgedAt)
  `).run({
    cardId,
    shift: data.shift,
    staffName: data.staffName,
    acknowledgedAt: now,
  });

  return {
    ...rowToCard(card),
    acknowledgments: getCardAcknowledgments(cardId),
  };
}

function getCards() {
  const rows = db
    .prepare('SELECT * FROM cards ORDER BY column_id, sort_order ASC, id ASC')
    .all();
  return rows.map(rowToCard);
}

const COLUMN_LABELS_KO = {
  urgent: '긴급',
  progress: '진행중',
  done: '완료',
};

function cardLabelFromRow(row) {
  const room = row.room ? `[${row.room}] ` : '';
  return `${room}${row.title}`;
}

function logActivity(data) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO activity_logs (entity_type, entity_id, action, shift, staff_name, summary, details, created_at)
    VALUES (@entityType, @entityId, @action, @shift, @staffName, @summary, @details, @createdAt)
  `).run({
    entityType: data.entityType,
    entityId: data.entityId ?? 0,
    action: data.action,
    shift: data.shift || '',
    staffName: data.staffName || '',
    summary: data.summary,
    details: data.details ? JSON.stringify(data.details) : null,
    createdAt: now,
  });
}

function getAudit(data) {
  if (!data?.audit) return null;
  const { shift, staffName, reason } = data.audit;
  if (!shift || !staffName || !String(staffName).trim()) return null;
  return {
    shift,
    staffName: String(staffName).trim(),
    reason: reason ? String(reason).trim() : '',
  };
}

function requireAudit(data) {
  const audit = getAudit(data);
  if (!audit) return null;
  return audit;
}

function formatDueLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCardChangeDetails(before, after) {
  const changes = [];
  const fieldMap = [
    ['column_id', '상태', COLUMN_LABELS_KO],
    ['priority', '우선순위', { urgent: '긴급', today: '오늘', info: '참고' }],
    ['category', '카테고리'],
    ['room', '객실'],
    ['title', '한 줄 요약'],
    ['details', '상세 내용'],
    ['resolution', '처리 결과'],
    ['next_action', '다음 조치'],
    ['assignee_shift', '담당 교대'],
    ['assignee_name', '담당자'],
    ['due_at', '마감 시각', null, formatDueLabel],
  ];

  fieldMap.forEach((entry) => {
    const [key, label, map, formatter] = entry;
    const oldValue = before[key];
    const newValue = after[key];
    if (oldValue === newValue) return;
    const format =
      formatter ||
      ((value) => (map && typeof map === 'object' ? map[value] || value : value) || '-');
    changes.push(`${label}: ${format(oldValue)} → ${format(newValue)}`);
  });

  return changes;
}

function createCard(data) {
  const now = new Date().toISOString();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM cards WHERE column_id = ?')
    .get(data.columnId || 'urgent');

  const result = db
    .prepare(`
      INSERT INTO cards (column_id, priority, category, room, title, details, resolution, next_action, author, assignee_shift, assignee_name, due_at, created_at, updated_at, sort_order)
      VALUES (@columnId, @priority, @category, @room, @title, @details, @resolution, @nextAction, @author, @assigneeShift, @assigneeName, @dueAt, @createdAt, @updatedAt, @sortOrder)
    `)
    .run({
      columnId: data.columnId || 'urgent',
      priority: data.priority || 'urgent',
      category: data.category || '기타',
      room: data.room || '',
      title: data.title,
      details: data.details || '',
      resolution: data.resolution || '',
      nextAction: data.nextAction || '',
      author: data.author || '',
      assigneeShift: data.assigneeShift || '',
      assigneeName: data.assigneeName || '',
      dueAt: data.dueAt || null,
      createdAt: now,
      updatedAt: now,
      sortOrder: (maxOrder?.max_order ?? -1) + 1,
    });

  const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid));
  const audit = getAudit(data);
  if (audit) {
    logActivity({
      entityType: 'card',
      entityId: card.id,
      action: 'create',
      shift: audit.shift,
      staffName: audit.staffName,
      summary: `인수인계 추가: ${card.room ? `[${card.room}] ` : ''}${card.title}`,
      details: { after: card },
    });
  }
  return card;
}

function updateCard(id, data) {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) return null;

  const contentChanged =
    (data.title !== undefined && data.title !== existing.title) ||
    (data.details !== undefined && data.details !== existing.details) ||
    (data.nextAction !== undefined && data.nextAction !== existing.next_action) ||
    (data.room !== undefined && data.room !== existing.room) ||
    (data.priority !== undefined && data.priority !== existing.priority) ||
    (data.category !== undefined && data.category !== existing.category) ||
    (data.assigneeShift !== undefined && data.assigneeShift !== existing.assignee_shift) ||
    (data.assigneeName !== undefined && data.assigneeName !== existing.assignee_name) ||
    (data.dueAt !== undefined && data.dueAt !== existing.due_at);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cards SET
      column_id = @columnId,
      priority = @priority,
      category = @category,
      room = @room,
      title = @title,
      details = @details,
      resolution = @resolution,
      next_action = @nextAction,
      author = @author,
      assignee_shift = @assigneeShift,
      assignee_name = @assigneeName,
      due_at = @dueAt,
      updated_at = @updatedAt,
      sort_order = @sortOrder
    WHERE id = @id
  `).run({
    id,
    columnId: data.columnId ?? existing.column_id,
    priority: data.priority ?? existing.priority,
    category: data.category ?? existing.category,
    room: data.room ?? existing.room,
    title: data.title ?? existing.title,
    details: data.details ?? existing.details ?? '',
    resolution: data.resolution ?? existing.resolution ?? '',
    nextAction: data.nextAction ?? existing.next_action,
    author: data.author ?? existing.author,
    assigneeShift: data.assigneeShift ?? existing.assignee_shift ?? '',
    assigneeName: data.assigneeName ?? existing.assignee_name ?? '',
    dueAt: data.dueAt !== undefined ? data.dueAt : existing.due_at,
    updatedAt: now,
    sortOrder: data.sortOrder ?? existing.sort_order,
  });

  if (contentChanged) {
    clearCardAcknowledgments(id);
  }

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  const audit = getAudit(data);
  if (audit) {
    const changes = buildCardChangeDetails(existing, updated);
    if (changes.length > 0) {
      logActivity({
        entityType: 'card',
        entityId: id,
        action: 'update',
        shift: audit.shift,
        staffName: audit.staffName,
        summary: `인수인계 수정: ${cardLabelFromRow(updated)}`,
        details: { changes },
      });
    }
  }

  return rowToCard(updated);
}

function deleteCard(id, data = {}) {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) return false;

  const audit = requireAudit(data);
  if (!audit) return { error: '교대와 이름을 선택해 주세요.' };
  if (!audit.reason) return { error: '삭제 사유를 입력해 주세요.' };

  logActivity({
    entityType: 'card',
    entityId: id,
    action: 'delete',
    shift: audit.shift,
    staffName: audit.staffName,
    summary: `인수인계 삭제: ${cardLabelFromRow(existing)}`,
    details: { reason: audit.reason, before: existing },
  });

  db.prepare('DELETE FROM card_acknowledgments WHERE card_id = ?').run(id);
  deleteCardAttachments(id);
  const result = db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  return result.changes > 0;
}

function reorderCards(columnId, orderedIds) {
  const update = db.prepare('UPDATE cards SET sort_order = ?, updated_at = ? WHERE id = ? AND column_id = ?');
  const now = new Date().toISOString();
  const tx = db.transaction((ids) => {
    ids.forEach((cardId, index) => {
      update.run(index, now, cardId, columnId);
    });
  });
  tx(orderedIds);
  return getCards();
}

function moveCard(id, columnId, sortOrder, data = {}) {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) return null;

  const resolution = data.resolution !== undefined ? String(data.resolution).trim() : '';
  if (columnId === 'done' && existing.column_id !== 'done') {
    const effectiveResolution = resolution || existing.resolution || '';
    if (!effectiveResolution) {
      return { error: '완료 처리 시 처리 결과를 입력해 주세요.' };
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cards SET column_id = ?, sort_order = ?, updated_at = ?, resolution = COALESCE(?, resolution)
    WHERE id = ?
  `).run(columnId, sortOrder, now, resolution || null, id);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  const audit = getAudit(data);
  if (audit && existing.column_id !== columnId) {
    logActivity({
      entityType: 'card',
      entityId: id,
      action: 'move',
      shift: audit.shift,
      staffName: audit.staffName,
      summary: `상태 변경: ${cardLabelFromRow(existing)}`,
      details: {
        changes: [
          `상태: ${COLUMN_LABELS_KO[existing.column_id] || existing.column_id} → ${COLUMN_LABELS_KO[columnId] || columnId}`,
        ],
      },
    });
  }

  return rowToCard(updated);
}

function clearDoneCards(data = {}) {
  const rows = db.prepare("SELECT * FROM cards WHERE column_id = 'done'").all();
  if (rows.length === 0) return 0;

  const audit = requireAudit(data);
  if (!audit) return { error: '교대와 이름을 선택해 주세요.' };

  logActivity({
    entityType: 'card',
    entityId: 0,
    action: 'clear_done',
    shift: audit.shift,
    staffName: audit.staffName,
    summary: `완료 칸 ${rows.length}건 비우기`,
    details: {
      cards: rows.map((row) => ({
        id: row.id,
        room: row.room,
        title: row.title,
      })),
    },
  });

  const result = db.prepare("DELETE FROM cards WHERE column_id = 'done'").run();
  return result.changes;
}

function rowToNotice(row) {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    author: row.author,
    isPinned: Boolean(row.is_pinned),
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const activeNoticeFilter = `
  (expires_at IS NULL OR expires_at >= date('now', 'localtime'))
`;

function getNotices(type) {
  if (type) {
    const rows = db
      .prepare(`SELECT * FROM notices WHERE type = ? AND ${activeNoticeFilter} ORDER BY is_pinned DESC, id DESC`)
      .all(type);
    return rows.map(rowToNotice);
  }
  const rows = db
    .prepare(`SELECT * FROM notices WHERE ${activeNoticeFilter} ORDER BY type ASC, is_pinned DESC, id DESC`)
    .all();
  return rows.map(rowToNotice);
}

function normalizeExpiresAt(value) {
  if (!value || !String(value).trim()) return null;
  return String(value).trim().slice(0, 10);
}

function createNotice(data) {
  const now = new Date().toISOString();
  const result = db
    .prepare(`
      INSERT INTO notices (type, content, author, is_pinned, expires_at, created_at, updated_at)
      VALUES (@type, @content, @author, @isPinned, @expiresAt, @createdAt, @updatedAt)
    `)
    .run({
      type: data.type,
      content: data.content,
      author: data.author || '',
      isPinned: data.isPinned ? 1 : 0,
      expiresAt: normalizeExpiresAt(data.expiresAt),
      createdAt: now,
      updatedAt: now,
    });

  const notice = rowToNotice(db.prepare('SELECT * FROM notices WHERE id = ?').get(result.lastInsertRowid));
  const audit = getAudit(data);
  if (audit) {
    logActivity({
      entityType: 'notice',
      entityId: notice.id,
      action: 'create',
      shift: audit.shift,
      staffName: audit.staffName,
      summary: `${data.type === 'change' ? '업무 변경' : '업무 공지'} 추가`,
      details: { after: notice },
    });
  }
  return notice;
}

function updateNotice(id, data) {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notices SET
      content = @content,
      author = @author,
      is_pinned = @isPinned,
      expires_at = @expiresAt,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    content: data.content ?? existing.content,
    author: data.author ?? existing.author,
    isPinned: data.isPinned !== undefined ? (data.isPinned ? 1 : 0) : existing.is_pinned,
    expiresAt: data.expiresAt !== undefined ? normalizeExpiresAt(data.expiresAt) : existing.expires_at,
    updatedAt: now,
  });

  const updated = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  const audit = getAudit(data);
  if (audit) {
    const changes = [];
    if (existing.content !== updated.content) changes.push('내용 변경');
    if (Boolean(existing.is_pinned) !== Boolean(updated.is_pinned)) {
      changes.push(updated.is_pinned ? '고정 설정' : '고정 해제');
    }
    if ((existing.expires_at || null) !== (updated.expires_at || null)) changes.push('유효기간 변경');
    if (changes.length > 0) {
      logActivity({
        entityType: 'notice',
        entityId: id,
        action: 'update',
        shift: audit.shift,
        staffName: audit.staffName,
        summary: `${existing.type === 'change' ? '업무 변경' : '업무 공지'} 수정`,
        details: { changes },
      });
    }
  }

  return rowToNotice(updated);
}

function toggleNoticePin(id) {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextPinned = existing.is_pinned ? 0 : 1;
  db.prepare(`
    UPDATE notices SET is_pinned = ?, updated_at = ? WHERE id = ?
  `).run(nextPinned, now, id);

  return rowToNotice(db.prepare('SELECT * FROM notices WHERE id = ?').get(id));
}

function deleteNotice(id, data = {}) {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!existing) return false;

  const audit = requireAudit(data);
  if (!audit) return { error: '교대와 이름을 선택해 주세요.' };
  if (!audit.reason) return { error: '삭제 사유를 입력해 주세요.' };

  logActivity({
    entityType: 'notice',
    entityId: id,
    action: 'delete',
    shift: audit.shift,
    staffName: audit.staffName,
    summary: `${existing.type === 'change' ? '업무 변경' : '업무 공지'} 삭제`,
    details: { reason: audit.reason, before: existing },
  });

  const result = db.prepare('DELETE FROM notices WHERE id = ?').run(id);
  return result.changes > 0;
}

function rowToActivity(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    shift: row.shift,
    staffName: row.staff_name,
    summary: row.summary,
    details: row.details ? JSON.parse(row.details) : null,
    createdAt: row.created_at,
  };
}

function getActivityLogs(limit = 80) {
  const rows = db
    .prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?')
    .all(limit);
  return rows.map(rowToActivity);
}

function logShiftHandover(data) {
  const now = new Date().toISOString();
  const workDate = data.workDate || formatLocalDate(new Date());
  const handoverType = data.handoverType === 'end' ? 'end' : 'start';

  const result = db
    .prepare(`
      INSERT INTO shift_handovers (
        shift, staff_name, unacked_urgent, urgent_count, progress_count, today_count,
        handover_at, handover_type, work_date, checklist_incomplete, progress_remaining, notes
      )
      VALUES (
        @shift, @staffName, @unackedUrgent, @urgentCount, @progressCount, @todayCount,
        @handoverAt, @handoverType, @workDate, @checklistIncomplete, @progressRemaining, @notes
      )
    `)
    .run({
      shift: data.shift,
      staffName: data.staffName,
      unackedUrgent: data.unackedUrgent ?? 0,
      urgentCount: data.urgentCount ?? 0,
      progressCount: data.progressCount ?? 0,
      todayCount: data.todayCount ?? 0,
      handoverAt: now,
      handoverType,
      workDate,
      checklistIncomplete: data.checklistIncomplete ?? 0,
      progressRemaining: data.progressRemaining ?? 0,
      notes: data.notes || '',
    });

  return {
    id: result.lastInsertRowid,
    shift: data.shift,
    staffName: data.staffName,
    unackedUrgent: data.unackedUrgent ?? 0,
    urgentCount: data.urgentCount ?? 0,
    progressCount: data.progressCount ?? 0,
    todayCount: data.todayCount ?? 0,
    handoverAt: now,
    handoverType,
    workDate,
    checklistIncomplete: data.checklistIncomplete ?? 0,
    progressRemaining: data.progressRemaining ?? 0,
    notes: data.notes || '',
  };
}

function mapCardTemplateRow(row) {
  return {
    id: row.id,
    label: row.label,
    priority: row.priority,
    columnId: row.column_id,
    category: row.category,
    title: row.title,
    nextAction: row.next_action,
    details: row.details || '',
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getCardTemplates(includeInactive = false) {
  const rows = includeInactive
    ? db.prepare('SELECT * FROM card_templates ORDER BY sort_order ASC, id ASC').all()
    : db
        .prepare('SELECT * FROM card_templates WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
        .all();
  return rows.map(mapCardTemplateRow);
}

function createCardTemplate(data) {
  const label = String(data.label || '').trim();
  if (!label) return { error: '템플릿 이름을 입력해 주세요.' };

  const now = new Date().toISOString();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM card_templates')
    .get().maxOrder;

  const result = db
    .prepare(`
      INSERT INTO card_templates (label, priority, column_id, category, title, next_action, details, sort_order, is_active, created_at, updated_at)
      VALUES (@label, @priority, @columnId, @category, @title, @nextAction, @details, @sortOrder, 1, @createdAt, @updatedAt)
    `)
    .run({
      label,
      priority: data.priority || 'today',
      columnId: data.columnId || 'progress',
      category: data.category || '기타',
      title: data.title || '',
      nextAction: data.nextAction || '',
      details: data.details || '',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

  return mapCardTemplateRow(
    db.prepare('SELECT * FROM card_templates WHERE id = ?').get(result.lastInsertRowid)
  );
}

function updateCardTemplate(id, data) {
  const existing = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(id);
  if (!existing) return null;

  const label = data.label !== undefined ? String(data.label).trim() : existing.label;
  if (!label) return { error: '템플릿 이름을 입력해 주세요.' };

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE card_templates SET
      label = @label,
      priority = @priority,
      column_id = @columnId,
      category = @category,
      title = @title,
      next_action = @nextAction,
      details = @details,
      is_active = @isActive,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    label,
    priority: data.priority ?? existing.priority,
    columnId: data.columnId ?? existing.column_id,
    category: data.category ?? existing.category,
    title: data.title ?? existing.title,
    nextAction: data.nextAction ?? existing.next_action,
    details: data.details ?? existing.details ?? '',
    isActive: data.isActive === undefined ? existing.is_active : data.isActive ? 1 : 0,
    updatedAt: now,
  });

  return mapCardTemplateRow(db.prepare('SELECT * FROM card_templates WHERE id = ?').get(id));
}

function deleteCardTemplate(id) {
  const existing = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('UPDATE card_templates SET is_active = 0, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    id
  );
  return true;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapStaffRow(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapScheduleRow(row) {
  return {
    id: row.id,
    workDate: row.work_date,
    shift: row.shift,
    staffName: row.staff_name,
    createdAt: row.created_at,
  };
}

function getStaff(includeInactive = false) {
  const rows = includeInactive
    ? db.prepare('SELECT * FROM staff ORDER BY sort_order ASC, id ASC').all()
    : db
        .prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
        .all();
  return rows.map(mapStaffRow);
}

function createStaff(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return { error: '이름을 입력해 주세요.' };

  const existing = db.prepare('SELECT id FROM staff WHERE name = ?').get(trimmed);
  if (existing) return { error: '이미 등록된 이름입니다.' };

  const now = new Date().toISOString();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM staff').get().maxOrder;

  const result = db
    .prepare(`
      INSERT INTO staff (name, is_active, sort_order, created_at)
      VALUES (@name, 1, @sortOrder, @createdAt)
    `)
    .run({
      name: trimmed,
      sortOrder: maxOrder + 1,
      createdAt: now,
    });

  return mapStaffRow(
    db.prepare('SELECT * FROM staff WHERE id = ?').get(result.lastInsertRowid)
  );
}

function updateStaff(id, data) {
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  if (!existing) return null;

  const name = data.name !== undefined ? String(data.name).trim() : existing.name;
  if (!name) return { error: '이름을 입력해 주세요.' };

  const duplicate = db.prepare('SELECT id FROM staff WHERE name = ? AND id != ?').get(name, id);
  if (duplicate) return { error: '이미 등록된 이름입니다.' };

  db.prepare(`
    UPDATE staff
    SET name = @name, is_active = @isActive
    WHERE id = @id
  `).run({
    id,
    name,
    isActive: data.isActive === undefined ? existing.is_active : data.isActive ? 1 : 0,
  });

  return mapStaffRow(db.prepare('SELECT * FROM staff WHERE id = ?').get(id));
}

function deleteStaff(id) {
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  if (!existing) return null;

  db.prepare('UPDATE staff SET is_active = 0 WHERE id = ?').run(id);
  return mapStaffRow(db.prepare('SELECT * FROM staff WHERE id = ?').get(id));
}

function normalizeShift(value) {
  const text = String(value || '').trim();
  if (VALID_SHIFTS.includes(text)) return text;
  if (text.includes('주') || text.toLowerCase() === 'day') return '주간';
  if (text.includes('오') || text.toLowerCase() === 'afternoon') return '오후';
  if (text.includes('야') || text.toLowerCase() === 'night') return '야간';
  return null;
}

function normalizeWorkDate(value, fallbackMonth) {
  const text = String(value || '').trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const shortMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})$/);
  if (shortMatch && fallbackMonth && /^\d{4}-\d{2}$/.test(fallbackMonth)) {
    const [, month, day] = shortMatch;
    const [year] = fallbackMonth.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((char === ',' || char === '\t') && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseScheduleCsv(csvText, month) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: 'CSV 내용이 비어 있습니다.' };
  }

  let startIndex = 0;
  let dateIndex = 0;
  let shiftIndex = 1;
  let nameIndex = 2;

  const headerCells = parseCsvLine(lines[0]).map((cell) => cell.replace(/\uFEFF/g, ''));
  const headerJoined = headerCells.join(',').toLowerCase();

  if (
    headerJoined.includes('날짜') ||
    headerJoined.includes('date') ||
    headerJoined.includes('교대') ||
    headerJoined.includes('shift')
  ) {
    dateIndex = headerCells.findIndex((cell) => /날짜|date/i.test(cell));
    shiftIndex = headerCells.findIndex((cell) => /교대|shift/i.test(cell));
    nameIndex = headerCells.findIndex((cell) => /이름|name|담당|staff/i.test(cell));
    startIndex = 1;

    if (dateIndex < 0 || shiftIndex < 0 || nameIndex < 0) {
      return { error: 'CSV 헤더는 날짜, 교대, 이름 열이 필요합니다.' };
    }
  }

  const entries = [];
  const errors = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((cell) => !cell)) continue;

    const workDate = normalizeWorkDate(cells[dateIndex], month);
    const shift = normalizeShift(cells[shiftIndex]);
    const staffName = String(cells[nameIndex] || '').trim();

    if (!workDate || !shift || !staffName) {
      errors.push(`${i + 1}행: 날짜·교대·이름을 확인해 주세요.`);
      continue;
    }

    if (month && !workDate.startsWith(`${month}-`)) {
      errors.push(`${i + 1}행: ${workDate}는 ${month} 범위가 아닙니다.`);
      continue;
    }

    entries.push({ workDate, shift, staffName });
  }

  if (entries.length === 0) {
    return { error: errors[0] || '등록할 스케줄 행이 없습니다.' };
  }

  return { entries, errors };
}

function getScheduleByMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: 'month는 YYYY-MM 형식이어야 합니다.' };

  const rows = db
    .prepare(`
      SELECT * FROM schedule_entries
      WHERE work_date LIKE @monthPrefix
      ORDER BY work_date ASC, shift ASC, staff_name ASC
    `)
    .all({ monthPrefix: `${month}-%` });

  return rows.map(mapScheduleRow);
}

function getTodaySchedule(date = new Date()) {
  const workDate = formatLocalDate(date);
  const rows = db
    .prepare(`
      SELECT * FROM schedule_entries
      WHERE work_date = @workDate
      ORDER BY CASE shift
        WHEN '주간' THEN 1
        WHEN '오후' THEN 2
        WHEN '야간' THEN 3
        ELSE 4
      END, staff_name ASC
    `)
    .all({ workDate });

  const grouped = { 주간: [], 오후: [], 야간: [] };
  rows.forEach((row) => {
    if (grouped[row.shift]) grouped[row.shift].push(row.staff_name);
  });

  return {
    workDate,
    shifts: grouped,
    entries: rows.map(mapScheduleRow),
  };
}

function uploadSchedule(data) {
  const { csvText, month, replace = true } = data;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { error: '업로드할 월(YYYY-MM)을 선택해 주세요.' };
  }
  if (!csvText || !String(csvText).trim()) {
    return { error: 'CSV 파일 또는 내용을 입력해 주세요.' };
  }

  const parsed = parseScheduleCsv(csvText, month);
  if (parsed.error) return parsed;

  const insert = db.prepare(`
    INSERT INTO schedule_entries (work_date, shift, staff_name, created_at)
    VALUES (@workDate, @shift, @staffName, @createdAt)
    ON CONFLICT(work_date, shift, staff_name) DO NOTHING
  `);

  const transaction = db.transaction((entries) => {
    if (replace) {
      db.prepare(`
        DELETE FROM schedule_entries
        WHERE work_date LIKE @monthPrefix
      `).run({ monthPrefix: `${month}-%` });
    }

    const now = new Date().toISOString();
    let inserted = 0;

    entries.forEach((entry) => {
      const result = insert.run({
        workDate: entry.workDate,
        shift: entry.shift,
        staffName: entry.staffName,
        createdAt: now,
      });
      inserted += result.changes;
    });

    return inserted;
  });

  const inserted = transaction(parsed.entries);

  return {
    month,
    inserted,
    skippedErrors: parsed.errors,
    totalRows: parsed.entries.length,
    schedule: getScheduleByMonth(month),
  };
}

const CONTACT_DEPARTMENTS = ['엔지니어링', '하우스키핑', 'F&B', '매니저', '보안', '응급', '업체', '기타'];

function mapContactRow(row) {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    phone: row.phone,
    phoneAlt: row.phone_alt || '',
    note: row.note || '',
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getContacts(includeInactive = false) {
  const rows = includeInactive
    ? db
        .prepare('SELECT * FROM contacts ORDER BY is_pinned DESC, sort_order ASC, id ASC')
        .all()
    : db
        .prepare(
          'SELECT * FROM contacts WHERE is_active = 1 ORDER BY is_pinned DESC, sort_order ASC, id ASC'
        )
        .all();
  return rows.map(mapContactRow);
}

function createContact(data) {
  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();
  const department = String(data.department || '기타').trim() || '기타';

  if (!name) return { error: '이름/업체명을 입력해 주세요.' };
  if (!phone) return { error: '연락처를 입력해 주세요.' };

  const now = new Date().toISOString();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM contacts').get().maxOrder;

  const result = db
    .prepare(`
      INSERT INTO contacts (name, department, phone, phone_alt, note, sort_order, is_active, created_at, updated_at)
      VALUES (@name, @department, @phone, @phoneAlt, @note, @sortOrder, 1, @createdAt, @updatedAt)
    `)
    .run({
      name,
      department,
      phone,
      phoneAlt: String(data.phoneAlt || '').trim(),
      note: String(data.note || '').trim(),
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

  return mapContactRow(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
}

function updateContact(id, data) {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) return null;

  const name = data.name !== undefined ? String(data.name).trim() : existing.name;
  const phone = data.phone !== undefined ? String(data.phone).trim() : existing.phone;
  const department =
    data.department !== undefined ? String(data.department).trim() || '기타' : existing.department;

  if (!name) return { error: '이름/업체명을 입력해 주세요.' };
  if (!phone) return { error: '연락처를 입력해 주세요.' };

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE contacts
    SET name = @name,
        department = @department,
        phone = @phone,
        phone_alt = @phoneAlt,
        note = @note,
        is_active = @isActive,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    name,
    department,
    phone,
    phoneAlt: data.phoneAlt !== undefined ? String(data.phoneAlt).trim() : existing.phone_alt || '',
    note: data.note !== undefined ? String(data.note).trim() : existing.note || '',
    isActive: data.isActive === undefined ? existing.is_active : data.isActive ? 1 : 0,
    updatedAt: now,
  });

  return mapContactRow(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
}

function deleteContact(id) {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) return null;

  db.prepare('UPDATE contacts SET is_active = 0, updated_at = @updatedAt WHERE id = @id').run({
    id,
    updatedAt: new Date().toISOString(),
  });

  return mapContactRow(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
}

function duplicateCard(id, data = {}) {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) return null;

  return createCard({
    columnId: existing.column_id,
    priority: existing.priority,
    category: existing.category,
    room: existing.room,
    title: existing.title,
    details: existing.details || '',
    nextAction: existing.next_action || '',
    assigneeShift: existing.assignee_shift || '',
    assigneeName: existing.assignee_name || '',
    dueAt: existing.due_at || null,
    author: data.author || existing.author,
    audit: data.audit,
  });
}

function addCardComment(cardId, data) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const shift = String(data.shift || '').trim();
  const staffName = String(data.staffName || '').trim();
  const content = String(data.content || '').trim();

  if (!shift || !staffName) return { error: '교대와 이름을 선택해 주세요.' };
  if (!content) return { error: '추가 기록 내용을 입력해 주세요.' };

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO card_comments (card_id, shift, staff_name, content, created_at)
    VALUES (@cardId, @shift, @staffName, @content, @createdAt)
  `).run({ cardId, shift, staffName, content, createdAt: now });

  db.prepare('UPDATE cards SET updated_at = ? WHERE id = ?').run(now, cardId);

  const audit = getAudit(data);
  if (audit) {
    logActivity({
      entityType: 'card',
      entityId: cardId,
      action: 'update',
      shift: audit.shift,
      staffName: audit.staffName,
      summary: `추가 기록: ${cardLabelFromRow(card)}`,
      details: { changes: [content] },
    });
  }

  return rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId));
}

function addCardAttachment(cardId, data) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const count = db.prepare('SELECT COUNT(*) AS n FROM card_attachments WHERE card_id = ?').get(cardId).n;
  if (count >= 2) return { error: '사진은 카드당 최대 2장까지 등록할 수 있습니다.' };

  const imageData = String(data.imageData || '');
  const mimeType = String(data.mimeType || 'image/jpeg');
  if (!imageData) return { error: '이미지 데이터가 없습니다.' };
  if (!mimeType.startsWith('image/')) return { error: '이미지 파일만 등록할 수 있습니다.' };

  const base64 = imageData.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 2 * 1024 * 1024) return { error: '이미지는 2MB 이하만 등록할 수 있습니다.' };

  const cardDir = path.join(uploadsDir, `card-${cardId}`);
  fs.mkdirSync(cardDir, { recursive: true });
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(cardDir, storedName);
  fs.writeFileSync(filePath, buffer);

  const now = new Date().toISOString();
  const originalName = String(data.filename || storedName).trim() || storedName;
  const result = db
    .prepare(`
      INSERT INTO card_attachments (card_id, filename, mime_type, file_path, created_at)
      VALUES (@cardId, @filename, @mimeType, @filePath, @createdAt)
    `)
    .run({
      cardId,
      filename: originalName,
      mimeType,
      filePath,
      createdAt: now,
    });

  db.prepare('UPDATE cards SET updated_at = ? WHERE id = ?').run(now, cardId);

  return rowToAttachment(
    db.prepare('SELECT * FROM card_attachments WHERE id = ?').get(result.lastInsertRowid)
  );
}

function deleteCardAttachment(attachmentId) {
  const row = db.prepare('SELECT * FROM card_attachments WHERE id = ?').get(attachmentId);
  if (!row) return null;
  if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  db.prepare('DELETE FROM card_attachments WHERE id = ?').run(attachmentId);
  return true;
}

function getChecklist(shift) {
  if (!shift) return { error: '교대를 선택해 주세요.' };

  const workDate = formatLocalDate(new Date());
  const items = db
    .prepare('SELECT * FROM checklist_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all();
  const completions = db
    .prepare('SELECT * FROM checklist_completions WHERE work_date = ? AND shift = ?')
    .all(workDate, shift);
  const completionMap = new Map(completions.map((row) => [row.item_id, row]));

  return {
    workDate,
    shift,
    items: items.map((row) => {
      const done = completionMap.get(row.id);
      return {
        id: row.id,
        label: row.label,
        sortOrder: row.sort_order,
        completed: Boolean(done),
        completedBy: done ? `${done.shift} · ${done.staff_name}` : '',
        completedAt: done?.completed_at || null,
      };
    }),
  };
}

function toggleChecklistItem(itemId, data) {
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ? AND is_active = 1').get(itemId);
  if (!item) return null;

  const shift = String(data.shift || '').trim();
  const staffName = String(data.staffName || '').trim();
  if (!shift || !staffName) return { error: '교대와 이름을 선택해 주세요.' };

  const workDate = formatLocalDate(new Date());
  const existing = db
    .prepare('SELECT * FROM checklist_completions WHERE item_id = ? AND work_date = ? AND shift = ?')
    .get(itemId, workDate, shift);

  if (existing) {
    db.prepare('DELETE FROM checklist_completions WHERE id = ?').run(existing.id);
    return getChecklist(shift);
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO checklist_completions (item_id, work_date, shift, staff_name, completed_at)
    VALUES (@itemId, @workDate, @shift, @staffName, @completedAt)
  `).run({ itemId, workDate, shift, staffName, completedAt: now });

  return getChecklist(shift);
}

function createChecklistItem(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return { error: '체크 항목을 입력해 주세요.' };

  const now = new Date().toISOString();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM checklist_items')
    .get().maxOrder;

  const result = db
    .prepare(`
      INSERT INTO checklist_items (label, sort_order, is_active, created_at)
      VALUES (@label, @sortOrder, 1, @createdAt)
    `)
    .run({ label: trimmed, sortOrder: maxOrder + 1, createdAt: now });

  return {
    id: result.lastInsertRowid,
    label: trimmed,
    sortOrder: maxOrder + 1,
    isActive: true,
    createdAt: now,
  };
}

function deleteChecklistItem(id) {
  const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('UPDATE checklist_items SET is_active = 0 WHERE id = ?').run(id);
  return true;
}

function getChecklistItemDefinitions() {
  return db
    .prepare('SELECT * FROM checklist_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all()
    .map((row) => ({
      id: row.id,
      label: row.label,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    }));
}

function toggleContactPin(id) {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) return null;

  const nextPinned = existing.is_pinned ? 0 : 1;
  const now = new Date().toISOString();
  db.prepare('UPDATE contacts SET is_pinned = ?, updated_at = ? WHERE id = ?').run(nextPinned, now, id);

  return mapContactRow(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
}

function getPinnedContacts() {
  return db
    .prepare(`
      SELECT * FROM contacts
      WHERE is_active = 1 AND is_pinned = 1
      ORDER BY sort_order ASC, id ASC
      LIMIT 6
    `)
    .all()
    .map(mapContactRow);
}

module.exports = {
  getCards,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  moveCard,
  clearDoneCards,
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePin,
  acknowledgeCard,
  logShiftHandover,
  getActivityLogs,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getScheduleByMonth,
  getTodaySchedule,
  uploadSchedule,
  VALID_SHIFTS,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  CONTACT_DEPARTMENTS,
  duplicateCard,
  addCardComment,
  addCardAttachment,
  deleteCardAttachment,
  getChecklist,
  toggleChecklistItem,
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItemDefinitions,
  toggleContactPin,
  getPinnedContacts,
  getCardTemplates,
  createCardTemplate,
  updateCardTemplate,
  deleteCardTemplate,
};
