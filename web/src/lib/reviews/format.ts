export function formatStayRange(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn && !checkOut) return '숙박일 미입력';
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  if (checkIn && checkOut) return `${format(checkIn)} → ${format(checkOut)}`;
  if (checkIn) return `체크인 ${format(checkIn)}`;
  return `체크아웃 ${format(checkOut!)}`;
}

export function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
