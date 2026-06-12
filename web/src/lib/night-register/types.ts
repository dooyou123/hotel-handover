export type NightRegisterLog = {
  id: string;
  hotel_id: string;
  work_date: string;
  shift: string;
  cash_memo: string;
  card_memo: string;
  seal_notes: string;
  handover_notes: string;
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type NightRegisterInput = {
  work_date: string;
  shift: string;
  cash_memo: string;
  card_memo: string;
  seal_notes: string;
  handover_notes: string;
  author: string;
  updated_by: string;
};
