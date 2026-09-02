import type { OtaAccount } from '@/lib/ota-accounts/types';

/** 시트 행 순서가 바뀌어도 같은 계정을 가리키도록 site+login 기준 키 */
export function otaAccountKey(account: Pick<OtaAccount, 'site' | 'loginId'>): string {
  const site = account.site.trim().toLowerCase();
  const login = account.loginId.trim().toLowerCase();
  return `${site}|${login}`;
}
