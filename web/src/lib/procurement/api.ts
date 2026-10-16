import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type {
  ProcurementCategory,
  ProcurementCategoryInput,
  ProcurementItem,
  ProcurementItemInput,
  ProcurementOrder,
  ProcurementOrderInput,
  ProcurementOrderLine,
} from '@/lib/procurement/types';
import { slugifyCategoryKey } from '@/lib/procurement/types';
import { isLineFullyReceived, lineReceivedQty, todayYmd } from '@/lib/procurement/utils';

const CATEGORY_SELECT = 'id, hotel_id, key, label, sort_order, active, created_by, created_at, updated_at';
const ITEM_SELECT = 'id, hotel_id, category, name, unit, note, sort_order, active, created_by, created_at, updated_at';
const ORDER_SELECT =
  'id, hotel_id, title, vendor, note, status, ordered_at, ordered_by, expected_receive_at, cancelled_at, cancelled_by, created_at, updated_at';
const LINE_SELECT =
  'id, hotel_id, order_id, item_id, category, category_label, item_name, unit, quantity, received_qty, note, received_at, received_by, created_at, updated_at';

export async function fetchProcurementCategories(activeOnly = true): Promise<ProcurementCategory[]> {
  const supabase = createClient();
  let query = supabase
    .from('procurement_categories')
    .select(CATEGORY_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order')
    .order('label');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProcurementCategory[];
}

export async function createProcurementCategory(
  input: ProcurementCategoryInput,
  createdBy: string,
): Promise<ProcurementCategory> {
  const label = input.label.trim();
  if (!label) throw new Error('분류 이름을 입력해 주세요.');
  const key = (input.key?.trim() || slugifyCategoryKey(label)).slice(0, 48);
  if (!key) throw new Error('분류 키가 올바르지 않습니다.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('procurement_categories')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      key,
      label,
      sort_order: input.sortOrder ?? 100,
      created_by: createdBy.trim(),
    })
    .select(CATEGORY_SELECT)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('같은 키의 분류가 이미 있습니다.');
    throw error;
  }
  return data as ProcurementCategory;
}

export async function updateProcurementCategory(input: {
  id: string;
  label: string;
  sortOrder?: number;
}): Promise<ProcurementCategory> {
  const label = input.label.trim();
  if (!label) throw new Error('분류 이름을 입력해 주세요.');

  const supabase = createClient();
  const patch: Record<string, unknown> = { label };
  if (typeof input.sortOrder === 'number') patch.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from('procurement_categories')
    .update(patch)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', input.id)
    .select(CATEGORY_SELECT)
    .single();
  if (error) throw error;
  return data as ProcurementCategory;
}

export async function deactivateProcurementCategory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('procurement_categories')
    .update({ active: false })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', id);
  if (error) throw error;
}

export async function fetchProcurementItems(activeOnly = true): Promise<ProcurementItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('procurement_items')
    .select(ITEM_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('category')
    .order('sort_order')
    .order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProcurementItem[];
}

export async function createProcurementItem(
  input: ProcurementItemInput,
  createdBy: string,
): Promise<ProcurementItem> {
  const name = input.name.trim();
  if (!name) throw new Error('품목명을 입력해 주세요.');
  if (!input.category.trim()) throw new Error('분류를 선택해 주세요.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('procurement_items')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      category: input.category.trim(),
      name,
      unit: (input.unit ?? '개').trim() || '개',
      note: (input.note ?? '').trim(),
      created_by: createdBy.trim(),
    })
    .select(ITEM_SELECT)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('같은 분류에 이미 있는 품목입니다.');
    throw error;
  }
  return data as ProcurementItem;
}

export async function deactivateProcurementItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('procurement_items')
    .update({ active: false })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', itemId);
  if (error) throw error;
}

export async function fetchProcurementOrders(): Promise<ProcurementOrder[]> {
  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from('procurement_orders')
    .select(ORDER_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('ordered_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const orderRows = (orders ?? []) as Omit<ProcurementOrder, 'lines'>[];
  if (!orderRows.length) return [];

  const ids = orderRows.map((o) => o.id);
  const { data: lines, error: lineError } = await supabase
    .from('procurement_order_lines')
    .select(LINE_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .in('order_id', ids)
    .order('created_at');
  if (lineError) throw lineError;

  const byOrder = new Map<string, ProcurementOrderLine[]>();
  for (const line of (lines ?? []) as ProcurementOrderLine[]) {
    const list = byOrder.get(line.order_id) ?? [];
    list.push(line);
    byOrder.set(line.order_id, list);
  }

  return orderRows.map((order) => ({
    ...order,
    expected_receive_at: order.expected_receive_at ?? null,
    lines: byOrder.get(order.id) ?? [],
  }));
}

export async function createProcurementOrder(input: ProcurementOrderInput): Promise<ProcurementOrder> {
  if (!input.lines.length) throw new Error('발주 품목을 한 개 이상 넣어 주세요.');
  for (const line of input.lines) {
    if (!line.itemName.trim()) throw new Error('품목명이 비어 있습니다.');
    if (!Number.isFinite(line.quantity) || line.quantity < 1) {
      throw new Error('수량은 1 이상이어야 합니다.');
    }
  }

  const supabase = createClient();
  const { data: order, error } = await supabase
    .from('procurement_orders')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      title: (input.title ?? '').trim(),
      vendor: (input.vendor ?? '').trim(),
      note: (input.note ?? '').trim(),
      ordered_at: input.orderedAt || todayYmd(),
      ordered_by: input.orderedBy.trim(),
      expected_receive_at: input.expectedReceiveAt?.trim() || null,
      status: 'ordered',
    })
    .select(ORDER_SELECT)
    .single();
  if (error) throw error;

  const lineRows = input.lines.map((line) => ({
    hotel_id: DEFAULT_HOTEL_ID,
    order_id: order.id,
    item_id: line.itemId ?? null,
    category: line.category,
    category_label: line.categoryLabel || line.category,
    item_name: line.itemName.trim(),
    unit: (line.unit ?? '개').trim() || '개',
    quantity: Math.floor(line.quantity),
    note: (line.note ?? '').trim(),
  }));

  const { data: lines, error: lineError } = await supabase
    .from('procurement_order_lines')
    .insert(lineRows)
    .select(LINE_SELECT);
  if (lineError) {
    await supabase.from('procurement_orders').delete().eq('id', order.id);
    throw lineError;
  }

  return {
    ...(order as Omit<ProcurementOrder, 'lines'>),
    lines: (lines ?? []) as ProcurementOrderLine[],
  };
}

export async function cancelProcurementOrder(orderId: string, cancelledBy: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('procurement_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy.trim(),
    })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', orderId);
  if (error) throw error;
}

