export type ColumnId = 'urgent' | 'progress' | 'done';
export type Priority = 'urgent' | 'today' | 'info';
export type QuickFilter = 'all' | 'unacked' | 'mine' | 'roomclean' | string;
export type HandoverViewMode = 'board' | 'room';

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
  name: string;
};
