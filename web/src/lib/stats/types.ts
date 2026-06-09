export type StatsPeriod = 'week' | 'month';

export type ShiftCount = {
  shift: string;
  count: number;
};

export type DayCount = {
  date: string;
  label: string;
  count: number;
};

export type AmenityItemUsage = {
  amenityId: number;
  name: string;
  totalItems: number;
  transactionCount: number;
};

export type AmenityDayUsage = {
  date: string;
  label: string;
  totalItems: number;
};

export type StatsSummary = {
  totalHandovers: number;
  urgentCount: number;
  urgentResolvedCount: number;
  urgentAvgMinutes: number | null;
  amenityOutboundTotal: number;
  amenityTransactionCount: number;
  checklistCompletions: number;
  checklistCompletionRate: number | null;
  todoDueCount: number;
  todoCompletedCount: number;
  todoCompletionRate: number | null;
  reviewCount: number;
  reviewFollowUpCount: number;
  reviewFollowUpRate: number | null;
};

export type StatsData = {
  period: StatsPeriod;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  summary: StatsSummary;
  handoversByShift: ShiftCount[];
  handoversByDay: DayCount[];
  urgentAcksByShift: ShiftCount[];
  amenityOutboundByShift: ShiftCount[];
  hkEbByDay: DayCount[];
  amenityByItem: AmenityItemUsage[];
  amenityByDay: AmenityDayUsage[];
};
