#!/usr/bin/env node
/**
 * SHIFT+CHECK+LIST.xlsx → supabase/migrations/028_shift_checklist_seed.sql
 * Usage: node scripts/generate-shift-checklist-migration.js [xlsx-path]
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const xlsxPath =
  process.argv[2] ??
  path.join(__dirname, '..', 'samples', 'shift-checklist.xlsx');

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function extractItems(sheetName, wb) {
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  const items = [];
  for (let i = 0; i < matrix.length; i++) {
    const colA = String(matrix[i][0] ?? '').trim();
    const colE = String(matrix[i][4] ?? '').trim();
    if (!colA) continue;
    if (/shift check list/i.test(colA)) continue;
    if (/^A \(|^B \(|^C \(/i.test(colA) && colA.length < 60) continue;
    if (colA === 'EOD  후' || colA === 'EOD 후') continue;
    let label = colA.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (colE) label += `\n[참고] ${colE.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}`;
    items.push(label);
  }
  return items;
}

const wb = XLSX.readFile(xlsxPath);
const groups = [
  ['A (오전조) Shift', 'A'],
  ['B (오후조) Shift', 'B'],
  ['C (야간조) Shift', 'C'],
];

const rows = [];
for (const [sheet, code] of groups) {
  const items = extractItems(sheet, wb);
  items.forEach((label, idx) => {
    rows.push(`    (p_hotel_id, E'${escapeSql(label)}', ${idx}, '${code}')`);
  });
}

const migration = `-- Shift Check List (SHIFT+CHECK+LIST.xlsx) → checklist_items
-- A조 07:00~16:00 · B조 13:00~22:00 · C조 22:00~07:00
-- Regenerate: cd web && node scripts/generate-shift-checklist-migration.js

create or replace function public.seed_shift_checklist_items(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.checklist_completions
  where item_id in (
    select id from public.checklist_items
    where hotel_id = p_hotel_id
      and work_group in ('A', 'B', 'C')
  );

  delete from public.checklist_items
  where hotel_id = p_hotel_id
    and work_group in ('A', 'B', 'C');

  insert into public.checklist_items (hotel_id, label, sort_order, work_group) values
${rows.join(',\n')};
end;
$$;

grant execute on function public.seed_shift_checklist_items(uuid) to authenticated;

select public.seed_shift_checklist_items('00000000-0000-4000-8000-000000000001'::uuid);

delete from public.checklist_completions
where item_id in (
  select id from public.checklist_items
  where hotel_id = '00000000-0000-4000-8000-000000000001'
    and work_group = 'common'
);

delete from public.checklist_items
where hotel_id = '00000000-0000-4000-8000-000000000001'
  and work_group = 'common';
`;

const out = path.join(__dirname, '..', '..', 'supabase', 'migrations', '028_shift_checklist_seed.sql');
fs.writeFileSync(out, migration);
console.log('Wrote', out);
for (const [sheet, code] of groups) {
  console.log(`  ${code}조: ${extractItems(sheet, wb).length} items`);
}
