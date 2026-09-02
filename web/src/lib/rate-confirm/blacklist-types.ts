export type RateConfirmGuestBlacklistEntry = {
  id: string;
  hotel_id: string;
  guest_name: string;
  name_tokens: string[];
  reason: string;
  history_note: string;
  phone: string;
  email: string;
  notes: string;
  created_by: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RateConfirmGuestBlacklistInput = {
  guest_name: string;
  reason: string;
  history_note?: string;
  phone?: string;
  email?: string;
  notes?: string;
};
