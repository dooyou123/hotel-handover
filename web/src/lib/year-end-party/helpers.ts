import type {
  PartyDateSlot,
  PartyDateVote,
  PartyDietary,
  PartyEmployee,
  PartyVenue,
  PartyVenueVote,
  PartySettings,
  PartyRank,
  PartyBallotRanks,
  PartyAvailability,
} from '@/lib/year-end-party/types';
import {
  PARTY_RANKS,
  PARTY_AVAILABILITY,
  PARTY_VETO_RANK,
  PARTY_VETO_META,
} from '@/lib/year-end-party/types';

export function rankMeta(rank: number | string) {
  const key = Number(rank);
  if (key === 1 || key === 2 || key === 3) return PARTY_RANKS[key as PartyRank];
  if (key === PARTY_VETO_RANK) return PARTY_VETO_META;
  return { label: `${rank}순위`, emoji: '·', score: 0 };
}

export function normalizeRank(value: unknown): PartyRank | null {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function isVetoVote(vote: PartyVenueVote): boolean {
  return Number(vote.rank) === PARTY_VETO_RANK;
}

export function venueScore(votes: PartyVenueVote[]): number {
  return votes.reduce((sum, vote) => sum + rankMeta(vote.rank).score, 0);
}

export function venueVoteCount(votes: PartyVenueVote[]): number {
  return votes.filter((vote) => !isVetoVote(vote)).length;
}

export function venueVetoCount(votes: PartyVenueVote[]): number {
  return votes.filter(isVetoVote).length;
}

export function venueRankBreakdown(votes: PartyVenueVote[]) {
  return {
    1: votes.filter((v) => Number(v.rank) === 1).map((v) => v.voter_name),
    2: votes.filter((v) => Number(v.rank) === 2).map((v) => v.voter_name),
    3: votes.filter((v) => Number(v.rank) === 3).map((v) => v.voter_name),
    veto: votes.filter(isVetoVote).map((v) => v.voter_name),
  };
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

export type VoterBallotSummary = {
  voter_name: string;
  ranks: Partial<Record<PartyRank, string>>;
  venueNames: Partial<Record<PartyRank, string>>;
  vetoVenueName: string | null;
  dateVoteCount: number;
  hasVenueBallot: boolean;
};

export function buildVoterBallotSummaries(input: {
  employees: PartyEmployee[];
  venues: PartyVenue[];
  venueVotes: PartyVenueVote[];
  dateVotes: PartyDateVote[];
}): {
  voted: VoterBallotSummary[];
  pending: PartyEmployee[];
  venueNeverPicked: PartyVenue[];
} {
  const venueName = new Map(input.venues.map((v) => [v.id, v.name]));
  const byVoter = new Map<string, PartyVenueVote[]>();
  for (const vote of input.venueVotes) {
    const list = byVoter.get(vote.voter_name) ?? [];
    list.push(vote);
    byVoter.set(vote.voter_name, list);
  }

  const dateCount = new Map<string, number>();
  for (const vote of input.dateVotes) {
    dateCount.set(vote.voter_name, (dateCount.get(vote.voter_name) ?? 0) + 1);
  }

  const attending = input.employees.filter((e) => e.attending);
  const voted: VoterBallotSummary[] = [];
  const pending: PartyEmployee[] = [];

  function summarize(name: string, votes: PartyVenueVote[]): VoterBallotSummary {
    const ranks: Partial<Record<PartyRank, string>> = {};
    const venueNames: Partial<Record<PartyRank, string>> = {};
    let vetoVenueName: string | null = null;
    for (const vote of votes) {
      if (isVetoVote(vote)) {
        vetoVenueName = venueName.get(vote.venue_id) ?? vote.venue_id;
        continue;
      }
      const rank = normalizeRank(vote.rank);
      if (!rank) continue;
      ranks[rank] = vote.venue_id;
      venueNames[rank] = venueName.get(vote.venue_id) ?? vote.venue_id;
    }
    return {
      voter_name: name,
      ranks,
      venueNames,
      vetoVenueName,
      dateVoteCount: dateCount.get(name) ?? 0,
      hasVenueBallot: true,
    };
  }

  for (const employee of attending) {
    const votes = byVoter.get(employee.name) ?? [];
    if (!votes.length) {
      pending.push(employee);
      continue;
    }
    voted.push(summarize(employee.name, votes));
  }

  // 명단에 없지만 투표한 사람
  for (const [name, votes] of byVoter) {
    if (attending.some((e) => e.name === name)) continue;
    voted.push(summarize(name, votes));
  }

  voted.sort((a, b) => a.voter_name.localeCompare(b.voter_name, 'ko'));
  pending.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const picked = new Set(input.venueVotes.filter((v) => !isVetoVote(v)).map((v) => v.venue_id));
  const venueNeverPicked = input.venues.filter((v) => !picked.has(v.id));

  return { voted, pending, venueNeverPicked };
}

export function emptyBallotRanks(): PartyBallotRanks {
  return { 1: '', 2: '', 3: '', veto: '' };
}

export function ballotRanksFromVotes(votes: PartyVenueVote[]): PartyBallotRanks {
  const ranks = emptyBallotRanks();
  for (const vote of votes) {
    if (isVetoVote(vote)) {
      ranks.veto = vote.venue_id;
      continue;
    }
    const rank = normalizeRank(vote.rank);
    if (rank) ranks[rank] = vote.venue_id;
  }
  return ranks;
}

export function validateBallotRanks(ranks: PartyBallotRanks): string | null {
  if (!ranks[1].trim()) return '1순위 장소를 선택해 주세요.';
  const picked = [ranks[1], ranks[2], ranks[3]].map((id) => id.trim()).filter(Boolean);
  if (new Set(picked).size !== picked.length) return '같은 장소를 여러 순위에 넣을 수 없습니다.';
  const veto = ranks.veto.trim();
  if (veto && picked.includes(veto)) {
    return '순위에 넣은 장소를 「절대 가기 싫어요」로 선택할 수 없습니다.';
  }
  return null;
}

export function dateAvailabilityMap(
  votes: PartyDateVote[],
  voterName: string,
): Record<string, PartyAvailability | ''> {
  const map: Record<string, PartyAvailability | ''> = {};
  for (const vote of votes) {
    if (vote.voter_name === voterName) map[vote.slot_id] = vote.availability;
  }
  return map;
}

export type VoteDeadlineParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

export type VoteWindowState =
  | { status: 'unset' }
  | ({ status: 'scheduled'; opensAt: Date } & VoteDeadlineParts)
  | ({ status: 'open'; opensAt: Date | null; endedAt: Date | null } & VoteDeadlineParts)
  | ({ status: 'open-indefinite'; opensAt: Date | null })
  | { status: 'closed'; endedAt: Date };

function countdownParts(totalMs: number): VoteDeadlineParts {
  const clamped = Math.max(0, totalMs);
  const totalSec = Math.floor(clamped / 1000);
  return {
    totalMs: clamped,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function parseInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 투표 시작·마감 창. unset이면 상시 투표 가능. */
export function getVoteWindowState(
  opensAt: string | null | undefined,
  deadlineAt: string | null | undefined,
  nowMs = Date.now(),
): VoteWindowState {
  const opens = parseInstant(opensAt);
  const ends = parseInstant(deadlineAt);

  if (ends && ends.getTime() <= nowMs) {
    return { status: 'closed', endedAt: ends };
  }
  if (opens && opens.getTime() > nowMs) {
    return { status: 'scheduled', opensAt: opens, ...countdownParts(opens.getTime() - nowMs) };
  }
  if (ends) {
    return {
      status: 'open',
      opensAt: opens,
      endedAt: ends,
      ...countdownParts(ends.getTime() - nowMs),
    };
  }
  if (opens) {
    return { status: 'open-indefinite', opensAt: opens };
  }
  return { status: 'unset' };
}

/** @deprecated use getVoteWindowState */
export function getVoteDeadlineState(
  deadlineAt: string | null | undefined,
  nowMs = Date.now(),
): VoteWindowState {
  return getVoteWindowState(null, deadlineAt, nowMs);
}

export function canVoteNow(state: VoteWindowState): boolean {
  return state.status === 'unset' || state.status === 'open' || state.status === 'open-indefinite';
}

export function voteLockMessage(state: VoteWindowState): string {
  if (state.status === 'scheduled') return '투표 시작 전입니다.';
  if (state.status === 'closed') return '투표 기한이 마감되었습니다.';
  return '';
}

/** 관리자가 결과 공개를 눌렀을 때만 true. null/미설정이면 비밀 투표. */
export function arePartyResultsPublished(
  resultsPublishedAt: string | null | undefined,
): boolean {
  return Boolean(resultsPublishedAt);
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
          표수: venueVoteCount(votes),
          '1순위': votes.filter((v) => Number(v.rank) === 1).length,
          '2순위': votes.filter((v) => Number(v.rank) === 2).length,
          '3순위': votes.filter((v) => Number(v.rank) === 3).length,
          싫어요: venueVetoCount(votes),
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
        순위: rankMeta(vote.rank).label,
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
