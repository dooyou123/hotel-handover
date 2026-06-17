'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import type { Parcel } from '@/lib/parcels/types';
import { normalizeParcel } from '@/lib/parcels/types';
import { createClient } from '@/lib/supabase/client';

const POLL_MS = 3_000;

type ParcelSignLinkModalProps = {
  open: boolean;
  parcel: Parcel | null;
  staffName: string;
  onClose: () => void;
  onDelivered?: (parcel: Parcel) => void;
  onToast?: (message: string) => void;
};

export function ParcelSignLinkModal({
  open,
  parcel,
  staffName,
  onClose,
  onDelivered,
  onToast,
}: ParcelSignLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [signUrl, setSignUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deliveredParcel, setDeliveredParcel] = useState<Parcel | null>(null);

  useEffect(() => {
    if (!open || !parcel) {
      setSignUrl('');
      setExpiresAt('');
      setError(null);
      setDeliveredParcel(null);
      return;
    }

    if (parcel.status === 'delivered') {
      setDeliveredParcel(parcel);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDeliveredParcel(null);

    async function createToken() {
      try {
        const res = await fetch(`/api/parcels/${parcel!.id}/sign-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_name: staffName }),
        });
        const data = (await res.json()) as { signUrl?: string; expiresAt?: string; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? '링크 생성에 실패했습니다.');
          return;
        }
        setSignUrl(data.signUrl ?? '');
        setExpiresAt(data.expiresAt ?? '');
      } catch {
        if (!cancelled) setError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void createToken();
    return () => {
      cancelled = true;
    };
  }, [open, parcel, staffName]);

  useEffect(() => {
    if (!open || !parcel || deliveredParcel) return;

    const parcelId = parcel.id;
    const supabase = createClient();
    let notified = false;

    function handleDelivered(row: Record<string, unknown>) {
      if (notified) return;
      const next = normalizeParcel(row);
      if (next.status !== 'delivered') return;
      notified = true;
      setDeliveredParcel(next);
      onDelivered?.(next);
    }

    async function pollParcel() {
      const { data } = await supabase
        .from('parcels')
        .select('*')
        .eq('id', parcelId)
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .maybeSingle();
      if (data) handleDelivered(data as Record<string, unknown>);
    }

    const channel = supabase
      .channel(`parcel-sign-wait-${parcelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parcels',
          filter: `id=eq.${parcelId}`,
        },
        (payload) => {
          handleDelivered(payload.new as Record<string, unknown>);
        },
      )
      .subscribe();

    void pollParcel();
    const timer = window.setInterval(() => void pollParcel(), POLL_MS);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [open, parcel, deliveredParcel, onDelivered]);

  useEffect(() => {
    if (!deliveredParcel) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [deliveredParcel, onClose]);

  if (!open || !parcel) return null;

  const qrSrc = signUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(signUrl)}`
    : '';

  async function copyLink() {
    if (!signUrl) return;
    try {
      await navigator.clipboard.writeText(signUrl);
      onToast?.('인도 링크를 복사했습니다.');
    } catch {
      onToast?.('복사에 실패했습니다.');
    }
  }

  function openOnPhone() {
    if (!signUrl) return;
    window.open(signUrl, '_blank', 'noopener,noreferrer');
  }

  if (deliveredParcel) {
    return (
      <div className="modal-overlay modal-overlay--parcel" onClick={onClose}>
        <div
          className="modal modal--parcel-sign-link"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal__header">
            <div>
              <h2>인도 완료</h2>
              <p className="parcel-sign-link__subtitle">
                {deliveredParcel.room_number ? `${deliveredParcel.room_number}호` : '객실 미지정'}
                {deliveredParcel.guest_name ? ` · ${deliveredParcel.guest_name}` : ''}
              </p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
          <div className="parcel-sign-link__body parcel-sign-link__body--done">
            <p className="parcel-sign-link__done-title">서명이 접수되었습니다.</p>
            {deliveredParcel.recipient_name ? (
              <p className="parcel-sign-link__done-meta">수령자: {deliveredParcel.recipient_name}</p>
            ) : null}
            {deliveredParcel.delivered_at ? (
              <p className="parcel-sign-link__done-meta">
                {new Date(deliveredParcel.delivered_at).toLocaleString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
            <p className="parcel-sign-link__state">잠시 후 자동으로 닫힙니다.</p>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay modal-overlay--parcel" onClick={onClose}>
      <div
        className="modal modal--parcel-sign-link"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <div>
            <h2>인도 서명 받기</h2>
            <p className="parcel-sign-link__subtitle">
              {parcel.room_number ? `${parcel.room_number}호` : '객실 미지정'}
              {parcel.guest_name ? ` · ${parcel.guest_name}` : ''}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="parcel-sign-link__body">
          {loading ? <p className="parcel-sign-link__state">링크 생성 중…</p> : null}
          {error ? <p className="parcel-sign-link__error">{error}</p> : null}

          {!loading && !error && signUrl ? (
            <>
              <p className="parcel-sign-link__lead">
                법인 스마트폰으로 QR을 스캔하거나 링크를 열어 게스트에게 서명을 받으세요.
              </p>

              <div className="parcel-sign-link__qr-wrap">
                <img src={qrSrc} alt="인도 서명 QR 코드" className="parcel-sign-link__qr" width={220} height={220} />
              </div>

              <div className="parcel-sign-link__url">
                <code>{signUrl}</code>
              </div>

              <div className="parcel-sign-link__actions">
                <button type="button" className="btn btn--primary" onClick={openOnPhone}>
                  법인폰에서 열기
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => void copyLink()}>
                  링크 복사
                </button>
              </div>

              {expiresAt ? (
                <p className="parcel-sign-link__expiry">
                  {new Date(expiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}까지
                  유효 · 1회 사용
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
