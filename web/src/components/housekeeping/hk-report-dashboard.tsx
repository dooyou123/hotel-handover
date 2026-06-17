'use client';

import { Fragment, useState } from 'react';
import {
  HK_BED_SUFFIXES,
  HK_FLOORS_DESC,
  formatHkRoomNumber,
  isHkBedRoomTarget,
  type HkBedSuffix,
} from '@/lib/housekeeping/rooms';
import {
  getEffectiveBedType,
  isBedRoomChangedToday,
  type BedTypeSource,
} from '@/lib/housekeeping/baseline';
import {
  hasAnyStatusNotes,
  isOccupiedGuestStatus,
  type HousekeepingBedDraft,
  type HousekeepingSpecialDraft,
  type HkStatusNotes,
} from '@/lib/housekeeping/types';
import {
  HkBedTypeBadge,
  HkBedTypeLetter,
  HkExtraBedBadge,
  HkGuestStatusBadge,
} from '@/components/housekeeping/hk-bed-type-badge';
import { HkChangedRoomCard } from '@/components/housekeeping/hk-changed-room-card';
import { HkInHousePanel } from '@/components/housekeeping/hk-in-house-panel';
import { HkStatusNotesFields } from '@/components/housekeeping/hk-status-notes-fields';
import type { HkStatusNoteKey } from '@/lib/housekeeping/types';

type HkReportDashboardProps = {
  workDateLabel: string;
  bedRooms: HousekeepingBedDraft[];
  specialRooms: HousekeepingSpecialDraft[];
  bedTypeSource: BedTypeSource;
  previousDayNotes: string;
  nextDayNotes: string;
  statusNotes: HkStatusNotes;
  onCreateHandoverFromStatusNote?: (key: HkStatusNoteKey) => void;
  summary: {
    twinCount: number;
    tripleCount: number;
    changedCount: number;
    ebAddCount: number;
    ebRemoveCount: number;
    inHouseCount: number;
    inHouseUnsetCount: number;
  };
  findBedRoomIndex: (floor: number, suffix: HkBedSuffix) => number;
};

function filledSpecialRooms(rooms: HousekeepingSpecialDraft[]) {
  return rooms.filter(
    (room) =>
      room.room_number.trim() ||
      room.early_checkin.trim() ||
      room.is_vip ||
      room.is_long_stay ||
      room.notes.trim(),
  );
}

