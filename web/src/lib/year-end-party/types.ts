export const PARTY_VENUE_CATEGORIES = [
  '일식',
  '한식',
  '고깃집',
  '뷔페',
  '양식',
  '중식',
  '기타',
] as const;

export type PartyVenueCategory = (typeof PARTY_VENUE_CATEGORIES)[number];

export const PARTY_PREFERENCES = {
  love: { label: '적극 추천해요', emoji: '❤️', score: 2 },
  ok: { label: '무난해요', emoji: '👍', score: 1 },
} as const;

export type PartyPreference = keyof typeof PARTY_PREFERENCES;

export const PARTY_AVAILABILITY = {
  yes: { label: '가능', emoji: '⭕', score: 2 },
  maybe: { label: '세모', emoji: '🔺', score: 1 },
  no: { label: '불가', emoji: '❌', score: 0 },
} as const;

export type PartyAvailability = keyof typeof PARTY_AVAILABILITY;

export const PARTY_SUBSIDY_OPTIONS = [100000, 50000] as const;

export type PartyEmployee = {
  id: string;
  hotel_id: string;
  name: string;
  department: string;
  title: string;
  attending: boolean;
  memo: string;
  sort_order: number;
  created_at: string;
};

export type PartyEmployeeInput = {
  name: string;
  department?: string;
  title?: string;
  attending?: boolean;
  memo?: string;
};

export type PartyVenue = {
  id: string;
  hotel_id: string;
  name: string;
  category: string;
  signature_menu: string;
  price_per_person: number;
  map_url: string;
  address: string;
  has_room: boolean;
  has_parking: boolean;
  rating: number;
  features: string;
  sort_order: number;
  created_at: string;
};

export type PartyVenueInput = {
  name: string;
  category: string;
  signature_menu: string;
  price_per_person: number;
  map_url: string;
  address: string;
  has_room: boolean;
  has_parking: boolean;
  rating: number;
  features: string;
};

export type PartyVenueVote = {
  id: string;
  hotel_id: string;
  venue_id: string;
  voter_name: string;
  preference: PartyPreference;
  comment: string;
  created_at: string;
};

export type PartyDateSlot = {
  id: string;
  hotel_id: string;
  slot_date: string;
  slot_time: string;
  label: string;
  created_at: string;
};

export type PartyDateVote = {
  id: string;
  hotel_id: string;
  slot_id: string;
  voter_name: string;
  availability: PartyAvailability;
  created_at: string;
};

export type PartyDietary = {
  id: string;
  hotel_id: string;
  employee_name: string;
  restricted_foods: string;
  allergies: string;
  drinks_alcohol: boolean;
  notes: string;
  updated_at: string;
};

export type PartySettings = {
  hotel_id: string;
  subsidy_per_person: number;
  headcount_override: number | null;
  confirmed_venue_id: string | null;
  confirmed_slot_id: string | null;
  invitation_draft: string;
  vote_deadline_at: string | null;
  updated_at: string;
};

export type EmployeeSortMode = 'manual' | 'name' | 'department' | 'attending';