/** 완료·취소된 발주 묶음 삭제 (라인은 cascade) */
export async function deleteProcurementOrder(orderId: string): Promise<void> {
  const supabase = createClient();
  const { data: order, error: fetchError } = await supabase
    .from('procurement_orders')
    .select('id, status')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', orderId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!order) throw new Error('발주 기록을 찾을 수 없습니다.');
  if (order.status !== 'received' && order.status !== 'cancelled') {
    throw new Error('완료·취소된 발주만 삭제할 수 있습니다. 진행 중이면 먼저 취소해 주세요.');
  }

  const { error } = await supabase
    .from('procurement_orders')
    .delete()
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', orderId);
  if (error) throw error;
}

export async function restoreProcurementOrder(orderId: string): Promise<void> {
  const supabase = createClient();
  const { data: order, error: fetchError } = await supabase
    .from('procurement_orders')
    .select('id, status')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', orderId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!order) throw new Error('발주 기록을 찾을 수 없습니다.');
  if (order.status !== 'cancelled') throw new Error('취소된 발주만 복구할 수 있습니다.');

  const { error: clearError } = await supabase
    .from('procurement_orders')
    .update({
      status: 'ordered',
      cancelled_at: null,
      cancelled_by: '',
    })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', orderId);
  if (clearError) throw clearError;

  // 상태 트리거를 다시 돌리기 위해 라인 한 건을 가볍게 touch
  const { data: line } = await supabase
    .from('procurement_order_lines')
    .select('id, note')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();
  if (line) {
    await supabase
      .from('procurement_order_lines')
      .update({ note: line.note ?? '' })
      .eq('id', line.id);
  }
}

/** 이번 입고 수량을 누적. addQty 미지정 시 남은 수량 전부 */
export async function receiveProcurementLine(input: {
  lineId: string;
  receivedBy: string;
  receivedAt?: string;
  addQty?: number;
}): Promise<ProcurementOrderLine> {
  const supabase = createClient();
  const { data: current, error: fetchError } = await supabase
    .from('procurement_order_lines')
    .select(LINE_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', input.lineId)
    .single();
  if (fetchError) throw fetchError;

  const line = current as ProcurementOrderLine;
  const already = lineReceivedQty(line);
  const remaining = Math.max(0, line.quantity - already);
  if (remaining <= 0) throw new Error('이미 전량 입고된 품목입니다.');

  const add = input.addQty == null ? remaining : Math.floor(input.addQty);
  if (!Number.isFinite(add) || add < 1) throw new Error('입고 수량은 1 이상이어야 합니다.');
  const nextQty = Math.min(line.quantity, already + add);

  const { data, error } = await supabase
    .from('procurement_order_lines')
    .update({
      received_at: input.receivedAt || todayYmd(),
      received_by: input.receivedBy.trim(),
      received_qty: nextQty,
    })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', input.lineId)
    .select(LINE_SELECT)
    .single();
  if (error) throw error;
  return data as ProcurementOrderLine;
}

export async function unreceiveProcurementLine(lineId: string): Promise<ProcurementOrderLine> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('procurement_order_lines')
    .update({
      received_at: null,
      received_by: '',
      received_qty: null,
    })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', lineId)
    .select(LINE_SELECT)
    .single();
  if (error) throw error;
  return data as ProcurementOrderLine;
}

export async function receiveAllOrderLines(input: {
  orderId: string;
  receivedBy: string;
  receivedAt?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: lines, error: fetchError } = await supabase
    .from('procurement_order_lines')
    .select(LINE_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('order_id', input.orderId);
  if (fetchError) throw fetchError;

  const receivedAt = input.receivedAt || todayYmd();
  const receivedBy = input.receivedBy.trim();
  for (const raw of lines ?? []) {
    const line = raw as ProcurementOrderLine;
    if (isLineFullyReceived(line)) continue;
    const { error } = await supabase
      .from('procurement_order_lines')
      .update({
        received_at: receivedAt,
        received_by: receivedBy,
        received_qty: line.quantity,
      })
      .eq('id', line.id);
    if (error) throw error;
  }
}

