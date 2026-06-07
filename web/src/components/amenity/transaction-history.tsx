'use client';

import { formatAmenityDateTime, type AmenityTransaction } from '@/lib/amenity/types';

interface TransactionHistoryProps {
  transactions: AmenityTransaction[];
}

export function AmenityTransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <section className="schedule-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>최근 거래 내역</h3>
          <p>최근 {transactions.length}건</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="empty-state">아직 거래 내역이 없습니다</p>
      ) : (
        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>구분</th>
                <th>어메니티</th>
                <th>박스</th>
                <th>총개수</th>
                <th>작성자</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatAmenityDateTime(tx.created_at)}</td>
                  <td>
                    <span className={`amenity-card__badge ${tx.type === '입고' ? 'amenity-card__badge--ok' : 'amenity-card__badge--critical'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.amenities?.name ?? '-'}</td>
                  <td>{tx.box_count}</td>
                  <td>{tx.total_items.toLocaleString()}</td>
                  <td>{tx.author}</td>
                  <td className={tx.memo ? undefined : 'schedule-table__empty'}>{tx.memo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
