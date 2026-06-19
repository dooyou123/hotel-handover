export type ChecklistShiftMemo = {
  id: string;
  hotel_id: string;
  work_date: string;
  shift: string;
  work_group: string;
  memo: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ChecklistShiftMemoInput = {
  work_date: string;
  shift: string;
  work_group: string;
  memo: string;
  updated_by: string;
};
