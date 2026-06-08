/** 비치·창고 박스 잔량 (1박스 = unit_size개) */
export function countRemainingBoxes(quantity: number, unitSize: number): number {
  if (unitSize <= 0) return 0;
  return Math.floor(quantity / unitSize);
}

/** 발주 박스 권장 (1발주박스 = box_size개, 최근 30일 출고 기준) */
export function calcSuggestedOrderBoxes(
  quantity: number,
  monthlyUsage: number,
  orderBoxSize: number,
): number {
  if (orderBoxSize <= 0 || monthlyUsage <= 0) return 0;
  if (quantity >= monthlyUsage) return 0;
  const shortfall = monthlyUsage - quantity;
  return Math.ceil(shortfall / orderBoxSize);
}

export function orderBoxItemCount(orderBoxes: number, orderBoxSize: number): number {
  return orderBoxes * orderBoxSize;
}
