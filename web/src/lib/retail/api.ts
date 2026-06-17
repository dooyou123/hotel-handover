import { createClient } from '@/lib/supabase/client';
import { enrichSettlementLine } from '@/lib/retail/calc';
import type {
  RetailPeriod,
  RetailPeriodBundle,
  RetailPeriodLine,
  RetailPeriodLineInput,
  RetailProduct,
} from '@/lib/retail/types';

export async function fetchRetailProducts(hotelId: string): Promise<RetailProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('retail_products')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('active', true)
    .order('sort_order')
    .order('id');

  if (error) throw error;
  return (data ?? []) as RetailProduct[];
}

export async function fetchRetailPeriods(hotelId: string): Promise<RetailPeriod[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('retail_periods')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('year_month', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RetailPeriod[];
}

export async function getOrCreateRetailPeriod(hotelId: string, yearMonth: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_or_create_retail_period', {
    p_hotel_id: hotelId,
    p_year_month: yearMonth,
  });

  if (error) throw error;
  return data as string;
}

async function fetchPeriodLines(periodId: string): Promise<RetailPeriodLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('retail_period_lines')
    .select('*')
    .eq('period_id', periodId)
    .order('product_id');

  if (error) throw error;
  return (data ?? []) as RetailPeriodLine[];
}

async function fetchPeriodById(periodId: string): Promise<RetailPeriod> {
  const supabase = createClient();
  const { data, error } = await supabase.from('retail_periods').select('*').eq('id', periodId).single();

  if (error) throw error;
  return data as RetailPeriod;
}

export async function fetchRetailPeriodBundle(hotelId: string, yearMonth: string): Promise<RetailPeriodBundle> {
  const periodId = await getOrCreateRetailPeriod(hotelId, yearMonth);
  const [period, lines, products] = await Promise.all([
    fetchPeriodById(periodId),
    fetchPeriodLines(periodId),
    fetchRetailProducts(hotelId),
  ]);

  const productMap = new Map(products.map((product) => [product.id, product.name]));
  const lineByProduct = new Map(lines.map((line) => [line.product_id, line]));

  const settlementLines = products.map((product) => {
    const line =
      lineByProduct.get(product.id) ??
      ({
        id: '',
        period_id: period.id,
        hotel_id: hotelId,
        product_id: product.id,
        opening_qty: 0,
        restock_qty: 0,
        sales_qty: 0,
        free_qty: 0,
        actual_qty: 0,
        line_notes: '',
      } satisfies RetailPeriodLine);

    return enrichSettlementLine(line, product.name);
  });

  return { period, lines: settlementLines, products };
}

export async function saveRetailPeriodLines(
  periodId: string,
  hotelId: string,
  inputs: RetailPeriodLineInput[],
): Promise<void> {
  const supabase = createClient();
  const existing = await fetchPeriodLines(periodId);
  const existingByProduct = new Map(existing.map((line) => [line.product_id, line]));

  const rows = inputs.map((input) => {
    const prev = existingByProduct.get(input.product_id);
    return {
      id: prev?.id,
      period_id: periodId,
      hotel_id: hotelId,
      product_id: input.product_id,
      opening_qty: prev?.opening_qty ?? 0,
      restock_qty: Math.max(0, input.restock_qty),
      sales_qty: Math.max(0, input.sales_qty),
      free_qty: Math.max(0, input.free_qty),
      actual_qty: Math.max(0, input.actual_qty),
      line_notes: input.line_notes?.trim() ?? '',
    };
  });

  const { error } = await supabase.from('retail_period_lines').upsert(rows, { onConflict: 'period_id,product_id' });
  if (error) throw error;
}

export async function closeRetailPeriod(periodId: string, closedBy: string): Promise<RetailPeriod> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('close_retail_period', {
    p_period_id: periodId,
    p_closed_by: closedBy,
  });

  if (error) throw error;
  return data as RetailPeriod;
}

export function subscribeRetailChanges(hotelId: string, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`retail:${hotelId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'retail_periods', filter: `hotel_id=eq.${hotelId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'retail_period_lines', filter: `hotel_id=eq.${hotelId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
