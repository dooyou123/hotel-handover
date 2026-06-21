import * as XLSX from 'xlsx';
import { WORK_GROUPS } from '@/lib/constants';
import { normalizeScheduleGroup } from '@/lib/schedule/group-utils';

export type ScheduleEntry = {
  id: string;
  hotel_id: string;
  work_date: string;
  shift: string;
  staff_name: string;
  created_at: string;
};

export type ParsedScheduleRow = {
  work_date: string;
  shift: string;
  staff_name: string;
};

export type ScheduleParseFormat = 'matrix' | 'long';

export type ScheduleParseResult = {
  format: ScheduleParseFormat;
  entries: ParsedScheduleRow[];
  errors: string[];
};

function parseGridLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
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

function parsePasteLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((cell) => cell.trim());
  }
  return parseGridLine(line);
}

export function textToScheduleGrid(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => parsePasteLine(line))
    .filter((row) => row.some((cell) => cell.trim()));
}

function matrixFromXlsx(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
  return matrix.map((row) => row.map((cell) => String(cell ?? '').trim()));
}

function normalizeWorkDate(value: string, fallbackMonth: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const shortMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})$/);
  if (shortMatch && fallbackMonth) {
    const [, month, day] = shortMatch;
    const [year] = fallbackMonth.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const dayOnlyMatch = text.match(/^(\d{1,2})일?$/);
  if (dayOnlyMatch && fallbackMonth) {
    return `${fallbackMonth}-${dayOnlyMatch[1].padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function isDateHeader(cell: string): boolean {
  return /^(날짜|date|일자|근무일|일)$/i.test(cell.trim());
}

function splitStaffNames(cell: string): string[] {
  return cell
    .split(/[,/\n、|]+/)
    .map((name) => name.trim())
    .filter((name) => name && !/^[-—–·]+$/.test(name) && !/^(휴|휴무|off|x)$/i.test(name));
}

type MatrixLayout = {
  headerRow: number;
  dateCol: number;
  groupCols: { col: number; shift: string }[];
};

function detectMatrixLayout(grid: string[][], month: string): MatrixLayout | null {
  const scanRows = Math.min(grid.length, 6);

  for (let rowIndex = 0; rowIndex < scanRows; rowIndex += 1) {
    const row = grid[rowIndex];
    let dateCol = row.findIndex((cell) => isDateHeader(cell));
    if (dateCol < 0) dateCol = 0;

    const groupCols: MatrixLayout['groupCols'] = [];
    row.forEach((cell, col) => {
      if (col === dateCol) return;
      const shift = normalizeScheduleGroup(cell);
      if (shift) groupCols.push({ col, shift });
    });

    if (groupCols.length >= 2) {
      return { headerRow: rowIndex, dateCol, groupCols };
    }
  }

  const dataRows = grid.filter((row) => normalizeWorkDate(row[0] ?? '', month));
  if (dataRows.length < 2) return null;

  const colCount = Math.max(...grid.map((row) => row.length));
  if (colCount < 3) return null;

  const groupCols = WORK_GROUPS.slice(0, colCount - 1).map((shift, index) => ({
    col: index + 1,
    shift,
  }));

  return { headerRow: -1, dateCol: 0, groupCols };
}

export function parseScheduleMatrix(
  grid: string[][],
  month: string,
): { entries: ParsedScheduleRow[]; errors: string[] } | { error: string } {
  if (!grid.length) return { error: '붙여넣은 내용이 비어 있습니다.' };

  const layout = detectMatrixLayout(grid, month);
  if (!layout) return { error: '엑셀 근무표 형식을 인식하지 못했습니다.' };

  const entries: ParsedScheduleRow[] = [];
  const errors: string[] = [];
  const startRow = layout.headerRow >= 0 ? layout.headerRow + 1 : 0;

  for (let rowIndex = startRow; rowIndex < grid.length; rowIndex += 1) {
    const row = grid[rowIndex];
    if (!row.some((cell) => cell.trim())) continue;

    const dateCell = row[layout.dateCol] ?? '';
    if (isDateHeader(dateCell)) continue;

    const workDate = normalizeWorkDate(dateCell, month);
    if (!workDate) {
      if (dateCell.trim()) errors.push(`${rowIndex + 1}행: 날짜를 확인해 주세요 (${dateCell}).`);
      continue;
    }
    if (month && !workDate.startsWith(`${month}-`)) {
      errors.push(`${rowIndex + 1}행: ${workDate}는 ${month} 범위가 아닙니다.`);
      continue;
    }

    let hasStaff = false;
    for (const { col, shift } of layout.groupCols) {
      const names = splitStaffNames(row[col] ?? '');
      names.forEach((staff_name) => {
        hasStaff = true;
        entries.push({ work_date: workDate, shift, staff_name });
      });
    }

    if (!hasStaff && dateCell.trim()) {
      errors.push(`${rowIndex + 1}행: 근무자 이름이 없습니다.`);
    }
  }

  if (!entries.length) {
    return { error: errors[0] || '등록할 근무표 행이 없습니다.' };
  }

  return { entries, errors };
}

export function parseScheduleCsv(
  csvText: string,
  month: string,
): { entries: ParsedScheduleRow[]; errors: string[] } | { error: string } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return { error: '붙여넣은 내용이 비어 있습니다.' };

  let startIndex = 0;
  let dateIndex = 0;
  let shiftIndex = 1;
  let nameIndex = 2;

  const headerCells = parseGridLine(lines[0]).map((cell) => cell.replace(/\uFEFF/g, ''));
  const headerJoined = headerCells.join(',').toLowerCase();

  if (
    headerJoined.includes('날짜') ||
    headerJoined.includes('date') ||
    headerJoined.includes('교대') ||
    headerJoined.includes('shift') ||
    headerJoined.includes('조') ||
    headerJoined.includes('group')
  ) {
    dateIndex = headerCells.findIndex((cell) => /날짜|date/i.test(cell));
    shiftIndex = headerCells.findIndex((cell) => /교대|shift|조|group/i.test(cell));
    nameIndex = headerCells.findIndex((cell) => /이름|name|담당|staff/i.test(cell));
    startIndex = 1;
    if (dateIndex < 0 || shiftIndex < 0 || nameIndex < 0) {
      return { error: 'CSV 헤더는 날짜, 조, 이름 열이 필요합니다.' };
    }
  }

  const entries: ParsedScheduleRow[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = parseGridLine(lines[i]);
    if (cells.every((cell) => !cell)) continue;

    const workDate = normalizeWorkDate(cells[dateIndex] ?? '', month);
    const shift = normalizeScheduleGroup(cells[shiftIndex] ?? '');
    const staffName = (cells[nameIndex] ?? '').trim();

    if (!workDate || !shift || !staffName) {
      errors.push(`${i + 1}행: 날짜·조·이름을 확인해 주세요.`);
      continue;
    }
    if (month && !workDate.startsWith(`${month}-`)) {
      errors.push(`${i + 1}행: ${workDate}는 ${month} 범위가 아닙니다.`);
      continue;
    }
    entries.push({ work_date: workDate, shift, staff_name: staffName });
  }

  if (!entries.length) {
    return { error: errors[0] || '등록할 스케줄 행이 없습니다.' };
  }

  return { entries, errors };
}

function dedupeEntries(entries: ParsedScheduleRow[]): ParsedScheduleRow[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.work_date}|${entry.shift}|${entry.staff_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeLongFormat(grid: string[][], month: string): boolean {
  const header = grid[0] ?? [];
  if (header.some((cell) => /이름|name|staff|담당/i.test(cell))) return true;

  const sampleRows = grid
    .slice(0, 8)
    .filter((row) => normalizeWorkDate(row[0] ?? '', month) && (row[1] ?? '').trim());

  if (sampleRows.length < 2 || (sampleRows[0]?.length ?? 0) < 3) return false;

  const groupLikeRows = sampleRows.filter((row) => normalizeScheduleGroup(row[1] ?? '')).length;
  return groupLikeRows >= Math.min(2, sampleRows.length);
}

export function parseScheduleGrid(grid: string[][], month: string): ScheduleParseResult | { error: string } {
  const text = grid.map((row) => row.join('\t')).join('\n');

  if (looksLikeLongFormat(grid, month)) {
    const long = parseScheduleCsv(text, month);
    if (!('error' in long)) {
      return {
        format: 'long',
        entries: dedupeEntries(long.entries),
        errors: long.errors,
      };
    }
  }

  const matrix = parseScheduleMatrix(grid, month);
  if (!('error' in matrix)) {
    return {
      format: 'matrix',
      entries: dedupeEntries(matrix.entries),
      errors: matrix.errors,
    };
  }

  const long = parseScheduleCsv(text, month);
  if (!('error' in long)) {
    return {
      format: 'long',
      entries: dedupeEntries(long.entries),
      errors: long.errors,
    };
  }

  return { error: matrix.error || long.error };
}

export function parseSchedulePaste(text: string, month: string): ScheduleParseResult | { error: string } {
  return parseScheduleGrid(textToScheduleGrid(text), month);
}

export function parseScheduleXlsx(buffer: ArrayBuffer, month: string): ScheduleParseResult | { error: string } {
  return parseScheduleGrid(matrixFromXlsx(buffer), month);
}

export function summarizeScheduleParse(result: ScheduleParseResult) {
  const dates = result.entries.map((entry) => entry.work_date).sort();
  const groups = [...new Set(result.entries.map((entry) => entry.shift))].sort();
  return {
    format: result.format,
    entryCount: result.entries.length,
    dayCount: new Set(result.entries.map((entry) => entry.work_date)).size,
    dateFrom: dates[0] ?? null,
    dateTo: dates[dates.length - 1] ?? null,
    groups,
    errorCount: result.errors.length,
  };
}

export function buildSampleCsv(month: string): string {
  return `날짜\tA조\tB조\tC조
${month}-01\t김프런\t이데스크\t최야간
${month}-02\t박체크\t김프런\t이데스크
${month}-03\t최야간\t박체크\t김프런`;
}
