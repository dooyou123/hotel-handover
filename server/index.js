const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json({ limit: '3mb' }));

function handleMutationError(result, res) {
  if (result && typeof result === 'object' && result.error) {
    res.status(400).json({ error: result.error });
    return true;
  }
  return false;
}

app.get('/api/cards', (_req, res) => {
  res.json(db.getCards());
});

app.post('/api/cards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '한 줄 요약을 입력해 주세요.' });
  }
  const card = db.createCard(req.body);
  res.status(201).json(card);
});

app.patch('/api/cards/:id', (req, res) => {
  const card = db.updateCard(Number(req.params.id), req.body);
  if (!card) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.json(card);
});

app.delete('/api/cards/:id', (req, res) => {
  const result = db.deleteCard(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.status(204).end();
});

app.post('/api/cards/reorder', (req, res) => {
  const { columnId, orderedIds } = req.body;
  if (!columnId || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'columnId와 orderedIds가 필요합니다.' });
  }
  res.json(db.reorderCards(columnId, orderedIds));
});

app.post('/api/cards/:id/move', (req, res) => {
  const { columnId, sortOrder } = req.body;
  if (!columnId) {
    return res.status(400).json({ error: 'columnId가 필요합니다.' });
  }
  const card = db.moveCard(Number(req.params.id), columnId, sortOrder ?? 0, req.body);
  if (handleMutationError(card, res)) return;
  if (!card) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.json(card);
});

app.post('/api/cards/:id/duplicate', (req, res) => {
  const card = db.duplicateCard(Number(req.params.id), req.body);
  if (!card) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.status(201).json(card);
});

app.post('/api/cards/:id/comments', (req, res) => {
  const result = db.addCardComment(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.status(201).json(result);
});

app.post('/api/cards/:id/attachments', (req, res) => {
  const result = db.addCardAttachment(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.status(201).json(result);
});

app.delete('/api/cards/:cardId/attachments/:id', (req, res) => {
  const result = db.deleteCardAttachment(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '사진을 찾을 수 없습니다.' });
  res.status(204).end();
});

app.get('/api/checklist', (req, res) => {
  const { shift } = req.query;
  const result = db.getChecklist(shift);
  if (handleMutationError(result, res)) return;
  res.json(result);
});

app.get('/api/checklist/items', (_req, res) => {
  res.json(db.getChecklistItemDefinitions());
});

app.post('/api/checklist/:id/toggle', (req, res) => {
  const result = db.toggleChecklistItem(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '체크 항목을 찾을 수 없습니다.' });
  res.json(result);
});

app.post('/api/checklist', (req, res) => {
  const result = db.createChecklistItem(req.body.label);
  if (handleMutationError(result, res)) return;
  res.status(201).json(result);
});

app.delete('/api/checklist/:id', (req, res) => {
  const result = db.deleteChecklistItem(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '체크 항목을 찾을 수 없습니다.' });
  res.status(204).end();
});

app.post('/api/cards/clear-done', (req, res) => {
  const result = db.clearDoneCards(req.body);
  if (handleMutationError(result, res)) return;
  res.json({ cleared: result });
});

app.post('/api/cards/:id/acknowledge', (req, res) => {
  const { shift, staffName } = req.body;
  if (!shift || !staffName || !String(staffName).trim()) {
    return res.status(400).json({ error: '교대와 이름을 선택해 주세요.' });
  }
  const card = db.acknowledgeCard(Number(req.params.id), {
    shift,
    staffName: String(staffName).trim(),
  });
  if (!card) return res.status(404).json({ error: '카드를 찾을 수 없습니다.' });
  res.json(card);
});

app.post('/api/shift-handover', (req, res) => {
  const { shift, staffName } = req.body;
  if (!shift || !staffName || !String(staffName).trim()) {
    return res.status(400).json({ error: '교대와 이름을 선택해 주세요.' });
  }
  const record = db.logShiftHandover({
    shift,
    staffName: String(staffName).trim(),
    handoverType: req.body.handoverType === 'end' ? 'end' : 'start',
    workDate: req.body.workDate,
    unackedUrgent: req.body.unackedUrgent ?? 0,
    urgentCount: req.body.urgentCount ?? 0,
    progressCount: req.body.progressCount ?? 0,
    todayCount: req.body.todayCount ?? 0,
    checklistIncomplete: req.body.checklistIncomplete ?? 0,
    progressRemaining: req.body.progressRemaining ?? 0,
    notes: req.body.notes || '',
  });
  res.status(201).json(record);
});

