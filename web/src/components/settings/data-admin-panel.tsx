'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateAllHotelQueries,
  resetHotelData,
  seedHotelSampleData,
} from '@/lib/settings/hotel-data-admin';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type DataAdminPanelProps = {
  onToast: (message: string) => void;
};

export function DataAdminPanel({ onToast }: DataAdminPanelProps) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState<'reset' | 'seed' | null>(null);

  async function handleReset() {
    const ok = await confirm({
      title: '모든 데이터 초기화',
      message: '인수인계, 공지, 연락처, 체크리스트, 어메니티, 리뷰 등 호텔 운영 데이터를 모두 삭제합니다.',
      detail: '직원 계정(로그인)과 호텔 설정은 유지됩니다. 되돌릴 수 없습니다.',
      tone: 'danger',
      confirmLabel: '전체 삭제',
    });
    if (!ok) return;

    setLoading('reset');
    try {
      await resetHotelData();
      invalidateAllHotelQueries(queryClient);
      onToast('데이터가 초기화되었습니다.');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : '초기화에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  }

  async function handleSeed() {
    const ok = await confirm({
      title: '샘플 데이터 추가',
      message: '데모용 직원, 인수인계, 공지, 연락처, 체크리스트, 어메니티, 리뷰 샘플을 추가합니다.',
      detail: '기존 데이터와 중복될 수 있습니다. 완전히 비운 뒤 추가하는 것을 권장합니다.',
      tone: 'default',
      confirmLabel: '샘플 추가',
    });
    if (!ok) return;

    setLoading('seed');
    try {
      await seedHotelSampleData();
      invalidateAllHotelQueries(queryClient);
      onToast('샘플 데이터가 추가되었습니다.');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : '샘플 추가에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <article className="schedule-panel data-admin-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>데이터 관리</h3>
          <p>교육·데모용 초기화와 샘플 데이터를 관리합니다. 관리자만 사용할 수 있습니다.</p>
        </div>
      </div>

      <div className="data-admin-panel__actions">
        <div className="data-admin-panel__card">
          <h4>샘플 데이터 추가</h4>
          <p>직원, 인수인계 카드, 게시판 글, 연락처, 체크리스트, 어메니티, 리뷰 등을 한 번에 넣습니다.</p>
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={loading !== null}
            onClick={handleSeed}
          >
            {loading === 'seed' ? '추가 중…' : '+ 샘플 데이터 추가'}
          </button>
        </div>

        <div className="data-admin-panel__card data-admin-panel__card--danger">
          <h4>모든 데이터 초기화</h4>
          <p>호텔 운영 데이터를 전부 삭제합니다. 로그인 계정은 유지됩니다.</p>
          <button
            type="button"
            className="btn btn--danger btn--small"
            disabled={loading !== null}
            onClick={handleReset}
          >
            {loading === 'reset' ? '삭제 중…' : '전체 데이터 초기화'}
          </button>
        </div>
      </div>

      <p className="data-admin-panel__note">
        Supabase에 <code>010_hotel_data_admin.sql</code> 마이그레이션이 적용되어 있어야 합니다.
      </p>
    </article>
  );
}
