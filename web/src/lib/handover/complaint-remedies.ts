export const COMPLAINT_REMEDY_OPTIONS = [
  { id: 'breakfast', label: '조식권' },
  { id: 'amenity', label: '어메니티' },
  { id: 'snacks', label: '과자' },
  { id: 'free_upgrade', label: '무료 업그레이드' },
  { id: 'rate_discount', label: '객실료 할인' },
  { id: 'rate_refund', label: '객실료 환불' },
  { id: 'gift_card', label: '기프트 카드 보상 (약 1만원 상당)' },
] as const;

export type ComplaintRemedyId = (typeof COMPLAINT_REMEDY_OPTIONS)[number]['id'];

const VALID_REMEDY_IDS = new Set<string>(COMPLAINT_REMEDY_OPTIONS.map((option) => option.id));

export const EMPTY_COMPLAINT_REMEDIES = {
  complaint_remedies: [] as string[],
  complaint_remedy_other: '',
};

export function formatComplaintRemedies(
  remedies: string[] | null | undefined,
  other: string | null | undefined,
): string {
  const labels: string[] = [];
  for (const id of remedies ?? []) {
    const label = COMPLAINT_REMEDY_OPTIONS.find((option) => option.id === id)?.label;
    if (label) labels.push(label);
  }
  const otherText = other?.trim();
  if (otherText) labels.push(`기타: ${otherText}`);
  return labels.join(' · ');
}

export function hasComplaintRemedies(
  remedies: string[] | null | undefined,
  other: string | null | undefined,
): boolean {
  return Boolean((remedies && remedies.length > 0) || other?.trim());
}

export function sanitizeComplaintRemediesForCategory(
  category: string,
  remedies: string[],
  other: string,
): { complaint_remedies: string[]; complaint_remedy_other: string } {
  if (category !== '컴플레인') {
    return { ...EMPTY_COMPLAINT_REMEDIES };
  }
  return {
    complaint_remedies: remedies.filter((id) => VALID_REMEDY_IDS.has(id)),
    complaint_remedy_other: other.trim(),
  };
}
