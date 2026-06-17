'use client';

import { useEffect, useState } from 'react';
import type { Parcel } from '@/lib/parcels/types';

type ParcelSignLinkModalProps = {
  open: boolean;
  parcel: Parcel | null;
  staffName: string;
  onClose: () => void;
  onToast?: (message: string) => void;
};

export function ParcelSignLinkModal({ open, parcel, staffName, onClose, onToast }: ParcelSignLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [signUrl, setSignUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !parcel) {
      setSignUrl('');
      setExpiresAt('');
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
