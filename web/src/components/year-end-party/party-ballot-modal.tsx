'use client';

import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';
import { useEffect, useState } from 'react';
import {
  emptyBallotRanks,
  validateBallotRanks,
} from '@/lib/year-end-party/helpers';
import {
  PARTY_AVAILABILITY,
  PARTY_RANKS,
  PARTY_VETO_META,
  type PartyAvailability,
  type PartyBallotRanks,
  type PartyDateSlot,
  type PartyEmployee,
  type PartyRank,
  type PartyVenue,
  type PartyVenueVote,
} from '@/lib/year-end-party/types';

type PartyBallotModalProps = {
  open: boolean;
  locked: boolean;
  lockMessage: string;
  employees: PartyEmployee[];
  venues: PartyVenue[];
  slots: PartyDateSlot[];
  venueVotes: PartyVenueVote[];
  initialVoter?: string;
  saving?: boolean;
  onClose: () => void;
  onUnlock: (input: {
    voter_name: string;
    pin: string;
  }) => Promise<{
    ranks: PartyBallotRanks;
    dateVotes: Record<string, PartyAvailability | ''>;
    legacy?: boolean;
    message?: string;
  }>;
  onSubmit: (input: {
    voter_name: string;
    ranks: PartyBallotRanks;
    dateVotes: Array<{ slot_id: string; availability: PartyAvailability }>;
    pin: string;
    pin_confirm?: string;
    new_pin?: string;
  }) => Promise<void>;
  onClear?: (input: { voter_name: string; pin: string }) => Promise<boolean>;
};

function venueLabel(venue: PartyVenue) {
  return `${venue.name} · ${venue.category}`;
}

