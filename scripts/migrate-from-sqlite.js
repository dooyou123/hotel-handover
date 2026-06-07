#!/usr/bin/env node
/**
 * SQLite (hotel-handover) → Supabase Postgres one-shot migration
 *
 * Usage (cutover day):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-from-sqlite.js /path/to/handover.db
 *
 * Prerequisites:
 *   - 001_initial_schema.sql applied to Supabase
 *   - npm install better-sqlite3 @supabase/supabase-js
 *   - Stop old Express server before final run
 */

const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const HOTEL_ID = process.env.NEXT_PUBLIC_DEFAULT_HOTEL_ID || '00000000-0000-4000-8000-000000000001';
const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'handover.db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const idMap = {
  staff: new Map(),
  cards: new Map(),
  notices: new Map(),
  contacts: new Map(),
  checklist_items: new Map(),
  card_templates: new Map(),
};

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sqlite = new Database(dbPath, { readonly: true });
  console.log('Migrating from', dbPath);

  // TODO (cutover implementation):
  // 1. staff → capture legacy_id → uuid in idMap
  // 2. cards (+ assignee, due_at, resolution)
  // 3. card_acknowledgments, card_comments
  // 4. card_attachments + upload files to Storage
  // 5. notices, contacts, checklist_*, card_templates
  // 6. schedule_entries, shift_handovers, activity_logs
  // 7. Print row counts vs SQLite for verification

  sqlite.close();
  console.log('Migration skeleton — implement before D-Day');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
