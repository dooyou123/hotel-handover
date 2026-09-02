import type { ReconcileRecord } from '@/lib/rate-confirm/compare-engine';
import type { RateConfirmGuestBlacklistEntry } from '@/lib/rate-confirm/blacklist-types';

/** 고객명을 비교용 토큰으로 쪼갠다. 순서·대소문자·구두점 차이를 흡수한다. */
export function tokenizeGuestName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[,./()[\]{}'"`·]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * 블랙리스트 등록명이 파일상 고객명과 일치하는지 본다.
 * 등록 토큰이 모두 실제 이름 토큰 안에 있으면 일치 (순서 무관, 미들네임 허용).
 * 예: 등록 "AAA BBB" ↔ 실제 "BBB AAA", "AAA CCC BBB"
 */
export function guestNameMatchesBlacklist(
  blacklistTokens: string[],
  guestName: string,
): boolean {
  if (!blacklistTokens.length) return false;
  const guestTokens = tokenizeGuestName(guestName);
  if (!guestTokens.length) return false;
  return blacklistTokens.every((token) => guestTokens.includes(token));
}

export type BlacklistHit = {
  record: ReconcileRecord;
  entry: RateConfirmGuestBlacklistEntry;
};

export function findBlacklistHits(
  records: ReconcileRecord[],
  blacklist: RateConfirmGuestBlacklistEntry[],
): BlacklistHit[] {
  const active = blacklist.filter((entry) => entry.active);
  const hits: BlacklistHit[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const guestName = record.guestName.trim();
    if (!guestName || guestName === '—') continue;

    for (const entry of active) {
      const tokens = entry.name_tokens.length
        ? entry.name_tokens
        : tokenizeGuestName(entry.guest_name);
      if (!guestNameMatchesBlacklist(tokens, guestName)) continue;

      const key = `${record.ota}:${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ record, entry });
    }
  }

  return hits;
}

export function buildBlacklistHitsByOta(hits: BlacklistHit[]): Map<string, BlacklistHit[]> {
  const map = new Map<string, BlacklistHit[]>();
  for (const hit of hits) {
    const list = map.get(hit.record.ota) ?? [];
    list.push(hit);
    map.set(hit.record.ota, list);
  }
  return map;
}
