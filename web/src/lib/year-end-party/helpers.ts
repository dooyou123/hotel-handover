import type {
  PartyDateSlot,
  PartyDateVote,
  PartyDietary,
  PartyEmployee,
  PartyVenue,
  PartyVenueVote,
  PartySettings,
} from '@/lib/year-end-party/types';
import { PARTY_PREFERENCES, PARTY_AVAILABILITY } from '@/lib/year-end-party/types';

export function venueScore(votes: PartyVenueVote[]): number {
  return votes.reduce((sum, vote) => sum + PARTY_PREFERENCES[vote.preference].score, 0);
}

export function venueVoteCount(votes: PartyVenueVote[]): number {
  return votes.length;
}

export function topVenueId(venues: PartyVenue[], votes: PartyVenueVote[]): string | null {
  if (!venues.length) return null;
  let bestId: string | null = null;
  let bestScore = -1;
  for (const venue of venues) {
    const score = venueScore(votes.filter((vote) => vote.venue_id === venue.id));
    if (score > bestScore) {
      bestScore = score;
      bestId = venue.id;
    }
  }
  return bestScore > 0 ? bestId : null;
}

export function slotCounts(votes: PartyDateVote[]) {
  return {
    yes: votes.filter((v) => v.availability === 'yes').length,
    maybe: votes.filter((v) => v.availability === 'maybe').length,
    no: votes.filter((v) => v.availability === 'no').length,
    score: votes.reduce((sum, v) => sum + PARTY_AVAILABILITY[v.availability].score, 0),
  };
}

export type VoteDeadlineParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

export type VoteDeadlineState =
  | { status: 'unset' }
  | { status: 'closed'; endedAt: Date }
  | ({ status: 'open'; endedAt: Date } & VoteDeadlineParts);

