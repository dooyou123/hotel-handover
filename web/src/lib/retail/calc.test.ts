import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcDifferenceQty, calcTheoreticalQty } from '@/lib/retail/calc';

describe('retail calc', () => {
  it('computes theoretical closing stock', () => {
    assert.equal(
      calcTheoreticalQty({ opening_qty: 20, restock_qty: 10, sales_qty: 15, free_qty: 2 }),
      13,
    );
  });

  it('computes difference against actual count', () => {
    assert.equal(calcDifferenceQty(12, 13), -1);
    assert.equal(calcDifferenceQty(13, 13), 0);
  });
});
