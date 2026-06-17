'use client';

import { useEffect, useRef, useState } from 'react';
import type { ParcelSignPreview } from '@/lib/parcels/types';
import { SignaturePad, type SignaturePadHandle } from '@/components/parcels/signature-pad';

type ParcelSignClientProps = {
  token: string;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: ParcelSignPreview; staffName: string }
  | { kind: 'error'; message: string }
  | { kind: 'done' };

export function ParcelSignClient({ token }: ParcelSignClientProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [recipientName, setRecipientName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/parcels/sign?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          preview?: ParcelSignPreview;
          staffName?: string;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setLoadState({ kind: 'error', message: data.error ?? '링크를 사용할 수 없습니다.' });
          return;
        }

        if (!data.preview) {
          setLoadState({ kind: 'error', message: '택배 정보를 불러오지 못했습니다.' });
          return;
        }

        setRecipientName(data.preview.guest_name.trim());
        setLoadState({
          kind: 'ready',
          preview: data.preview,
          staffName: data.staffName ?? '',
        });
      } catch {
        if (!cancelled) {
          setLoadState({ kind: 'error', message: '네트워크 오류가 발생했습니다.' });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loadState.kind !== 'ready') return;

    const name = recipientName.trim();
    if (!name) {
      setSubmitError('수령자 성명을 입력해 주세요.');
      return;
    }

    const signature = padRef.current?.toDataUrl();
    if (!signature) {
      setSubmitError('서명을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/parcels/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          recipient_name: name,
          signature_data_url: signature,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? '인도 처리에 실패했습니다.');
        return;
      }

      setLoadState({ kind: 'done' });
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState.kind === 'loading') {
    return (
      <div className="parcel-sign">
        <p className="parcel-sign__state">불러오는 중…</p>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className="parcel-sign">
        <div className="parcel-sign__card parcel-sign__card--error">
          <h1>링크를 사용할 수 없습니다</h1>
          <p>{loadState.message}</p>
          <p className="parcel-sign__help">프론트 데스크에 새 인도 링크를 요청해 주세요.</p>
        </div>
      </div>
    );
  }

  if (loadState.kind === 'done') {
    return (
      <div className="parcel-sign">
        <div className="parcel-sign__card parcel-sign__card--done">
          <h1>인도가 완료되었습니다</h1>
          <p>감사합니다. 이 화면을 닫아 주세요.</p>
        </div>
      </div>
    );
  }

  const { preview } = loadState;

  return (
    <div className="parcel-sign">
      <form className="parcel-sign__card" onSubmit={(e) => void handleSubmit(e)}>
        <header className="parcel-sign__head">
          <p className="parcel-sign__eyebrow">택배 · 우편 인도 확인</p>
          <h1>{preview.room_number ? `${preview.room_number}호` : '객실 미지정'}</h1>
          {preview.guest_name ? <p className="parcel-sign__guest">{preview.guest_name}</p> : null}
        </header>

        <dl className="parcel-sign__meta">
          {preview.carrier ? (
            <>
              <dt>택배사</dt>
              <dd>{preview.carrier}</dd>
            </>
          ) : null}
          {preview.storage_slot ? (
            <>
              <dt>보관 위치</dt>
              <dd>{preview.storage_slot}</dd>
            </>
          ) : null}
          {preview.description ? (
            <>
              <dt>내용</dt>
              <dd>{preview.description}</dd>
            </>
          ) : null}
          {preview.tracking_number ? (
            <>
              <dt>운송장</dt>
              <dd>{preview.tracking_number}</dd>
            </>
          ) : null}
        </dl>

        <label className="parcel-sign__field">
          <span>수령자 성명</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="성명"
            autoComplete="name"
            disabled={submitting}
            required
          />
        </label>

        <div className="parcel-sign__field">
          <span>서명</span>
          <SignaturePad ref={padRef} disabled={submitting} />
        </div>

        {submitError ? <p className="parcel-sign__error">{submitError}</p> : null}

        <button type="submit" className="btn btn--primary parcel-sign__submit" disabled={submitting}>
          {submitting ? '처리 중…' : '인도 확인'}
        </button>

        <p className="parcel-sign__legal">서명은 택배 수령 확인용으로만 사용됩니다.</p>
      </form>
    </div>
  );
}
