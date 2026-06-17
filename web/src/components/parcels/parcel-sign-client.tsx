'use client';

import { useEffect, useRef, useState } from 'react';
import type { ParcelSignPreview } from '@/lib/parcels/types';
import {
  PARCEL_SIGN_LOCALES,
  PARCEL_SIGN_LOCALE_LABELS,
  detectParcelSignLocale,
  formatParcelSignRoom,
  parcelSignMessages,
  parseParcelSignLocale,
  translateParcelSignApiError,
  type ParcelSignLocale,
} from '@/lib/parcels/sign-i18n';
import { SignaturePad, type SignaturePadHandle } from '@/components/parcels/signature-pad';

type ParcelSignClientProps = {
  token: string;
  initialLocale?: ParcelSignLocale | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: ParcelSignPreview; staffName: string }
  | { kind: 'error'; message: string }
  | { kind: 'done' };

export function ParcelSignClient({ token, initialLocale = null }: ParcelSignClientProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [locale, setLocale] = useState<ParcelSignLocale>(
    () => initialLocale ?? detectParcelSignLocale(),
  );
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [recipientName, setRecipientName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const t = parcelSignMessages(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function changeLocale(next: ParcelSignLocale) {
    setLocale(next);
    setSubmitError(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', next);
      window.history.replaceState(null, '', url.toString());
    }
  }

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
          const message = translateParcelSignApiError(
            data.error ?? t.linkUnavailable,
            locale,
          );
          setLoadState({ kind: 'error', message });
          return;
        }

        if (!data.preview) {
          setLoadState({ kind: 'error', message: t.loadParcelFailed });
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
          setLoadState({ kind: 'error', message: t.networkError });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // token 변경 시에만 재조회
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loadState.kind !== 'ready') return;

    const name = recipientName.trim();
    if (!name) {
      setSubmitError(t.errRecipientRequired);
      return;
    }

    const signature = padRef.current?.toDataUrl();
    if (!signature) {
      setSubmitError(t.errSignatureRequired);
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
        setSubmitError(translateParcelSignApiError(data.error ?? t.errSubmitFailed, locale));
        return;
      }

      setLoadState({ kind: 'done' });
    } catch {
      setSubmitError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  function LocaleSwitcher() {
    return (
      <div className="parcel-sign__locales" role="radiogroup" aria-label={t.langSwitch}>
        {PARCEL_SIGN_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={locale === code}
            className={`parcel-sign__locale${locale === code ? ' is-active' : ''}`}
            onClick={() => changeLocale(code)}
          >
            {PARCEL_SIGN_LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    );
  }

  if (loadState.kind === 'loading') {
    return (
      <div className="parcel-sign">
        <LocaleSwitcher />
        <p className="parcel-sign__state">{t.loading}</p>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className="parcel-sign">
        <LocaleSwitcher />
        <div className="parcel-sign__card parcel-sign__card--error">
          <h1>{t.errorTitle}</h1>
          <p>{translateParcelSignApiError(loadState.message, locale)}</p>
          <p className="parcel-sign__help">{t.errorHelp}</p>
        </div>
      </div>
    );
  }

  if (loadState.kind === 'done') {
    return (
      <div className="parcel-sign">
        <LocaleSwitcher />
        <div className="parcel-sign__card parcel-sign__card--done">
          <h1>{t.doneTitle}</h1>
          <p>{t.doneBody}</p>
        </div>
      </div>
    );
  }

  const { preview } = loadState;

  return (
    <div className="parcel-sign">
      <LocaleSwitcher />
      <form className="parcel-sign__card" onSubmit={(e) => void handleSubmit(e)}>
        <header className="parcel-sign__head">
          <p className="parcel-sign__eyebrow">{t.eyebrow}</p>
          <h1>{formatParcelSignRoom(preview.room_number, locale)}</h1>
          {preview.guest_name ? <p className="parcel-sign__guest">{preview.guest_name}</p> : null}
        </header>

        <dl className="parcel-sign__meta">
          {preview.carrier ? (
            <>
              <dt>{t.carrier}</dt>
              <dd>{preview.carrier}</dd>
            </>
          ) : null}
          {preview.storage_slot ? (
            <>
              <dt>{t.storage}</dt>
              <dd>{preview.storage_slot}</dd>
            </>
          ) : null}
          {preview.description ? (
            <>
              <dt>{t.description}</dt>
              <dd>{preview.description}</dd>
            </>
          ) : null}
          {preview.tracking_number ? (
            <>
              <dt>{t.tracking}</dt>
              <dd>{preview.tracking_number}</dd>
            </>
          ) : null}
        </dl>

        <label className="parcel-sign__field">
          <span>{t.recipientLabel}</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={t.recipientPlaceholder}
            autoComplete="name"
            disabled={submitting}
            required
          />
        </label>

        <div className="parcel-sign__field">
          <span>{t.signatureLabel}</span>
          <SignaturePad
            ref={padRef}
            disabled={submitting}
            hint={t.signatureHint}
            clearLabel={t.signatureClear}
            ariaLabel={t.signatureAria}
          />
        </div>

        {submitError ? <p className="parcel-sign__error">{submitError}</p> : null}

        <button type="submit" className="btn btn--primary parcel-sign__submit" disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </button>

        <p className="parcel-sign__legal">{t.legal}</p>
      </form>
    </div>
  );
}