app.get('/api/activity-logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 80, 200);
  res.json(db.getActivityLogs(limit));
});

app.get('/api/staff', (req, res) => {
  const includeInactive = req.query.all === '1';
  res.json(db.getStaff(includeInactive));
});

app.post('/api/staff', (req, res) => {
  const result = db.createStaff(req.body.name);
  if (handleMutationError(result, res)) return;
  res.status(201).json(result);
});

app.patch('/api/staff/:id', (req, res) => {
  const result = db.updateStaff(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
  res.json(result);
});

app.delete('/api/staff/:id', (req, res) => {
  const result = db.deleteStaff(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
  res.json(result);
});

app.get('/api/schedule/today', (_req, res) => {
  res.json(db.getTodaySchedule());
});

app.get('/api/schedule', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month(YYYY-MM)가 필요합니다.' });
  const schedule = db.getScheduleByMonth(month);
  if (schedule.error) return res.status(400).json({ error: schedule.error });
  res.json(schedule);
});

app.post('/api/schedule/upload', (req, res) => {
  const result = db.uploadSchedule(req.body);
  if (handleMutationError(result, res)) return;
  res.status(201).json(result);
});

app.get('/api/contacts', (req, res) => {
  const includeInactive = req.query.all === '1';
  res.json(db.getContacts(includeInactive));
});

app.post('/api/contacts', (req, res) => {
  const result = db.createContact(req.body);
  if (handleMutationError(result, res)) return;
  res.status(201).json(result);
});

app.patch('/api/contacts/:id', (req, res) => {
  const result = db.updateContact(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' });
  res.json(result);
});

app.delete('/api/contacts/:id', (req, res) => {
  const result = db.deleteContact(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' });
  res.json(result);
});

app.get('/api/contacts/pinned', (_req, res) => {
  res.json(db.getPinnedContacts());
});

app.post('/api/contacts/:id/toggle-pin', (req, res) => {
  const result = db.toggleContactPin(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' });
  res.json(result);
});

app.get('/api/card-templates', (_req, res) => {
  res.json(db.getCardTemplates());
});

app.post('/api/card-templates', (req, res) => {
  const result = db.createCardTemplate(req.body);
  if (handleMutationError(result, res)) return;
  res.status(201).json(result);
});

app.patch('/api/card-templates/:id', (req, res) => {
  const result = db.updateCardTemplate(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
  res.json(result);
});

app.delete('/api/card-templates/:id', (req, res) => {
  const result = db.deleteCardTemplate(Number(req.params.id));
  if (!result) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
  res.status(204).end();
});

app.get('/api/notices', (req, res) => {
  const { type } = req.query;
  if (type && !['announcement', 'change'].includes(type)) {
    return res.status(400).json({ error: 'type은 announcement 또는 change 여야 합니다.' });
  }
  res.json(db.getNotices(type));
});

app.post('/api/notices', (req, res) => {
  const { type, content } = req.body;
  if (!type || !['announcement', 'change'].includes(type)) {
    return res.status(400).json({ error: '공지 유형을 선택해 주세요.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '내용을 입력해 주세요.' });
  }
  const notice = db.createNotice(req.body);
  res.status(201).json(notice);
});

app.patch('/api/notices/:id', (req, res) => {
  const notice = db.updateNotice(Number(req.params.id), req.body);
  if (!notice) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  res.json(notice);
});

app.delete('/api/notices/:id', (req, res) => {
  const result = db.deleteNotice(Number(req.params.id), req.body);
  if (handleMutationError(result, res)) return;
  if (!result) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  res.status(204).end();
});

app.post('/api/notices/:id/toggle-pin', (req, res) => {
  const notice = db.toggleNoticePin(Number(req.params.id));
  if (!notice) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
  res.json(notice);
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`호텔 인수인계 보드: http://localhost:${PORT}`);
  console.log(`같은 Wi-Fi에서 공유: http://<이 PC IP>:${PORT}`);
});
