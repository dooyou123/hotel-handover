import { getEffectiveBedType, type BedTypeSource } from '@/lib/housekeeping/baseline';
import {
  HK_GUEST_STATUSES,
  isOccupiedGuestStatus,
  type HousekeepingBedDraft,
  type HkGuestStatus,
} from '@/lib/housekeeping/types';
import {
  HkBedTypeBadge,
  HkBedTypeLetter,
  HkGuestStatusBadge,
} from '@/components/housekeeping/hk-bed-type-badge';

type HkInHousePanelProps = {
  bedRooms: HousekeepingBedDraft[];
  bedTypeSource: BedTypeSource;
  readOnly?: boolean;
  onGuestStatusChange?: (roomNumber: string, status: HkGuestStatus) => void;
};

export function HkInHousePanel({
  bedRooms,
  bedTypeSource,
  readOnly = false,
  onGuestStatusChange,
}: HkInHousePanelProps) {
  const occupiedRooms = bedRooms
    .filter((room) => isOccupiedGuestStatus(room.guest_status))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  const unsetCount = occupiedRooms.filter(
    (room) => !getEffectiveBedType(room, bedTypeSource),
  ).length;

  return (
    <section className="hk-dash__section hk-dash__section--inhouse">
      <div className="hk-dash__section-head">
        <h3>재실 · 도착 객실 침대 구성</h3>
        <p>
          재실/도착로 표시한 객실의 현재 트윈·트리플 구성입니다.
          {unsetCount > 0 ? (
            <span className="hk-inhouse-alert">
              {' '}
              미설정 <strong>{unsetCount}</strong>실 — 구성을 확인해 주세요.
            </span>
          ) : null}
        </p>
      </div>

      {occupiedRooms.length ? (
        <div className="hk-inhouse-grid">
          {occupiedRooms.map((room) => {
            const effectiveType = getEffectiveBedType(room, bedTypeSource);
            const isUnset = !effectiveType;

            return (
              <article
                key={room.room_number}
                className={`hk-inhouse-card${isUnset ? ' hk-inhouse-card--alert' : ''}${
                  effectiveType === 'twin'
                    ? ' hk-inhouse-card--twin'
                    : effectiveType === 'triple'
                      ? ' hk-inhouse-card--triple'
                      : ''
                }`}
              >
                <div className="hk-inhouse-card__top">
                  <span className="hk-inhouse-card__room">{room.room_number}</span>
                  <HkGuestStatusBadge status={room.guest_status} size="md" />
                </div>
                <HkBedTypeLetter type={effectiveType} />
                <HkBedTypeBadge type={effectiveType} size="lg" />
                {!readOnly && onGuestStatusChange ? (
                  <label className="hk-inhouse-card__status">
                    <span>투숙 상태</span>
                    <select
                      className="housekeeping-table__select"
                      value={room.guest_status}
                      aria-label={`${room.room_number} 투숙 상태`}
                      onChange={(e) =>
                        onGuestStatusChange(room.room_number, e.target.value as HkGuestStatus)
                      }
                    >
                      {HK_GUEST_STATUSES.map((item) => (
                        <option key={item.value || 'none'} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="hk-dash__empty">
          재실·도착 객실이 없습니다. 편집 모드에서 객실에 투숙 상태(재실/도착)를 지정하면 여기에
          표시됩니다.
        </p>
      )}
    </section>
  );
}
