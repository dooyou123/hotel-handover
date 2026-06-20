import { redirect } from 'next/navigation';
import { buildWorkHubHref } from '@/lib/work/work-hub';

type TodosRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TodosRedirectPage({ searchParams }: TodosRedirectPageProps) {
  const params = await searchParams;
  const view = params.view;
  const viewValue = Array.isArray(view) ? view[0] : view;
  redirect(buildWorkHubHref(viewValue === 'personal' ? 'personal' : 'schedule'));
}
