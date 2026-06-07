export const CONTACT_DEPARTMENTS = [
  '전체',
  '엔지니어링',
  '하우스키핑',
  'F&B',
  '매니저',
  '보안',
  '응급',
  '업체',
  '기타',
] as const;

export const CONTACT_FORM_DEPARTMENTS = CONTACT_DEPARTMENTS.filter((d) => d !== '전체');

export type Contact = {
  id: string;
  hotel_id: string;
  name: string;
  department: string;
  phone: string;
  phone_alt: string;
  note: string;
  sort_order: number;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ContactInput = {
  name: string;
  department: string;
  phone: string;
  phone_alt: string;
  note: string;
};
