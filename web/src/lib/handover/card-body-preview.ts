export const CARD_BODY_PREVIEW_MAX_LINES = 4;

/** 목록 본문 접기 기준: 줄 수 또는 한 줄 장문 */
export function isLongPreviewText(
  text: string,
  maxLines = CARD_BODY_PREVIEW_MAX_LINES,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.split('\n').length > maxLines) return true;
  return trimmed.length > 240;
}