export function HkReportDashboard({
  workDateLabel,
  bedRooms,
  specialRooms,
  bedTypeSource,
  previousDayNotes,
  nextDayNotes,
  statusNotes,
  onCreateHandoverFromStatusNote,
  summary,
  findBedRoomIndex,
}: HkReportDashboardProps) {
  const [mapFilter, setMapFilter] = useState<'all' | 'occupied'>('all');

  const changedRooms = bedRooms
    .filter((room) => isBedRoomChangedToday(room, bedTypeSource))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  const specials = filledSpecialRooms(specialRooms);

  return (
    <div className="hk-dash">
      <header className="hk-dash__hero">
        <div>
          <p className="hk-dash__eyebrow">하우스키핑 전달</p>
          <h2 className="hk-dash__title">{workDateLabel}</h2>
        </div>
        <div className="hk-dash__stats">
          <span className="hk-dash__stat hk-dash__stat--inhouse">
            재실·도착 <strong>{summary.inHouseCount}</strong>
            {summary.inHouseUnsetCount > 0 ? (
              <em className="hk-dash__stat-warn">미설정 {summary.inHouseUnsetCount}</em>
            ) : null}
          </span>
          <span className="hk-dash__stat hk-dash__stat--twin">
            트윈 <strong>{summary.twinCount}</strong>
          </span>
          <span className="hk-dash__stat hk-dash__stat--triple">
            트리플 <strong>{summary.tripleCount}</strong>
          </span>
          <span className="hk-dash__stat">
            오늘 변경 <strong>{summary.changedCount}</strong>
          </span>
          {summary.ebAddCount > 0 ? (
            <span className="hk-dash__stat hk-dash__stat--add">
              EB 넣음 <strong>{summary.ebAddCount}</strong>
            </span>
          ) : null}
          {summary.ebRemoveCount > 0 ? (
            <span className="hk-dash__stat hk-dash__stat--remove">
              EB 뺌 <strong>{summary.ebRemoveCount}</strong>
            </span>
          ) : null}
        </div>
      </header>

      <HkInHousePanel bedRooms={bedRooms} bedTypeSource={bedTypeSource} readOnly />

      <section className="hk-dash__section">
        <div className="hk-dash__section-head">
          <h3>오늘 변경 객실</h3>
          <p>트윈/트리플 전환·엑스트라베드 작업이 있는 객실</p>
        </div>
        {changedRooms.length ? (
          <div className="hk-dash__changed-grid">
            {changedRooms.map((room) => (
              <HkChangedRoomCard
                key={room.room_number}
                room={room}
                effectiveType={getEffectiveBedType(room, bedTypeSource)}
                readOnly
              />
            ))}
          </div>
        ) : (
          <p className="hk-dash__empty">오늘 변경된 객실이 없습니다.</p>
        )}
      </section>

      <section className="hk-dash__section">
        <div className="hk-dash__section-head hk-dash__section-head--split">
          <div>
            <h3>전체 객실 맵</h3>
            <p>4~13층 02·10·16호 — 색·글자로 트윈/트리플 구분</p>
            <div className="hk-dash__legend hk-dash__legend--inline" aria-label="범례">
              <span>
                <HkBedTypeBadge type="twin" size="sm" showUnset={false} /> 트윈
              </span>
              <span>
                <HkBedTypeBadge type="triple" size="sm" showUnset={false} /> 트리플
              </span>
              <span className="hk-dash__legend-changed">테두리 = 오늘 변경</span>
              <span className="hk-dash__legend-occupied">● = 재실·도착</span>
            </div>
          </div>
          <div className="hk-dash__map-filters" role="group" aria-label="맵 필터">
            <button
              type="button"
              className={`btn btn--ghost btn--small${mapFilter === 'all' ? ' is-active' : ''}`}
              onClick={() => setMapFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              className={`btn btn--ghost btn--small${mapFilter === 'occupied' ? ' is-active' : ''}`}
              onClick={() => setMapFilter('occupied')}
            >
              재실·도착만
            </button>
          </div>
        </div>
        <div className="hk-dash__map-wrap">
          <div className="hk-dash__map">
            <div className="hk-dash__map-corner" />
            {HK_BED_SUFFIXES.map((suffix) => (
              <div key={suffix} className="hk-dash__map-colhead">
                {suffix}호
              </div>
            ))}
            {HK_FLOORS_DESC.map((floor) => (
              <Fragment key={floor}>
                <div className="hk-dash__map-rowhead">{floor}층</div>
                {HK_BED_SUFFIXES.map((suffix) => {
                  const roomNumber = formatHkRoomNumber(floor, suffix);
                  const cellKey = `${floor}-${suffix}`;

                  if (!isHkBedRoomTarget(roomNumber)) {
                    return (
                      <div key={cellKey} className="hk-dash__map-cell hk-dash__map-cell--na">
                        —
                      </div>
                    );
                  }

                  const index = findBedRoomIndex(floor, suffix);
                  const room = index >= 0 ? bedRooms[index] : null;
                  if (!room) {
                    return (
                      <div key={cellKey} className="hk-dash__map-cell">
                        —
                      </div>
                    );
                  }

                  const occupied = isOccupiedGuestStatus(room.guest_status);
                  if (mapFilter === 'occupied' && !occupied) {
                    return (
                      <div key={cellKey} className="hk-dash__map-cell hk-dash__map-cell--dimmed">
                        <span className="hk-dash__map-room">{room.room_number}</span>
                      </div>
                    );
                  }

                  const effectiveType = getEffectiveBedType(room, bedTypeSource);
                  const changedToday = isBedRoomChangedToday(room, bedTypeSource);
                  const isUnset = occupied && !effectiveType;

                  return (
                    <div
                      key={cellKey}
                      className={`hk-dash__map-cell${
                        effectiveType === 'twin'
                          ? ' hk-dash__map-cell--twin'
                          : effectiveType === 'triple'
                            ? ' hk-dash__map-cell--triple'
                            : ''
                      }${changedToday ? ' hk-dash__map-cell--changed' : ''}${
                        occupied ? ' hk-dash__map-cell--occupied' : ''
                      }${isUnset ? ' hk-dash__map-cell--alert' : ''}`}
                    >
                      {occupied ? <span className="hk-dash__map-occupied" aria-hidden /> : null}
                      <span className="hk-dash__map-room">{room.room_number}</span>
                      <HkBedTypeLetter type={effectiveType} />
                      <HkBedTypeBadge type={effectiveType} size="sm" />
                      {occupied ? <HkGuestStatusBadge status={room.guest_status} /> : null}
                      <HkExtraBedBadge action={room.extra_bed_action} />
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {hasAnyStatusNotes(statusNotes) ? (
        <section className="hk-dash__section">
          <div className="hk-dash__section-head">
            <h3>객실 상태 · 전달</h3>
            <p>H/U · Comp · VIP · O.O · 장기 숙박 · 정비 유의 · 퇴근 후 DELIVERY</p>
          </div>
          <HkStatusNotesFields
            value={statusNotes}
            onChange={() => {}}
            readOnly
            onCreateHandover={onCreateHandoverFromStatusNote}
          />
        </section>
      ) : null}

      {specials.length ? (
        <section className="hk-dash__section">
          <div className="hk-dash__section-head">
            <h3>특이 객실</h3>
          </div>
          <div className="hk-dash__special-list">
            {specials.map((room, index) => (
              <article key={room.id ?? `special-${index}`} className="hk-dash__special-card">
                <strong>{room.room_number || '객실 미입력'}</strong>
                <div className="hk-dash__special-tags">
                  {room.is_vip ? <span className="hk-dash__tag hk-dash__tag--vip">VIP</span> : null}
                  {room.is_long_stay ? (
                    <span className="hk-dash__tag hk-dash__tag--long">장박</span>
                  ) : null}
                  {room.early_checkin ? (
                    <span className="hk-dash__tag hk-dash__tag--early">일찍 {room.early_checkin}</span>
                  ) : null}
                </div>
                {room.notes ? <p>{room.notes}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {previousDayNotes || nextDayNotes ? (
        <section className="hk-dash__section">
          <div className="hk-dash__section-head">
            <h3>전달 메모</h3>
          </div>
          <div className="hk-dash__notes">
            {previousDayNotes ? (
              <article>
                <h4>지난 날 특이사항</h4>
                <p>{previousDayNotes}</p>
              </article>
            ) : null}
            {nextDayNotes ? (
              <article>
                <h4>다음 날 특이사항</h4>
                <p>{nextDayNotes}</p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
