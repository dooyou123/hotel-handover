#!/usr/bin/env node
/**
 * SQLite (hotel-handover) → Supabase Postgres one-shot migration
 *
 * Usage (cutover day):
 *   cd web
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-from-sqlite.js ../data/handover.db --replace
 *
 * Options:
 *   --replace     Delete existing hotel data in Supabase before import
 *   --uploads=DIR Path to data/uploads (default: sibling of db file)
 *
 * Prerequisites:
 *   - 001_initial_schema.sql + 002_storage.sql applied
 *   - npm install (better-sqlite3 is a devDependency)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const HOTEL_ID = process.env.NEXT_PUBLIC_DEFAULT_HOTEL_ID || '00000000-0000-4000-8000-000000000001';
const BUCKET = 'card-attachments';

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const dbArg = args.find((arg) => !arg.startsWith('--') && !arg.includes('='));
const uploadsArg = args.find((arg) => arg.startsWith('--uploads='));
const dbPath = dbArg || path.join(__dirname, '..', '..', 'data', 'handover.db');
const uploadsDir =
  uploadsArg?.split('=')[1] ||
  process.env.UPLOADS_DIR ||
  path.join(path.dirname(dbPath), 'uploads');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const idMap = {
  staff: new Map(),
  cards: new Map(),
  notices: new Map(),
  contacts: new Map(),
  checklist_items: new Map(),
  card_templates: new Map(),
};

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function deleteHotelData() {
  console.log('Clearing existing hotel data…');

  const { data: cardRows } = await supabase.from('cards').select('id').eq('hotel_id', HOTEL_ID);
  const cardIds = (cardRows ?? []).map((row) => row.id);

  if (cardIds.length) {
    await supabase.from('card_acknowledgments').delete().in('card_id', cardIds);
    await supabase.from('card_comments').delete().in('card_id', cardIds);
    const { data: attachments } = await supabase.from('card_attachments').select('storage_path').in('card_id', cardIds);
    const paths = (attachments ?? []).map((row) => row.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await supabase.from('card_attachments').delete().in('card_id', cardIds);
  }

  const tables = [
    'activity_logs',
    'shift_handovers',
    'schedule_entries',
    'checklist_completions',
    'checklist_items',
    'card_templates',
    'contacts',
    'notices',
    'cards',
    'staff',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('hotel_id', HOTEL_ID);
    if (error) throw new Error(`${table} delete: ${error.message}`);
  }
}

async function insertRows(table, rows, batchSize = 200) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

async function migrateStaff(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM staff ORDER BY sort_order, id').all();
  const payload = rows.map((row) => ({
    hotel_id: HOTEL_ID,
    legacy_id: row.id,
    name: row.name,
    is_active: !!row.is_active,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
  }));
  await insertRows('staff', payload);

  const { data } = await supabase.from('staff').select('id, legacy_id').eq('hotel_id', HOTEL_ID);
  (data ?? []).forEach((row) => {
    if (row.legacy_id != null) idMap.staff.set(row.legacy_id, row.id);
  });
  console.log(`staff: ${rows.length}`);
}

async function migrateChecklistItems(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM checklist_items ORDER BY sort_order, id').all();
  const payload = rows.map((row) => ({
    hotel_id: HOTEL_ID,
    legacy_id: row.id,
    label: row.label,
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
    created_at: row.created_at,
  }));
  await insertRows('checklist_items', payload);

  const { data } = await supabase.from('checklist_items').select('id, legacy_id').eq('hotel_id', HOTEL_ID);
  (data ?? []).forEach((row) => {
    if (row.legacy_id != null) idMap.checklist_items.set(row.legacy_id, row.id);
  });
  console.log(`checklist_items: ${rows.length}`);
}

async function migrateCardTemplates(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM card_templates ORDER BY sort_order, id').all();
  const payload = rows.map((row) => ({
    hotel_id: HOTEL_ID,
    legacy_id: row.id,
    label: row.label,
    priority: row.priority,
    column_id: row.column_id,
    category: row.category,
    title: row.title ?? '',
    next_action: row.next_action ?? '',
    details: row.details ?? '',
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }));
  await insertRows('card_templates', payload);
  console.log(`card_templates: ${rows.length}`);
}

async function migrateContacts(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM contacts ORDER BY sort_order, id').all();
  const payload = rows.map((row) => ({
    hotel_id: HOTEL_ID,
    legacy_id: row.id,
    name: row.name,
    department: row.department ?? '기타',
    phone: row.phone,
    phone_alt: row.phone_alt ?? '',
    note: row.note ?? '',
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
    is_pinned: !!row.is_pinned,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }));
  await insertRows('contacts', payload);
  console.log(`contacts: ${rows.length}`);
}

async function migrateCards(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM cards ORDER BY sort_order, id').all();
  const payload = rows.map((row) => ({
    hotel_id: HOTEL_ID,
    legacy_id: row.id,
    column_id: row.column_id,
    priority: row.priority,
    category: row.category ?? '기타',
    room: row.room ?? '',
    title: row.title,
    details: row.details ?? '',
    resolution: row.resolution ?? '',
    next_action: row.next_action ?? '',
    author: row.author ?? '',
    assignee_shift: row.assignee_shift ?? '',
    assignee_name: row.assignee_name ?? '',
    due_at: row.due_at || null,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }));
  await insertRows('cards', payload);

  const { data } = await supabase.from('cards').select('id, legacy_id').eq('hotel_id', HOTEL_ID);
  (data ?? []).forEach((row) => {
    if (row.legacy_id != null) idMap.cards.set(row.legacy_id, row.id);
  });
  console.log(`cards: ${rows.length}`);
}

async function migrateCardChildren(sqlite) {
  const acks = sqlite.prepare('SELECT * FROM card_acknowledgments ORDER BY id').all();
  await insertRows(
    'card_acknowledgments',
    acks
      .map((row) => ({
        card_id: idMap.cards.get(row.card_id),
        shift: row.shift,
        staff_name: row.staff_name,
        acknowledged_at: row.acknowledged_at,
      }))
      .filter((row) => row.card_id),
  );
  console.log(`card_acknowledgments: ${acks.length}`);

  const comments = sqlite.prepare('SELECT * FROM card_comments ORDER BY id').all();
  await insertRows(
    'card_comments',
    comments
      .map((row) => ({
        card_id: idMap.cards.get(row.card_id),
        shift: row.shift,
        staff_name: row.staff_name,
        content: row.content,
        created_at: row.created_at,
      }))
      .filter((row) => row.card_id),
  );
  console.log(`card_comments: ${comments.length}`);

  const attachments = sqlite.prepare('SELECT * FROM card_attachments ORDER BY id').all();
  let uploaded = 0;
  let skipped = 0;

  for (const row of attachments) {
    const cardId = idMap.cards.get(row.card_id);
    if (!cardId) {
      skipped += 1;
      continue;
    }

    const filePath = row.file_path;
    if (!filePath || !fs.existsSync(filePath)) {
      skipped += 1;
      continue;
    }

    const ext = path.extname(row.filename || filePath).replace('.', '').toLowerCase() || 'jpg';
    const storagePath = `${HOTEL_ID}/${cardId}/legacy-${row.id}.${ext}`;
    const buffer = fs.readFileSync(filePath);

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: row.mime_type || 'image/jpeg',
      upsert: true,
    });
    if (uploadError) {
      console.warn(`attachment ${row.id} upload failed:`, uploadError.message);
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from('card_attachments').insert({
      card_id: cardId,
      filename: row.filename,
      mime_type: row.mime_type,
      storage_path: storagePath,
      created_at: row.created_at,
    });
    if (error) {
      console.warn(`attachment ${row.id} row failed:`, error.message);
      skipped += 1;
      continue;
    }
    uploaded += 1;
  }
  console.log(`card_attachments: ${uploaded} uploaded, ${skipped} skipped`);
}

async function migrateNotices(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM notices ORDER BY id').all();
  await insertRows(
    'notices',
    rows.map((row) => ({
      hotel_id: HOTEL_ID,
      legacy_id: row.id,
      type: row.type,
      content: row.content,
      author: row.author ?? '',
      is_pinned: !!row.is_pinned,
      expires_at: row.expires_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
    })),
  );

  const { data } = await supabase.from('notices').select('id, legacy_id').eq('hotel_id', HOTEL_ID);
  (data ?? []).forEach((row) => {
    if (row.legacy_id != null) idMap.notices.set(row.legacy_id, row.id);
  });
  console.log(`notices: ${rows.length}`);
}

async function migrateSchedule(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM schedule_entries ORDER BY work_date, shift, staff_name').all();
  await insertRows(
    'schedule_entries',
    rows.map((row) => ({
      hotel_id: HOTEL_ID,
      work_date: row.work_date,
      shift: row.shift,
      staff_name: row.staff_name,
      created_at: row.created_at,
    })),
  );
  console.log(`schedule_entries: ${rows.length}`);
}

async function migrateChecklistCompletions(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM checklist_completions ORDER BY id').all();
  await insertRows(
    'checklist_completions',
    rows
      .map((row) => ({
        item_id: idMap.checklist_items.get(row.item_id),
        work_date: row.work_date,
        shift: row.shift,
        staff_name: row.staff_name,
        completed_at: row.completed_at,
      }))
      .filter((row) => row.item_id),
  );
  console.log(`checklist_completions: ${rows.length}`);
}

async function migrateShiftHandovers(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM shift_handovers ORDER BY handover_at').all();
  await insertRows(
    'shift_handovers',
    rows.map((row) => ({
      hotel_id: HOTEL_ID,
      shift: row.shift,
      staff_name: row.staff_name,
      handover_type: row.handover_type || 'start',
      work_date: row.work_date || row.handover_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      unacked_urgent: row.unacked_urgent ?? 0,
      urgent_count: row.urgent_count ?? 0,
      progress_count: row.progress_count ?? 0,
      today_count: row.today_count ?? 0,
      checklist_incomplete: row.checklist_incomplete ?? 0,
      progress_remaining: row.progress_remaining ?? 0,
      notes: row.notes ?? '',
      handover_at: row.handover_at,
    })),
  );
  console.log(`shift_handovers: ${rows.length}`);
}

async function migrateActivityLogs(sqlite) {
  const rows = sqlite.prepare('SELECT * FROM activity_logs ORDER BY created_at').all();
  await insertRows(
    'activity_logs',
    rows.map((row) => {
      const entityUuid =
        row.entity_type === 'card'
          ? idMap.cards.get(row.entity_id)
          : row.entity_type === 'notice'
            ? idMap.notices.get(row.entity_id)
            : null;

      return {
        hotel_id: HOTEL_ID,
        entity_type: row.entity_type,
        entity_id: entityUuid ?? null,
        legacy_entity_id: row.entity_id ?? null,
        action: row.action,
        shift: row.shift ?? '',
        staff_name: row.staff_name ?? '',
        summary: row.summary,
        details: parseJson(row.details),
        created_at: row.created_at,
      };
    }),
  );
  console.log(`activity_logs: ${rows.length}`);
}

async function printVerification(sqlite) {
  const pairs = [
    ['staff', 'staff'],
    ['cards', 'cards'],
    ['notices', 'notices'],
    ['contacts', 'contacts'],
    ['checklist_items', 'checklist_items'],
    ['card_templates', 'card_templates'],
    ['schedule_entries', 'schedule_entries'],
    ['shift_handovers', 'shift_handovers'],
    ['activity_logs', 'activity_logs'],
  ];

  console.log('\nVerification (SQLite vs Supabase):');
  for (const [sqliteTable, pgTable] of pairs) {
    const sqliteCount = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${sqliteTable}`).get().n;
    const { count, error } = await supabase
      .from(pgTable)
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', HOTEL_ID);
    if (error) {
      console.log(`  ${pgTable}: SQLite=${sqliteCount}, Supabase=ERROR (${error.message})`);
    } else {
      const ok = sqliteCount === count ? 'OK' : 'MISMATCH';
      console.log(`  ${pgTable}: SQLite=${sqliteCount}, Supabase=${count} ${ok}`);
    }
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!fs.existsSync(dbPath)) {
    console.error('SQLite file not found:', dbPath);
    process.exit(1);
  }

  const sqlite = new Database(dbPath, { readonly: true });
  console.log('Migrating from', dbPath);
  console.log('Uploads dir:', uploadsDir);

  if (replace) {
    await deleteHotelData();
  } else {
    console.log('Tip: use --replace to clear existing hotel rows before import.');
  }

  await migrateStaff(sqlite);
  await migrateChecklistItems(sqlite);
  await migrateCardTemplates(sqlite);
  await migrateContacts(sqlite);
  await migrateCards(sqlite);
  await migrateCardChildren(sqlite);
  await migrateNotices(sqlite);
  await migrateSchedule(sqlite);
  await migrateChecklistCompletions(sqlite);
  await migrateShiftHandovers(sqlite);
  await migrateActivityLogs(sqlite);

  await printVerification(sqlite);
  sqlite.close();
  console.log('\nMigration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
