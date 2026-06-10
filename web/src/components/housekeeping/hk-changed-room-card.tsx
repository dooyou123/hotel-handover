import { HkBedTypeBadge, HkExtraBedBadge } from '@/components/housekeeping/hk-bed-type-badge';
import {
  formatBedTypeChangedAt,
  type HousekeepingBedDraft,
  type HkBedType,
  type HkExtraBedAction,
} from '@/lib/housekeeping/types';

type HkChangedRoomCardProps = {
  room: HousekeepingBedDraft;
  effectiveType: HkBedType;
  readOnly?: boolean;
  onTypeChange?: (value: HkBedType) => void;
  onEbChange?: (value: HkExtraBedAction) => void;
  onClear?: () => void;
};

export function HkChangedRoomCard({
  room,
  effectiveType,
  readOnly = false,
  onTypeChange,
  onEbChange,
  onClear,
}: HkChangedRoomCardProps) {
  const changedAtLabel = formatBedTypeChangedAt(room.bed_type_changed_at);

  return (
    <article className="hk-room-card">
      <div className="hk-room-card__head">
        <span className="hk-room-card__number">{room.room_number}</span>
        <HkBedTypeBadge type={effectiveType} size="lg" />
      </div>

      <div className="hk-room-card__body">
        {readOnly ? (
          <>
            <HkExtraBedBadge action={room.extra_bed_action} size="md" />
            {changedAtLabel ? (
              <p className="hk-room-card__changed-at" title={room.bed_type_changed_at ?? undefined}>
                변경 요청 {changedAtLabel}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <label className="hk-room-card__field">
              <span>오늘 타입 변경</span>
              <select
                className="housekeeping-table__select"
                value={room.room_type}
                onChange={(e) => onTypeChange?.(e.target.value as HkBedType)}
              >
                <option value="">변경 없음</option>
                <option value="twin">→ 트윈</option>
                <option value="triple">→ 트리플</option>
              </select>
            </label>
            <label className="hk-room-card__field">
              <span>엑스트라베드</span>
              <select
                className={`housekeeping-table__select housekeeping-table__select--action${
                  room.extra_bed_action === 'add'
                    ? ' is-add'
                    : room.extra_bed_action === 'remove'
                      ? ' is-remove'
                      : ''
                }`}
                value={room.extra_bed_action}
                onChange={(e) => onEbChange?.(e.target.value as HkExtraBedAction)}
              >
                <option value="">—</option>
                <option value="add">넣음</option>
                <option value="remove">뺌</option>
                <option value="keep">변경 없음</option>
              </select>
            </label>
          </>
        )}
      </div>

      {!readOnly && onClear ? (
        <button type="button" className="btn btn--ghost btn--xs hk-room-card__clear" onClick={onClear}>
          제거
        </button>
      ) : null}
    </article>
  );
}
