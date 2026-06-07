import { SHIFTS } from '@/lib/constants';

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

function parseCsvLine(line: string): string[] {
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

function normalizeShift(value: string): string | null {
  const text = value.trim();
  if ((SHIFTS as readonly string[]).includes(text)) return text;
  if (text.includes('주') || text.toLowerCase() === 'day') return '주간';
  if (text.includes('오') || text.toLowerCase() === 'afternoon') return '오후';
  if (text.includes('야') || text.toLowerCase() === 'night') return '야간';
  return null;
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

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function parseScheduleCsv(
  csvText: string,
  month: string,
): { entries: ParsedScheduleRow[]; errors: string[] } | { error: string } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return { error: 'CSV 내용이 비어 있습니다.' };

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

  const entries: ParsedScheduleRow[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((cell) => !cell)) continue;

    const workDate = normalizeWorkDate(cells[dateIndex] ?? '', month);
    const shift = normalizeShift(cells[shiftIndex] ?? '');
    const staffName = (cells[nameIndex] ?? '').trim();

    if (!workDate || !shift || !staffName) {
      errors.push(`${i + 1}행: 날짜·교대·이름을 확인해 주세요.`);
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

export function buildSampleCsv(month: string): string {
  return `날짜,교대,이름
${month}-01,주간,김프런
${month}-01,오후,이데스크
${month}-01,야간,최야간
${month}-02,주간,박체크
${month}-02,오후,김프런
${month}-02,야간,이데스크`;
}
