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

/** 1순위=3점, 2순위=2점, 3순위=1점 */
export const PARTY_RANKS = {
  1: { label: '1순위', emoji: '🥇', score: 3 },
  2: { label: '2순위', emoji: '🥈', score: 2 },
  3: { label: '3순위', emoji: '🥉', score: 1 },
} as const;

export type PartyRank = keyof typeof PARTY_RANKS;

/** 절대 가기 싫은 곳 (1인 1곳, 감점) */
export const PARTY_VETO_RANK = -1;
export const PARTY_VETO_META = { label: '절대 가기 싫어요', emoji: '🚫', score: -2 } as const;

export type PartyVoteRank = PartyRank | typeof PARTY_VETO_RANK;

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
  rank: PartyVoteRank;
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
  vote_opens_at: string | null;
  vote_deadline_at: string | null;
  /** 설정되면 장소·일정 상세 결과 공개. null이면 비밀 투표(진행 현황만). */
  results_published_at: string | null;
  updated_at: string;
};

export type EmployeeSortMode = 'manual' | 'name' | 'department' | 'attending';

export type PartyBallotRanks = {
  1: string;
  2: string;
  3: string;
  /** 절대 가기 싫은 장소 (선택) */
  veto: string;
};
