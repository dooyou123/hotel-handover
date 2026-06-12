export type PersonalTaskStatus = 'open' | 'done';

export type PersonalTask = {
  id: string;
  hotel_id: string;
  staff_name: string;
  title: string;
  description: string;
  due_date: string | null;
  status: PersonalTaskStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonalTaskInput = {
  title: string;
  description?: string;
  due_date?: string | null;
};