export function getVoteDeadlineState(
  deadlineAt: string | null | undefined,
  nowMs = Date.now(),
): VoteDeadlineState {
  if (!deadlineAt) return { status: 'unset' };
  const endedAt = new Date(deadlineAt);
  if (Number.isNaN(endedAt.getTime())) return { status: 'unset' };
  const totalMs = endedAt.getTime() - nowMs;
  if (totalMs <= 0) return { status: 'closed', endedAt };
  const totalSec = Math.floor(totalMs / 1000);
  return {
    status: 'open',
    endedAt,
    totalMs,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = match[6] ? Number(match[6]) : 0;
    const date = new Date(year, month - 1, day, hour, minute, second);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatDeadlineLabel(iso: string | null | undefined): string {
  if (!iso) return '미설정';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '미설정';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function attendingCount(employees: PartyEmployee[], override: number | null | undefined) {
  if (typeof override === 'number' && override >= 0) return override;
  return employees.filter((row) => row.attending).length;
}

export function budgetFitLabel(pricePerPerson: number, subsidy: number) {
  if (!subsidy) {
    return { tone: 'neutral' as const, text: '지원금 미설정' };
  }
  const diff = pricePerPerson - subsidy;
  if (diff <= 0) {
    const ratio = Math.round((pricePerPerson / subsidy) * 100);
    return { tone: 'ok' as const, text: `회사 지원금 이내 (${ratio}%)` };
  }
  return {
    tone: 'over' as const,
    text: `1인당 +${diff.toLocaleString('ko-KR')}원 초과`,
  };
}

export function venueAccentIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 3;
  return hash;
}

export function budgetTotals(input: {
  headcount: number;
  subsidy: number;
  pricePerPerson: number | null;
}) {
  const totalBudget = input.headcount * input.subsidy;
  const expectedSpend =
    input.pricePerPerson != null ? input.headcount * input.pricePerPerson : null;
  const remaining = expectedSpend != null ? totalBudget - expectedSpend : null;
  return { totalBudget, expectedSpend, remaining };
}

export function buildInvitationText(input: {
  venue?: PartyVenue | null;
  slot?: PartyDateSlot | null;
  headcount: number;
  subsidy: number;
}): string {
  const dateLabel = input.slot
    ? `${input.slot.slot_date} ${input.slot.slot_time}${input.slot.label ? ` (${input.slot.label})` : ''}`
    : '일정 미정';
  const venueLabel = input.venue?.name ?? '장소 미정';
  const address = input.venue?.address ? `\n📍 ${input.venue.address}` : '';
  const menu = input.venue?.signature_menu ? `\n🍽 대표 메뉴: ${input.venue.signature_menu}` : '';
  return [
    '🎉 연말 회식 초대',
    '',
    `일시: ${dateLabel}`,
    `장소: ${venueLabel}${address}${menu}`,
    `예상 인원: ${input.headcount}명`,
    `1인 지원금: ${input.subsidy.toLocaleString('ko-KR')}원`,
    '',
    '함께해 주실 수 있으면 회신 부탁드려요!',
    '즐거운 연말 보내요 ✨',
  ].join('\n');
}

export function polishInvitationLocally(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return [
    '✨ 연말 회식에 초대합니다',
    '',
    trimmed
      .replace(/^🎉 연말 회식 초대\s*/u, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    '',
    '편한 시간에 참석 여부만 알려 주세요. 곧 뵙겠습니다!',
  ].join('\n');
}

export function categoryDistribution(venues: PartyVenue[], votes: PartyVenueVote[]) {
  const map = new Map<string, number>();
  for (const venue of venues) {
    const score = venueScore(votes.filter((v) => v.venue_id === venue.id));
    map.set(venue.category, (map.get(venue.category) ?? 0) + Math.max(score, 0));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export function venueBarData(venues: PartyVenue[], votes: PartyVenueVote[]) {
  return venues
    .map((venue) => ({
      name: venue.name,
      score: venueScore(votes.filter((v) => v.venue_id === venue.id)),
      votes: venueVoteCount(votes.filter((v) => v.venue_id === venue.id)),
    }))
    .sort((a, b) => b.score - a.score);
}

export type ExportBundle = {
  employees: PartyEmployee[];
  venues: PartyVenue[];
  venueVotes: PartyVenueVote[];
  slots: PartyDateSlot[];
  dateVotes: PartyDateVote[];
  dietary: PartyDietary[];
  settings: PartySettings | undefined;
};

export async function downloadPartyWorkbook(bundle: ExportBundle) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      bundle.employees.map((row) => ({
        이름: row.name,
        부서: row.department,
        직급: row.title,
        참석: row.attending ? 'Y' : 'N',
        메모: row.memo,
      })),
    ),
    '직원',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      bundle.venues.map((venue) => {
        const votes = bundle.venueVotes.filter((v) => v.venue_id === venue.id);
        return {
          상호명: venue.name,
          카테고리: venue.category,
          대표메뉴: venue.signature_menu,
          '1인금액': venue.price_per_person,
          주소: venue.address,
          룸: venue.has_room ? 'Y' : 'N',
          주차: venue.has_parking ? 'Y' : 'N',
          별점: venue.rating,
          득점: venueScore(votes),
          표수: votes.length,
        };
      }),
    ),
    '장소',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      bundle.venueVotes.map((vote) => ({
        장소ID: vote.venue_id,
        투표자: vote.voter_name,
        선호도: vote.preference,
        한줄평: vote.comment,
      })),
    ),
    '장소투표',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      bundle.slots.map((slot) => {
        const votes = bundle.dateVotes.filter((v) => v.slot_id === slot.id);
        const counts = slotCounts(votes);
        return {
          날짜: slot.slot_date,
          시간: slot.slot_time,
          라벨: slot.label,
          가능: counts.yes,
          세모: counts.maybe,
          불가: counts.no,
        };
      }),
    ),
    '일정',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      bundle.dietary.map((row) => ({
        이름: row.employee_name,
        못먹는음식: row.restricted_foods,
        알레르기: row.allergies,
        음주: row.drinks_alcohol ? 'Y' : 'N',
        메모: row.notes,
      })),
    ),
    '식성',
  );

  const headcount = attendingCount(bundle.employees, bundle.settings?.headcount_override);
  const subsidy = bundle.settings?.subsidy_per_person ?? 100000;
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        지원금: subsidy,
        인원: headcount,
        총예산: headcount * subsidy,
      },
    ]),
    '예산',
  );

  XLSX.writeFile(wb, `year-end-party-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function shuffleInPlace<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function assignTables(names: string[], tableSize = 6): string[][] {
  const shuffled = shuffleInPlace(names);
  const tables: string[][] = [];
  for (let i = 0; i < shuffled.length; i += tableSize) {
    tables.push(shuffled.slice(i, i + tableSize));
  }
  return tables;
}
