export const EVENT_CATEGORIES = ['VIP', '회의', '교육', '점검', '기타'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type HotelEvent = {
  id: string;
  hotel_id: string;
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string;
  author: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HotelEventInput = {
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string;
  author: string;
};

export type HotelEventPatch = Partial<HotelEventInput> & {
  completed_at?: string | null;
};
