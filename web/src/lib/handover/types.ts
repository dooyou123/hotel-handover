export type ColumnId = 'urgent' | 'progress' | 'hold' | 'done';
export type Priority = 'urgent' | 'today' | 'info';
export type QuickFilter = 'all' | 'unacked' | 'mine' | 'roomclean' | string;
export type HandoverViewMode = 'board' | 'room' | 'archive' | 'brief';

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
  edited_by_shift?: string | null;
  edited_by_name?: string | null;
  deleted_at?: string | null;
  deleted_by_shift?: string | null;
  deleted_by_name?: string | null;
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
  handover_no: number;
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
  /** 사건 스레드 — 같은 사건의 카드들이 같은 값을 공유 */
  thread_id: string | null;
  /** 핀 고정 시각 — null이면 고정 안 됨. 고정 카드는 진행중 탭 최상단에 표시 */
  pinned_at: string | null;
  /** 휴지통 이동 시각 — null이면 정상. 30일 지나면 자동으로 완전 삭제 */
  deleted_at?: string | null;
  /** 휴지통으로 보낸 사람 이름 */
  deleted_by?: string | null;
  /** 다음 조치가 여러 단계일 때의 체크리스트 */
  checklist: ChecklistItem[];
  first_response_at?: string | null;
  complaint_remedies?: string[];
  complaint_remedy_other?: string;
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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoticeInput = {
  type: NoticeType;
  content: string;
  author: string;
  is_pinned: boolean;
  expires_at: string | null;
  completed_at?: string | null;
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
  complaint_remedies: string[];
  complaint_remedy_other: string;
  /** 후속 인계 작성 시 사건 스레드 연결용 (선택) */
  thread_id?: string | null;
  checklist?: ChecklistItem[];
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  /** 완료 처리한 직원 이름 (교대가 바뀌어도 누가 했는지 남긴다) */
  done_by?: string | null;
  done_at?: string | null;
};

export type WorkSession = {
  shift: string;
  /** 근무 조 (A/B/C) */
  group: string;
  name: string;
};
