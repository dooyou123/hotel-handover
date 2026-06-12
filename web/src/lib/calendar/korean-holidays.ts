/** 매년 동일한 법정공휴일 (MM-DD) */
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

/**
 * 음력 명절·대체공휴일 (우주항공청 월력요항 기준, 연도별 ISO 날짜).
 * 고정 공휴일과 겹치는 날은 이 목록이 우선합니다.
 */
const VARIABLE_HOLIDAYS: Record<string, string> = {
  // 2024
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일',
  '2024-04-10': '부처님오신날',
  '2024-05-06': '대체공휴일',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  // 2025
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-03': '대체공휴일',
  '2025-05-06': '대체공휴일',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일',
  // 2026
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-02': '대체공휴일',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-08-17': '대체공휴일',
  '2026-10-05': '대체공휴일',
  // 2027
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-05-13': '부처님오신날',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  // 2028
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-05-02': '부처님오신날',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '추석',
  '2028-10-04': '추석 연휴',
};

export function getKoreanHoliday(date: string): string | null {
  const variable = VARIABLE_HOLIDAYS[date];
  if (variable) return variable;

  const monthDay = date.slice(5);
  return FIXED_HOLIDAYS[monthDay] ?? null;
}

/** YYYY-MM 월의 공휴일 (날짜 → 이름) */
export function getKoreanHolidaysInMonth(month: string): Map<string, string> {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  if (!year || !monthNum) return new Map();

  const lastDay = new Date(year, monthNum, 0).getDate();
  const result = new Map<string, string>();

  for (let day = 1; day <= lastDay; day += 1) {
    const iso = `${month}-${String(day).padStart(2, '0')}`;
    const name = getKoreanHoliday(iso);
    if (name) result.set(iso, name);
  }

  return result;
}
