export type RetailProduct = {
  id: number;
  hotel_id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type RetailPeriodStatus = 'draft' | 'closed';

export type RetailPeriod = {
  id: string;
  hotel_id: string;
  year_month: string;
  status: RetailPeriodStatus;
  closed_at: string | null;
  closed_by: string;
  author: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type RetailPeriodLine = {
  id: string;
  period_id: string;
  hotel_id: string;
  product_id: number;
  opening_qty: number;
  restock_qty: number;
  sales_qty: number;
  free_qty: number;
  actual_qty: number;
  line_notes: string;
};

export type RetailPeriodLineInput = {
  product_id: number;
  restock_qty: number;
  sales_qty: number;
  free_qty: number;
  actual_qty: number;
  line_notes?: string;
};

export type RetailSettlementRow = RetailPeriodLine & {
  product_name: string;
  theoretical_qty: number;
  difference_qty: number;
};

export type RetailPeriodBundle = {
  period: RetailPeriod;
  lines: RetailSettlementRow[];
  products: RetailProduct[];
};
