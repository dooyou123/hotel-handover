import { NextResponse } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import {
  ballotRanksFromVotes,
  dateAvailabilityMap,
  validateBallotRanks,
} from '@/lib/year-end-party/helpers';
import {
  PARTY_VETO_RANK,
  type PartyAvailability,
  type PartyBallotRanks,
  type PartyDateVote,
  type PartyVenueVote,
  type PartyVoteRank,
} from '@/lib/year-end-party/types';
import { hashPartyPin, validatePartyPin, verifyPartyPin } from '@/lib/year-end-party/voter-pin';

type BallotBody = {
  action?: 'status' | 'unlock' | 'save' | 'clear';
  voter_name?: string;
  pin?: string;
  pin_confirm?: string;
  new_pin?: string;
  ranks?: PartyBallotRanks;
  dateVotes?: Array<{ slot_id: string; availability: PartyAvailability }>;
};

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return badRequest('로그인이 필요합니다.', 401);
  if (!hasServiceRoleKey()) {
    return badRequest('서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다.', 503);
  }

  const body = (await request.json().catch(() => null)) as BallotBody | null;
  if (!body?.action) return badRequest('action이 필요합니다.');

  const voter = body.voter_name?.trim() ?? '';
  if (!voter) return badRequest('투표자를 선택해 주세요.');

  const service = createServiceClient();

  const { data: pinRow } = await service
    .from('party_voter_pins')
    .select('pin_hash')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('voter_name', voter)
    .maybeSingle();

  const storedHash = (pinRow as { pin_hash?: string } | null)?.pin_hash ?? null;

  const { data: venueVoteRows, error: venueVotesError } = await service
    .from('party_venue_votes')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('voter_name', voter);
  if (venueVotesError) return badRequest(venueVotesError.message, 500);

  const venueVotes = (venueVoteRows ?? []) as PartyVenueVote[];
  const hasBallot = venueVotes.length > 0;
  const hasPin = Boolean(storedHash);

  if (body.action === 'status') {
    return NextResponse.json({ hasBallot, hasPin, protected: hasBallot && hasPin });
  }

  if (body.action === 'unlock') {
    if (!hasBallot) return badRequest('저장된 투표가 없습니다.');

    const { data: dateVoteRows } = await service
      .from('party_date_votes')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);

    const payload = {
      unlocked: true as const,
      ranks: ballotRanksFromVotes(venueVotes),
      dateVotes: dateAvailabilityMap((dateVoteRows ?? []) as PartyDateVote[], voter),
    };

    if (!hasPin) {
      return NextResponse.json({
        ...payload,
        legacy: true,
        message: '비밀번호가 없던 투표입니다. 저장할 때 새 비밀번호를 설정해 주세요.',
      });
    }

    if (!verifyPartyPin(body.pin ?? '', storedHash)) {
      return badRequest('비밀번호가 올바르지 않습니다.', 403);
    }

    return NextResponse.json({ ...payload, legacy: false });
  }

  if (body.action === 'clear') {
    if (!hasBallot) return badRequest('삭제할 투표가 없습니다.');
    if (hasPin && !verifyPartyPin(body.pin ?? '', storedHash)) {
      return badRequest('비밀번호가 올바르지 않습니다.', 403);
    }
    if (!hasPin) {
      return badRequest(
        '비밀번호가 없는 이전 투표입니다. 먼저 비밀번호를 입력해 잠금 해제·저장한 뒤 철회해 주세요.',
      );
    }

    const { error: venueError } = await service
      .from('party_venue_votes')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);
    if (venueError) return badRequest(venueError.message, 500);

    const { error: dateError } = await service
      .from('party_date_votes')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);
    if (dateError) return badRequest(dateError.message, 500);

    await service
      .from('party_voter_pins')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save') {
    if (!body.ranks) return badRequest('순위가 필요합니다.');
    const invalid = validateBallotRanks(body.ranks);
    if (invalid) return badRequest(invalid);

    const pin = body.pin ?? '';
    const pinConfirm = body.pin_confirm ?? '';
    const newPin = body.new_pin?.trim() ?? '';

    let nextPinPlain = pin;

    if (hasPin) {
      if (!verifyPartyPin(pin, storedHash)) {
        return badRequest('비밀번호가 올바르지 않습니다.', 403);
      }
      if (newPin) {
        const err = validatePartyPin(newPin);
        if (err) return badRequest(err);
        if (pinConfirm && pinConfirm !== newPin) {
          return badRequest('새 비밀번호 확인이 일치하지 않습니다.');
        }
        nextPinPlain = newPin;
      } else {
        // keep existing hash — no rehash needed
        nextPinPlain = '';
      }
    } else {
      const err = validatePartyPin(pin);
      if (err) return badRequest(err);
      if (pinConfirm !== pin) return badRequest('비밀번호 확인이 일치하지 않습니다.');
      nextPinPlain = pin;
    }

    const ranks = body.ranks;
    const rows = ([1, 2, 3] as const)
      .map((rank) => {
        const venueId = ranks[rank]?.trim();
        if (!venueId) return null;
        return {
          hotel_id: DEFAULT_HOTEL_ID,
          venue_id: venueId,
          voter_name: voter,
          rank: rank as PartyVoteRank,
          comment: '',
        };
      })
      .filter(Boolean) as Array<{
      hotel_id: string;
      venue_id: string;
      voter_name: string;
      rank: PartyVoteRank;
      comment: string;
    }>;

    const vetoVenueId = ranks.veto?.trim();
    if (vetoVenueId) {
      if (rows.some((row) => row.venue_id === vetoVenueId)) {
        return badRequest('순위에 넣은 장소를 「절대 가기 싫어요」로 선택할 수 없습니다.');
      }
      rows.push({
        hotel_id: DEFAULT_HOTEL_ID,
        venue_id: vetoVenueId,
        voter_name: voter,
        rank: PARTY_VETO_RANK,
        comment: '',
      });
    }

    const { error: deleteError } = await service
      .from('party_venue_votes')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);
    if (deleteError) return badRequest(deleteError.message, 500);

    if (rows.length) {
      const { error: insertError } = await service.from('party_venue_votes').insert(rows);
      if (insertError) return badRequest(insertError.message, 500);
    }

    // Replace date votes for this voter with submitted set
    await service
      .from('party_date_votes')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('voter_name', voter);

    for (const dateVote of body.dateVotes ?? []) {
      const { error } = await service.from('party_date_votes').insert({
        hotel_id: DEFAULT_HOTEL_ID,
        slot_id: dateVote.slot_id,
        voter_name: voter,
        availability: dateVote.availability,
      });
      if (error) return badRequest(error.message, 500);
    }

    if (nextPinPlain) {
      const { error: pinErrorDb } = await service.from('party_voter_pins').upsert(
        {
          hotel_id: DEFAULT_HOTEL_ID,
          voter_name: voter,
          pin_hash: hashPartyPin(nextPinPlain),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hotel_id,voter_name' },
      );
      if (pinErrorDb) return badRequest(pinErrorDb.message, 500);
    }

    return NextResponse.json({ ok: true });
  }

  return badRequest('알 수 없는 action입니다.');
}
