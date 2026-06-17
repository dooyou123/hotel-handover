import { ParcelSignClient } from '@/components/parcels/parcel-sign-client';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ParcelSignPage({ params }: PageProps) {
  const { token } = await params;
  return <ParcelSignClient token={decodeURIComponent(token)} />;
}
