export type ColumnId = 'urgent' | 'progress' | 'hold' | 'done';
export type Priority = 'urgent' | 'today' | 'info';
export type QuickFilter = 'all' | 'unacked' | 'mine' | 'roomclean' | string;
export type HandoverViewMode = 'today' | 'board' | 'room' | 'archive' | 'brief';

export type CardAcknowledgment = {
  id: string;
  card_id: string;
  shift: string;
  staff_name: string;
  acknowledged_at: string;
};

export type CardComment = {
  id: string;
  card_id: string;
  shift: string;
  staff_name: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

export type CardAttachment = {
  id: string;
  card_id: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  created_at: string;
  url?: string;
};

export type Card = {
  id: string;
  hotel_id: string;
  column_id: ColumnId;
  priority: Priority;
  category: string;
  room: string;
  title: string;
  details: string;
  resolution: string;
  next_action: string;
  author: string;
  assignee_shift: string;
  assignee_name: string;
  due_at: string | null;
  sort_order: number;
  archived_at: string | null;
  linked_todo_id: string | null;
  first_response_at?: string | null;
  created_by?: string | null;
  snoozed_until?: string | null;
  created_at: string;
  updated_at: string;
  card_acknowledgments: CardAcknowledgment[];
  card_comments: CardComment[];
  card_attachments: CardAttachment[];
};

export type NoticeType = 'announcement' | 'change';

export type Notice = {
  id: string;
  hotel_id: string;
  type: NoticeType;
  content: string;
  author: string;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoticeInput = {
  type: NoticeType;
  content: string;
  author: string;
  is_pinned: boolean;
  expires_at: string | null;
};

export type ActivityLog = {
  id: string;
  hotel_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  shift: string;
  staff_name: string;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ShiftHandoverType = 'start' | 'end';

export type ShiftHandover = {
  id: string;
  hotel_id: string;
  shift: string;
  staff_name: string;
  handover_type: ShiftHandoverType;
  work_date: string;
  unacked_urgent: number;
  urgent_count: number;
  progress_count: number;
  today_count: number;
  checklist_incomplete: number;
  progress_remaining: number;
  notes: string;
  handover_at: string;
};

export type AuditContext = {
  shift: string;
  staffName: string;
  reason?: string;
};

export type CardInput = {
  column_id: ColumnId;
  priority: Priority;
  category: string;
  room: string;
  title: string;
  details: string;
  resolution: string;
  next_action: string;
  author: string;
  assignee_shift: string;
  assignee_name: string;
  due_at: string | null;
};

export type WorkSession = {
  shift: string;
  /** 근무 조 (A/B/C) */
  group: string;
  name: string;
};