export function PartyBallotModal({
  open,
  locked,
  lockMessage,
  employees,
  venues,
  slots,
  venueVotes,
  initialVoter = '',
  saving = false,
  onClose,
  onUnlock,
  onSubmit,
  onClear,
}: PartyBallotModalProps) {
  const [voterName, setVoterName] = useState(initialVoter);
  const [ranks, setRanks] = useState<PartyBallotRanks>(emptyBallotRanks());
  const [slotMap, setSlotMap] = useState<Record<string, PartyAvailability | ''>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [legacyNoPin, setLegacyNoPin] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [newPin, setNewPin] = useState('');
  const [changePin, setChangePin] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasExistingBallot = Boolean(
    voterName && venueVotes.some((v) => v.voter_name === voterName),
  );
  const needsUnlock = hasExistingBallot && !unlocked;
  const canEdit = Boolean(voterName) && !needsUnlock && !locked;

  useEffect(() => {
    if (!open) return;
    const name = initialVoter || '';
    setVoterName(name);
    setRanks(emptyBallotRanks());
    setSlotMap({});
    setUnlocked(false);
    setLegacyNoPin(false);
    setUnlockPin('');
    setPin('');
    setPinConfirm('');
    setNewPin('');
    setChangePin(false);
    setError(null);
    setInfo(null);
  }, [open, initialVoter]);

  if (!open) return null;

  function resetEditor() {
    setRanks(emptyBallotRanks());
    setSlotMap({});
    setUnlocked(false);
    setLegacyNoPin(false);
    setUnlockPin('');
    setPin('');
    setPinConfirm('');
    setNewPin('');
    setChangePin(false);
    setError(null);
    setInfo(null);
  }

  function selectVoter(name: string) {
    setVoterName(name);
    resetEditor();
  }

  function setRank(rank: PartyRank, venueId: string) {
    setRanks((prev) => {
      const next = { ...prev, [rank]: prev[rank] === venueId ? '' : venueId };
      if (next[rank]) {
        ([1, 2, 3] as const).forEach((r) => {
          if (r !== rank && next[r] === venueId) next[r] = '';
        });
        if (next.veto === venueId) next.veto = '';
      }
      return next;
    });
  }

  function setVeto(venueId: string) {
    setRanks((prev) => {
      const next = {
        ...prev,
        veto: prev.veto === venueId ? '' : venueId,
      };
      if (next.veto) {
        ([1, 2, 3] as const).forEach((r) => {
          if (next[r] === venueId) next[r] = '';
        });
      }
      return next;
    });
  }

  async function handleUnlock() {
    if (!voterName.trim()) {
      setError('투표할 직원을 선택해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onUnlock({ voter_name: voterName, pin: unlockPin });
      setRanks(result.ranks);
      setSlotMap(result.dateVotes ?? {});
      setUnlocked(true);
      setLegacyNoPin(Boolean(result.legacy));
      setInfo(result.message ?? '잠금이 해제되었습니다. 수정 후 다시 제출할 수 있습니다.');
      setPin(unlockPin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '잠금 해제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (locked) {
      setError(lockMessage);
      return;
    }
    if (!voterName.trim()) {
      setError('투표할 직원을 선택해 주세요.');
      return;
    }
    if (needsUnlock) {
      setError('먼저 비밀번호로 잠금을 해제해 주세요.');
      return;
    }
    const invalid = validateBallotRanks(ranks);
    if (invalid) {
      setError(invalid);
      return;
    }

    if (hasExistingBallot && unlocked && !legacyNoPin) {
      if (pin.trim().length < 4) {
        setError('수정·재투표하려면 비밀번호를 입력해 주세요.');
        return;
      }
      if (changePin) {
        if (newPin.trim().length < 4) {
          setError('새 비밀번호는 4자 이상이어야 합니다.');
          return;
        }
        if (newPin !== pinConfirm) {
          setError('새 비밀번호 확인이 일치하지 않습니다.');
          return;
        }
      }
    } else {
      if (pin.trim().length < 4) {
        setError('투표 비밀번호를 4자 이상 설정해 주세요.');
        return;
      }
      if (pin !== pinConfirm) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    setError(null);
    await onSubmit({
      voter_name: voterName,
      ranks,
      dateVotes: slots
        .map((slot) => {
          const availability = slotMap[slot.id];
          if (!availability) return null;
          return { slot_id: slot.id, availability };
        })
        .filter(Boolean) as Array<{ slot_id: string; availability: PartyAvailability }>,
      pin,
      pin_confirm: hasExistingBallot && unlocked && !legacyNoPin ? undefined : pinConfirm,
      new_pin: changePin ? newPin : undefined,
    });
  }

  async function handleClear(fromLock = false) {
    if (!onClear || !voterName) return;
    if (legacyNoPin) {
      setError('비밀번호를 설정해 저장한 뒤, 다시 삭제할 수 있습니다.');
      return;
    }
    const pinForClear = fromLock ? unlockPin : pin;
    if (pinForClear.trim().length < 4) {
      setError('투표를 삭제하려면 비밀번호를 입력해 주세요.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const cleared = await onClear({ voter_name: voterName, pin: pinForClear });
      if (!cleared) return;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '투표 삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const attending = employees.filter((e) => e.attending);
  const controlsDisabled = !canEdit;

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div
        className="modal yp-vote-modal yp-ballot-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="yp-ballot-title"
      >
        <header className="yp-vote-modal__header">
          <div>
            <p className="yp-vote-modal__eyebrow">
              {hasExistingBallot ? '재투표 · 수정 · 삭제' : '일괄 투표'}
            </p>
            <h2 id="yp-ballot-title">내 순위·일정 한 번에 고르기</h2>
            <p className="yp-muted">
              투표 시 개인 비밀번호를 설정합니다. 수정·삭제는 비밀번호가 있어야 가능합니다.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <div className="yp-vote-modal__body">
          <section className="yp-vote-modal__section">
            <h3>투표자</h3>
            <div className="yp-name-chips">
              {attending.map((row) => {
                const hasBallot = venueVotes.some((v) => v.voter_name === row.name);
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`yp-name-chip${voterName === row.name ? ' is-active' : ''}${hasBallot ? ' has-vote' : ''}`}
                    onClick={() => selectVoter(row.name)}
                  >
                    {row.name}
                    {hasBallot ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
            {!attending.length ? (
              <p className="yp-muted">준비 → 직원에서 참석 명단을 먼저 등록해 주세요.</p>
            ) : null}
          </section>

          {needsUnlock ? (
            <section className="yp-vote-modal__section yp-ballot-lock">
              <h3>비밀번호로 잠금 해제 · 삭제</h3>
              <p className="yp-muted">
                {voterName}님은 이미 투표했습니다. 재투표·수정은 「잠금 해제」로, 투표 전체 삭제는
                「투표 삭제」로 진행하세요. 선택 내용은 해제 후에만 보입니다.
              </p>
              <label className="field">
                <span>투표 비밀번호</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value)}
                  placeholder="4자 이상 (이전 투표는 비워도 됨)"
                  disabled={locked || busy || saving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleUnlock();
                  }}
                />
              </label>
              <div className="yp-inline-actions yp-ballot-lock__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={locked || busy || saving}
                  onClick={() => void handleUnlock()}
                >
                  {busy ? '확인 중…' : '잠금 해제 후 수정'}
                </button>
                {onClear ? (
                  <button
                    type="button"
                    className="btn btn--danger"
                    disabled={locked || busy || saving || unlockPin.trim().length < 4}
                    onClick={() => void handleClear(true)}
                  >
                    투표 삭제
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {canEdit ? (
            <>
              <section className="yp-vote-modal__section">
                <h3>장소 순위</h3>
                {!venues.length ? (
                  <p className="yp-muted">등록된 장소가 없습니다. 홈에서 장소를 먼저 추가해 주세요.</p>
                ) : (
                  <div className="yp-ballot-ranks">
                    {([1, 2, 3] as const).map((rank) => {
                      const selected = ranks[rank];
                      const selectedVenue = venues.find((v) => v.id === selected);
                      return (
                        <div key={rank} className="yp-ballot-rank">
                          <div className="yp-ballot-rank__label">
                            <span>
                              {PARTY_RANKS[rank].emoji} {PARTY_RANKS[rank].label}
                              {rank === 1 ? ' (필수)' : ' (선택)'}
                            </span>
                            {selectedVenue ? (
                              <strong className="yp-ballot-rank__picked">{selectedVenue.name}</strong>
                            ) : (
                              <span className="yp-muted">미선택</span>
                            )}
                          </div>
                          <div
                            className="yp-ballot-venue-grid"
                            role="group"
                            aria-label={`${rank}순위 장소`}
                          >
                            {venues.map((venue) => {
                              const takenByOther =
                                ([1, 2, 3] as const).some(
                                  (r) => r !== rank && ranks[r] === venue.id,
                                ) || ranks.veto === venue.id;
                              const active = selected === venue.id;
                              return (
                                <button
                                  key={venue.id}
                                  type="button"
                                  className={`yp-ballot-venue-btn${active ? ' is-active' : ''}`}
                                  disabled={controlsDisabled || (takenByOther && !active)}
                                  aria-pressed={active}
                                  onClick={() => setRank(rank, venue.id)}
                                >
                                  {venueLabel(venue)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="yp-ballot-veto">
                  <div className="yp-ballot-rank__label">
                    <span>
                      {PARTY_VETO_META.emoji} {PARTY_VETO_META.label} (선택 · 감점{' '}
                      {PARTY_VETO_META.score}점)
                    </span>
                    {ranks.veto ? (
                      <strong className="yp-ballot-rank__picked">
                        {venues.find((v) => v.id === ranks.veto)?.name ?? '선택됨'}
                      </strong>
                    ) : (
                      <span className="yp-muted">없음</span>
                    )}
                  </div>
                  <div className="yp-ballot-venue-grid" role="group" aria-label="절대 가기 싫은 곳">
                    <button
                      type="button"
                      className={`yp-ballot-venue-btn${ranks.veto === '' ? ' is-active' : ''}`}
                      disabled={controlsDisabled}
                      aria-pressed={ranks.veto === ''}
                      onClick={() => setRanks((prev) => ({ ...prev, veto: '' }))}
                    >
                      없음
                    </button>
                    {venues.map((venue) => {
                      const takenByRank = ([1, 2, 3] as const).some((r) => ranks[r] === venue.id);
                      const active = ranks.veto === venue.id;
                      return (
                        <button
                          key={venue.id}
                          type="button"
                          className={`yp-ballot-venue-btn yp-ballot-venue-btn--veto${active ? ' is-active' : ''}`}
                          disabled={controlsDisabled || (takenByRank && !active)}
                          aria-pressed={active}
                          onClick={() => setVeto(venue.id)}
                        >
                          {venueLabel(venue)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {slots.length ? (
                <section className="yp-vote-modal__section">
                  <h3>일정 가능 여부</h3>
                  <ul className="yp-ballot-slots">
                    {slots.map((slot) => (
                      <li key={slot.id}>
                        <div>
                          <strong>
                            {slot.slot_date} {slot.slot_time}
                          </strong>
                          {slot.label ? <span className="yp-muted"> · {slot.label}</span> : null}
                        </div>
                        <div
                          className="yp-avail-btns"
                          role="group"
                          aria-label={`${slot.slot_date} 응답`}
                        >
                          {(Object.keys(PARTY_AVAILABILITY) as PartyAvailability[]).map((key) => (
                            <button
                              key={key}
                              type="button"
                              className={`yp-avail-btn${slotMap[slot.id] === key ? ' is-active' : ''}`}
                              disabled={controlsDisabled}
                              onClick={() =>
                                setSlotMap((prev) => ({
                                  ...prev,
                                  [slot.id]: prev[slot.id] === key ? '' : key,
                                }))
                              }
                            >
                              {PARTY_AVAILABILITY[key].emoji} {PARTY_AVAILABILITY[key].label}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="yp-muted">
                  일정 후보가 없으면 장소 순위만 제출됩니다. 준비 → 일정 후보에서 추가하세요.
                </p>
              )}

              <section className="yp-vote-modal__section yp-ballot-pin">
                <h3>
                  {hasExistingBallot && unlocked && !legacyNoPin
                    ? '비밀번호 확인'
                    : '투표 비밀번호 설정'}
                </h3>
                {hasExistingBallot && unlocked && !legacyNoPin ? (
                  <>
                    <p className="yp-muted">재투표·수정을 저장하려면 비밀번호를 다시 입력하세요.</p>
                    <label className="field">
                      <span>현재 비밀번호</span>
                      <input
                        type="password"
                        autoComplete="off"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="투표 때 설정한 비밀번호"
                        disabled={locked}
                      />
                    </label>
                    <label className="yp-check">
                      <input
                        type="checkbox"
                        checked={changePin}
                        onChange={(e) => setChangePin(e.target.checked)}
                      />
                      <span>비밀번호도 바꾸기</span>
                    </label>
                    {changePin ? (
                      <div className="yp-ballot-pin__grid">
                        <label className="field">
                          <span>새 비밀번호</span>
                          <input
                            type="password"
                            autoComplete="off"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="4자 이상"
                          />
                        </label>
                        <label className="field">
                          <span>새 비밀번호 확인</span>
                          <input
                            type="password"
                            autoComplete="off"
                            value={pinConfirm}
                            onChange={(e) => setPinConfirm(e.target.value)}
                            placeholder="한 번 더"
                          />
                        </label>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="yp-muted">
                      본인만 아는 비밀번호를 정하세요. 나중에 수정·철회할 때 필요합니다.
                    </p>
                    <div className="yp-ballot-pin__grid">
                      <label className="field">
                        <span>비밀번호</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="4자 이상"
                          disabled={locked}
                        />
                      </label>
                      <label className="field">
                        <span>비밀번호 확인</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={pinConfirm}
                          onChange={(e) => setPinConfirm(e.target.value)}
                          placeholder="한 번 더"
                          disabled={locked}
                        />
                      </label>
                    </div>
                  </>
                )}
              </section>
            </>
          ) : null}

          {!voterName ? (
            <p className="yp-muted">위에서 투표할 직원을 먼저 선택해 주세요.</p>
          ) : null}

          {info ? <p className="yp-ballot-info">{info}</p> : null}
          {error ? <p className="rc-status rc-status--error">{error}</p> : null}
          {locked ? <p className="yp-muted">{lockMessage}</p> : null}
        </div>

        <footer className="modal__footer yp-vote-modal__footer">
          {onClear && canEdit && hasExistingBallot && !legacyNoPin ? (
            <button
              type="button"
              className="btn btn--danger"
              disabled={locked || saving || busy}
              onClick={() => void handleClear(false)}
            >
              투표 삭제
            </button>
          ) : (
            <span />
          )}
          <div className="yp-inline-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={locked || saving || !canEdit}
              onClick={() => void handleSubmit()}
            >
              {saving
                ? '저장 중…'
                : hasExistingBallot
                  ? '재투표 저장'
                  : '투표 제출'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
