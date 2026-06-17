import { ParcelSignClient } from '@/components/parcels/parcel-sign-client';
import { parseParcelSignLocale } from '@/lib/parcels/sign-i18n';

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function ParcelSignPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { lang } = await searchParams;
  return (
    <ParcelSignClient token={decodeURIComponent(token)} initialLocale={parseParcelSignLocale(lang)} />
  );
}
