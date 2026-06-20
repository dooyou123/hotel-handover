import { redirect } from 'next/navigation';
import { buildWorkHubHref } from '@/lib/work/work-hub';

type NoticesRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NoticesRedirectPage({ searchParams }: NoticesRedirectPageProps) {
  const params = await searchParams;
  const extra: Record<string, string | null | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    extra[key] = Array.isArray(value) ? value[0] : value;
  }

  redirect(buildWorkHubHref('notices', extra));
}
