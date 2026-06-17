'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  fetchBedRoomBaseline,
  filterBedRoomsToSave,
  getEffectiveBedType,
  isBedRoomChangedToday,
  type BedTypeSource,
} from '@/lib/housekeeping/baseline';
import { fetchRoomBedState } from '@/lib/housekeeping/room-state';
import { fetchHousekeepingReport, saveHousekeepingReport } from '@/lib/housekeeping/api';
import { openHousekeepingPrintWindow } from '@/lib/housekeeping/print';
import {
  HK_BED_SUFFIXES,
  HK_FLOORS_DESC,
  formatHkRoomNumber,
  isHkBedRoomTarget,
  type HkBedSuffix,
} from '@/lib/housekeeping/rooms';
import {
  EMPTY_HK_STATUS_NOTES,
  HK_BED_TYPES,
  HK_EXTRA_BED_ACTIONS,
  HK_GUEST_STATUSES,
  buildDefaultBedRooms,
  isOccupiedGuestStatus,
  emptySpecialRoom,
  mapSpecialRoomsFromSaved,
  mapStatusNotesFromReport,
  mergeBedRoomsFromSaved,
  type HousekeepingBedDraft,
  type HousekeepingReport,
  type HousekeepingSpecialDraft,
  type HkBedType,
  type HkExtraBedAction,
  type HkGuestStatus,
  type HkStatusNotes,
  type SaveHousekeepingInput,
} from '@/lib/housekeeping/types';
import { todayDateString } from '@/lib/handover/shift-summary';
import { readWorkSession, useWorkSession } from '@/lib/handover/use-work-session';
import {
  cardInputFromHkSpecialRoom,
  cardInputFromHkStatusNote,
  stashHkHandoverDraft,
} from '@/lib/housekeeping/handover-draft';
import type { HkStatusNoteKey } from '@/lib/housekeeping/types';
import { HkBedTypeBadge } from '@/components/housekeeping/hk-bed-type-badge';
import { HkChangedRoomCard } from '@/components/housekeeping/hk-changed-room-card';
import { HkInHousePanel } from '@/components/housekeeping/hk-in-house-panel';
import { HkReportDashboard } from '@/components/housekeeping/hk-report-dashboard';
import { HkStatusNotesFields } from '@/components/housekeeping/hk-status-notes-fields';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

function formatDateLabel(workDate: string): string {
  const date = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return workDate;
  return date.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}

function shiftDate(workDate: string, deltaDays: number): string {
  const date = new Date(`${workDate}T00:00:00`);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

type FormState = Omit<SaveHousekeepingInput, 'author' | 'staff_name' | 'shift'>;

function buildEmptyForm(workDate: string): FormState {
  return {
    work_date: workDate,
    previous_day_notes: '',
    next_day_notes: '',
    statusNotes: { ...EMPTY_HK_STATUS_NOTES },
    bedRooms: buildDefaultBedRooms(),
    specialRooms: [emptySpecialRoom(0)],
  };
}

function findBedRoomIndex(rooms: HousekeepingBedDraft[], floor: number, suffix: HkBedSuffix): number {
  const roomNumber = formatHkRoomNumber(floor, suffix);
  return rooms.findIndex((room) => room.room_number === roomNumber);
}

function inferExtraBedOnTypeChange(prevType: HkBedType, nextType: HkBedType): HkExtraBedAction | undefined {
  if (prevType === 'twin' && nextType === 'triple') return 'add';
  if (prevType === 'triple' && nextType === 'twin') return 'remove';
  return undefined;
}

function applyBedRoomPatch(
  room: HousekeepingBedDraft,
  patch: Partial<HousekeepingBedDraft>,
): HousekeepingBedDraft {
  const merged = { ...patch };
  const typeChanged = patch.room_type !== undefined && patch.room_type !== room.room_type;
  const ebChanged =
    patch.extra_bed_action !== undefined && patch.extra_bed_action !== room.extra_bed_action;

  if (typeChanged) {
    const autoAction = inferExtraBedOnTypeChange(room.room_type, patch.room_type as HkBedType);
    if (autoAction !== undefined && patch.extra_bed_action === undefined) {
      merged.extra_bed_action = autoAction;
    }
  }

  const nextType = patch.room_type !== undefined ? patch.room_type : room.room_type;
  const nextEb =
    merged.extra_bed_action !== undefined ? merged.extra_bed_action : room.extra_bed_action;

  if (typeChanged || ebChanged) {
    merged.bed_type_changed_at = new Date().toISOString();
  } else if (nextType === '' && nextEb === '') {
    merged.bed_type_changed_at = null;
  }

  return { ...room, ...merged };
}

function sortBedRoomsByNumber(a: HousekeepingBedDraft, b: HousekeepingBedDraft): number {
  return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
}

export function HousekeepingPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authorLabel, requireSession } = useWorkSession();
  const { confirm } = useConfirmDialog();
  const [workDate, setWorkDate] = useState(() => todayDateString());
  const [form, setForm] = useState<FormState>(() => buildEmptyForm(todayDateString()));
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(true);
  const [hkView, setHkView] = useState(true);
  const [draftRoomNumbers, setDraftRoomNumbers] = useState<Set<string>>(() => new Set());
  const [roomPicker, setRoomPicker] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['housekeeping-report', DEFAULT_HOTEL_ID, workDate],
    queryFn: () => fetchHousekeepingReport(workDate),
  });

  const { data: baseline = {} } = useQuery({
    queryKey: ['housekeeping-baseline', DEFAULT_HOTEL_ID, workDate],
    queryFn: () => fetchBedRoomBaseline(workDate),
  });

  const { data: roomState = {} } = useQuery({
    queryKey: ['housekeeping-room-bed-state', DEFAULT_HOTEL_ID],
    queryFn: () => fetchRoomBedState(),
  });

  const bedTypeSource = useMemo<BedTypeSource>(
    () => ({ baseline, roomState }),
    [baseline, roomState],
  );

  useEffect(() => {
    if (!data || dirty) return;
    const report = data.report;
    const allRooms = [...data.bedRooms, ...data.specialRooms];
    setForm({
      work_date: workDate,
      previous_day_notes: report?.previous_day_notes ?? '',
      next_day_notes: report?.next_day_notes ?? '',
      statusNotes: mapStatusNotesFromReport(report),
      bedRooms: allRooms.length ? mergeBedRoomsFromSaved(allRooms) : buildDefaultBedRooms(),
      specialRooms: mapSpecialRoomsFromSaved(allRooms),
    });
  }, [data, workDate, dirty]);

  const saveMutation = useMutation({
    mutationFn: (input: SaveHousekeepingInput) => saveHousekeepingReport(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(['housekeeping-report', DEFAULT_HOTEL_ID, workDate], saved);
      void queryClient.invalidateQueries({ queryKey: ['housekeeping-room-bed-state', DEFAULT_HOTEL_ID] });
      setDirty(false);
      showToast('하우스키핑 리포트가 저장되었습니다.');
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    },
  });

  const extraBedChangeCount = useMemo(
    () =>
      form.bedRooms.filter(
        (room) => room.extra_bed_action === 'add' || room.extra_bed_action === 'remove',
      ).length,
    [form.bedRooms],
  );

  const changedBedRooms = useMemo(
    () =>
      form.bedRooms
        .filter(
          (room) =>
            isBedRoomChangedToday(room, bedTypeSource) ||
            draftRoomNumbers.has(room.room_number) ||
            Boolean(room.guest_status),
        )
        .sort(sortBedRoomsByNumber),
    [form.bedRooms, draftRoomNumbers, bedTypeSource],
  );

  const addableBedRooms = useMemo(() => {
    const visible = new Set(changedBedRooms.map((room) => room.room_number));
    return form.bedRooms.filter((room) => !visible.has(room.room_number)).sort(sortBedRoomsByNumber);
  }, [form.bedRooms, changedBedRooms]);

  const bedChangeSummary = useMemo(() => {
    const changedCount = form.bedRooms.filter((room) =>
      isBedRoomChangedToday(room, bedTypeSource),
    ).length;
    const tripleCount = form.bedRooms.filter(
      (room) => getEffectiveBedType(room, bedTypeSource) === 'triple',
    ).length;
    const twinCount = form.bedRooms.filter(
      (room) => getEffectiveBedType(room, bedTypeSource) === 'twin',
    ).length;
    const ebAddCount = form.bedRooms.filter((room) => room.extra_bed_action === 'add').length;
    const ebRemoveCount = form.bedRooms.filter((room) => room.extra_bed_action === 'remove').length;
    const inHouseRooms = form.bedRooms.filter((room) => isOccupiedGuestStatus(room.guest_status));
    const inHouseCount = inHouseRooms.length;
    const inHouseUnsetCount = inHouseRooms.filter(
      (room) => !getEffectiveBedType(room, bedTypeSource),
    ).length;
    return {
      changedCount,
      tripleCount,
      twinCount,
      ebAddCount,
      ebRemoveCount,
      inHouseCount,
      inHouseUnsetCount,
    };
  }, [form.bedRooms, bedTypeSource]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openHandoverDraft(input: ReturnType<typeof cardInputFromHkStatusNote>) {
    if (!requireSession('인수인계 등록')) return;
    stashHkHandoverDraft(input);
    router.push('/handover?newFromHk=1');
  }

  function handleCreateHandoverFromStatusNote(key: HkStatusNoteKey) {
    const text = form.statusNotes[key];
    if (!text.trim()) return;
    openHandoverDraft(cardInputFromHkStatusNote(key, text, authorLabel));
  }

  function handleCreateHandoverFromSpecialRoom(index: number) {
    const room = form.specialRooms[index];
    if (!room?.room_number.trim()) {
      showToast('객실 번호를 입력해 주세요.');
      return;
    }
    openHandoverDraft(cardInputFromHkSpecialRoom(room, authorLabel));
  }

  function updateForm(patch: Partial<FormState>) {
    setDirty(true);
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchBedRoomAtIndex(
    rooms: HousekeepingBedDraft[],
    index: number,
    patch: Partial<HousekeepingBedDraft>,
  ): HousekeepingBedDraft[] {
    if (index < 0 || index >= rooms.length) return rooms;
    return rooms.map((room, i) => (i === index ? applyBedRoomPatch(room, patch) : room));
  }

  function updateBedRoom(floor: number, suffix: HkBedSuffix, patch: Partial<HousekeepingBedDraft>) {
    setDirty(true);
    setForm((prev) => {
      const index = findBedRoomIndex(prev.bedRooms, floor, suffix);
      return { ...prev, bedRooms: patchBedRoomAtIndex(prev.bedRooms, index, patch) };
    });
  }

  function updateBedRoomByNumber(roomNumber: string, patch: Partial<HousekeepingBedDraft>) {
    setDirty(true);
    setForm((prev) => {
      const index = prev.bedRooms.findIndex((room) => room.room_number === roomNumber);
      return { ...prev, bedRooms: patchBedRoomAtIndex(prev.bedRooms, index, patch) };
    });
  }

  function addRoomToEdit(roomNumber: string) {
    if (!roomNumber) return;
    setDraftRoomNumbers((prev) => new Set(prev).add(roomNumber));
    setRoomPicker('');
  }

  function clearBedRoom(roomNumber: string) {
    updateBedRoomByNumber(roomNumber, { room_type: '', extra_bed_action: '', bed_type_changed_at: null });
    setDraftRoomNumbers((prev) => {
      const next = new Set(prev);
      next.delete(roomNumber);
      return next;
    });
  }

  function updateSpecialRoom(index: number, patch: Partial<HousekeepingSpecialDraft>) {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      specialRooms: prev.specialRooms.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    }));
  }

  function addSpecialRoom() {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      specialRooms: [...prev.specialRooms, emptySpecialRoom(prev.specialRooms.length)],
    }));
  }

  function removeSpecialRoom(index: number) {
    setDirty(true);
    setForm((prev) => {
      const next = prev.specialRooms.filter((_, i) => i !== index);
      return { ...prev, specialRooms: next.length ? next : [emptySpecialRoom(0)] };
    });
  }

  async function handleDateChange(nextDate: string) {
    if (nextDate === workDate) return;
    if (dirty) {
      const ok = await confirm({
        title: '날짜 변경',
        message: '저장하지 않은 변경이 있습니다. 날짜를 바꾸시겠습니까?',
        confirmLabel: '변경',
      });
      if (!ok) return;
    }
    setDirty(false);
    setWorkDate(nextDate);
    setForm(buildEmptyForm(nextDate));
    setDraftRoomNumbers(new Set());
    setRoomPicker('');
  }

  async function handleSave() {
    if (!requireSession('저장')) return;
    const session = readWorkSession();
    await saveMutation.mutateAsync({
      ...form,
      work_date: workDate,
      author: authorLabel,
      staff_name: session.name || '',
      shift: session.shift || '',
      bedRooms: filterBedRoomsToSave(
        form.bedRooms.map((room, index) => ({ ...room, sort_order: index })),
        bedTypeSource,
      ),
      specialRooms: form.specialRooms.map((room, index) => ({ ...room, sort_order: index })),
      bedTypeContext: bedTypeSource,
    });
  }

  function updateStatusNotes(next: HkStatusNotes) {
    updateForm({ statusNotes: next });
  }

  function buildPrintReport(): HousekeepingReport {
    const base = data?.report;
    return {
      id: base?.id ?? '',
      hotel_id: base?.hotel_id ?? DEFAULT_HOTEL_ID,
      work_date: workDate,
      previous_day_notes: form.previous_day_notes,
      next_day_notes: form.next_day_notes,
      ...form.statusNotes,
      author: base?.author ?? authorLabel,
      staff_name: base?.staff_name ?? '',
      shift: base?.shift ?? '',
      created_at: base?.created_at ?? '',
      updated_at: base?.updated_at ?? '',
    };
  }

  function handlePrint() {
    const report = buildPrintReport();

    const ok = openHousekeepingPrintWindow(
      report,
      form.bedRooms,
      form.specialRooms,
      workDate,
      authorLabel,
      bedTypeSource,
    );
    if (!ok) showToast('보기 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.');
  }

  async function copyFromPreviousDay() {
    const prevDate = shiftDate(workDate, -1);
    try {
      const prev = await fetchHousekeepingReport(prevDate);
      const prevAllRooms = [...prev.bedRooms, ...prev.specialRooms];
      if (!prev.report && !prevAllRooms.length) {
        showToast(`${formatDateLabel(prevDate)} 리포트가 없습니다.`);
        return;
      }

      const prevBedByRoom = new Map(prev.bedRooms.map((room) => [room.room_number, room]));

      setDirty(true);
      setForm((current) => ({
        ...current,
        previous_day_notes:
          prev.report?.next_day_notes || prev.report?.previous_day_notes || current.previous_day_notes,
        bedRooms: current.bedRooms.map((room) => {
          const previous = prevBedByRoom.get(room.room_number);
          if (!previous) return { ...room, extra_bed_action: '' as HkExtraBedAction };
          return {
            ...room,
            room_type: (previous.room_type as HkBedType) || '',
            guest_status: (previous.guest_status as HkGuestStatus) || '',
            extra_bed_action: '' as HkExtraBedAction,
          };
        }),
        specialRooms: mapSpecialRoomsFromSaved(prev.specialRooms),
      }));
      showToast(`${formatDateLabel(prevDate)} 베드 설정을 불러왔습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '이전 날짜를 불러오지 못했습니다.');
    }
  }

  const findBedRoomIndexForFloor = useCallback(
    (floor: number, suffix: HkBedSuffix) => findBedRoomIndex(form.bedRooms, floor, suffix),
    [form.bedRooms],
  );

  return (
    <>
      <section className={`housekeeping-page${hkView ? ' housekeeping-page--hk' : ''}`}>
        {hkView ? (
          <div className="housekeeping-page__toolbar">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => setHkView(false)}
            >
              편집 모드
            </button>
            <div className="housekeeping-date-nav">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(shiftDate(workDate, -1))}
              >
                ◀
              </button>
              <input
                type="date"
                value={workDate}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label="리포트 날짜"
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(shiftDate(workDate, 1))}
              >
                ▶
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(todayDateString())}
              >
                오늘
              </button>
            </div>
            <button type="button" className="btn btn--ghost" onClick={handlePrint}>
              전달용 인쇄
            </button>
          </div>
        ) : (
          <div className="housekeeping-page__header">
            <div>
              <h2>하우스키핑 리포트</h2>
              <p>4~13층 02·10·16호 트윈/트리플·엑스트라베드와 VIP·장박·일찍 체크인 객실을 입력합니다.</p>
            </div>
            <div className="housekeeping-page__actions">
              <button type="button" className="btn btn--primary" onClick={() => setHkView(true)}>
                HK 보기
              </button>
              <button type="button" className="btn btn--ghost" onClick={copyFromPreviousDay}>
                전날 불러오기
              </button>
              <button type="button" className="btn btn--ghost" onClick={handlePrint}>
                전달용 인쇄
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        )}

        {hkView ? (
          isLoading || isFetching ? (
            <p className="empty-state">불러오는 중…</p>
          ) : (
            <HkReportDashboard
              workDateLabel={formatDateLabel(workDate)}
              bedRooms={form.bedRooms}
              specialRooms={form.specialRooms}
              bedTypeSource={bedTypeSource}
              previousDayNotes={form.previous_day_notes}
              nextDayNotes={form.next_day_notes}
              statusNotes={form.statusNotes}
              onCreateHandoverFromStatusNote={handleCreateHandoverFromStatusNote}
              summary={bedChangeSummary}
              findBedRoomIndex={findBedRoomIndexForFloor}
            />
          )
        ) : (
          <>
        <article className="schedule-panel housekeeping-panel">
          <div className="schedule-panel__header schedule-panel__header--split">
            <div>
              <h3>리포트 날짜</h3>
              <p>
                {formatDateLabel(workDate)} · 엑스트라베드 작업 {extraBedChangeCount}건
              </p>
            </div>
            <div className="housekeeping-date-nav">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(shiftDate(workDate, -1))}
              >
                ◀
              </button>
              <input
                type="date"
                value={workDate}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label="리포트 날짜"
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(shiftDate(workDate, 1))}
              >
                ▶
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => handleDateChange(todayDateString())}
              >
                오늘
              </button>
            </div>
          </div>

          <div className="housekeeping-assign form-grid">
            <label className="field field--full">
              <span>지난 날 특이사항 (전체)</span>
              <textarea
                rows={2}
                value={form.previous_day_notes}
                onChange={(e) => updateForm({ previous_day_notes: e.target.value })}
                placeholder="어제 미완료·특이 공지"
              />
            </label>
            <label className="field field--full">
              <span>다음 날 전체 특이사항</span>
              <textarea
                rows={2}
                value={form.next_day_notes}
                onChange={(e) => updateForm({ next_day_notes: e.target.value })}
                placeholder="내일 단체·행사 등"
              />
            </label>
          </div>
        </article>

        <article className="schedule-panel housekeeping-panel">
          <div className="schedule-panel__header">
            <div>
              <h3>객실 상태 · 전달</h3>
              <p>H/U · Comp · VIP/선정비 · O.O · 장기 숙박 · 정비 유의 · 퇴근 후 DELIVERY · 기타</p>
            </div>
          </div>
          <HkStatusNotesFields
            value={form.statusNotes}
            onChange={updateStatusNotes}
            onCreateHandover={handleCreateHandoverFromStatusNote}
          />
        </article>

        <article className="schedule-panel housekeeping-panel">
          <div className="schedule-panel__header schedule-panel__header--split">
            <div>
              <h3>트윈 · 트리플 · 엑스트라베드</h3>
              <p>
                재실·도착 객실에 투숙 상태를 지정하면 침대 구성(트윈/트리플)을 한눈에 확인할 수 있습니다.
                트윈↔트리플 변경 시 엑스트라베드 넣음/뺌이 자동으로 채워집니다.
              </p>
            </div>
            <label className="field field--checkbox housekeeping-bed-toggle">
              <input
                type="checkbox"
                checked={!showAllRooms}
                onChange={(e) => setShowAllRooms(!e.target.checked)}
              />
              <span>변경 객실만</span>
            </label>
          </div>

          {!isLoading && !isFetching ? (
            <>
            <HkInHousePanel
              bedRooms={form.bedRooms}
              bedTypeSource={bedTypeSource}
              onGuestStatusChange={(roomNumber, status) =>
                updateBedRoomByNumber(roomNumber, { guest_status: status })
              }
            />
            <div className="housekeeping-bed-toolbar">
              <label className="field housekeeping-bed-add">
                <span>객실 추가</span>
                <select
                  value={roomPicker}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) addRoomToEdit(value);
                    else setRoomPicker('');
                  }}
                  disabled={!addableBedRooms.length}
                >
                  <option value="">+ 객실 추가</option>
                  {addableBedRooms.map((room) => (
                    <option key={room.room_number} value={room.room_number}>
                      {room.room_number}
                    </option>
                  ))}
                </select>
              </label>
              <div className="housekeeping-summary-chips" aria-label="객실 요약">
                <span className="housekeeping-summary-chip housekeeping-summary-chip--twin">
                  트윈 <strong>{bedChangeSummary.twinCount}</strong>
                </span>
                <span className="housekeeping-summary-chip housekeeping-summary-chip--triple">
                  트리플 <strong>{bedChangeSummary.tripleCount}</strong>
                </span>
                <span className="housekeeping-summary-chip">
                  오늘 변경 <strong>{bedChangeSummary.changedCount}</strong>건
                </span>
                {bedChangeSummary.ebAddCount > 0 ? (
                  <span className="housekeeping-summary-chip housekeeping-summary-chip--add">
                    EB 넣음 <strong>{bedChangeSummary.ebAddCount}</strong>
                  </span>
                ) : null}
                {bedChangeSummary.ebRemoveCount > 0 ? (
                  <span className="housekeeping-summary-chip housekeeping-summary-chip--remove">
                    EB 뺌 <strong>{bedChangeSummary.ebRemoveCount}</strong>
                  </span>
                ) : null}
              </div>
            </div>
            </>
          ) : null}

          {isLoading || isFetching ? (
            <p className="empty-state">불러오는 중…</p>
          ) : !showAllRooms ? (
            changedBedRooms.length ? (
              <div className="housekeeping-changed-grid">
                {changedBedRooms.map((room) => (
                  <HkChangedRoomCard
                    key={room.room_number}
                    room={room}
                    effectiveType={getEffectiveBedType(room, bedTypeSource)}
                    onTypeChange={(value) =>
                      updateBedRoomByNumber(room.room_number, { room_type: value })
                    }
                    onEbChange={(value) =>
                      updateBedRoomByNumber(room.room_number, { extra_bed_action: value })
                    }
                    onGuestStatusChange={(value) =>
                      updateBedRoomByNumber(room.room_number, { guest_status: value })
                    }
                    onClear={() => clearBedRoom(room.room_number)}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">
                변경된 객실이 없습니다. 위에서 객실을 추가하거나 「변경 객실만」을 끄면 전체 그리드가
                보입니다.
              </p>
            )
          ) : (
            <div className="housekeeping-bed-grid-wrap">
              <table className="housekeeping-bed-grid">
                <thead>
                  <tr>
                    <th>층</th>
                    {HK_BED_SUFFIXES.map((suffix) => (
                      <th key={suffix}>{suffix}호</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HK_FLOORS_DESC.map((floor) => (
                    <tr key={floor}>
                      <th>{floor}층</th>
                      {HK_BED_SUFFIXES.map((suffix) => {
                        const roomNumber = formatHkRoomNumber(floor, suffix);
                        if (!isHkBedRoomTarget(roomNumber)) {
                          return (
                            <td key={suffix} className="housekeeping-bed-cell housekeeping-bed-cell--na">
                              해당없음
                            </td>
                          );
                        }

                        const index = findBedRoomIndex(form.bedRooms, floor, suffix);
                        const room = index >= 0 ? form.bedRooms[index] : null;
                        if (!room) return <td key={suffix}>—</td>;

                        const effectiveType = getEffectiveBedType(room, bedTypeSource);
                        const changedToday = isBedRoomChangedToday(room, bedTypeSource);

                        return (
                          <td
                            key={suffix}
                            className={`housekeeping-bed-cell${
                              effectiveType === 'twin'
                                ? ' housekeeping-bed-cell--twin'
                                : effectiveType === 'triple'
                                  ? ' housekeeping-bed-cell--triple'
                                  : ''
                            }${changedToday ? ' housekeeping-bed-cell--changed' : ''}`}
                          >
                            <span className="housekeeping-bed-cell__room">{room.room_number}</span>
                            <HkBedTypeBadge type={effectiveType} size="md" />
                            <select
                              className="housekeeping-table__select housekeeping-table__select--guest"
                              value={room.guest_status}
                              onChange={(e) =>
                                updateBedRoom(floor, suffix, {
                                  guest_status: e.target.value as HkGuestStatus,
                                })
                              }
                              aria-label={`${room.room_number} 투숙 상태`}
                            >
                              {HK_GUEST_STATUSES.map((item) => (
                                <option key={item.value || 'none'} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <select
                              className="housekeeping-table__select"
                              value={room.room_type}
                              onChange={(e) =>
                                updateBedRoom(floor, suffix, {
                                  room_type: e.target.value as HkBedType,
                                })
                              }
                              aria-label={`${room.room_number} 오늘 베드 타입 변경`}
                            >
                              {HK_BED_TYPES.map((item) => (
                                <option key={item.value || 'none'} value={item.value}>
                                  {item.value ? `오늘 → ${item.label}` : '오늘 변경 없음'}
                                </option>
                              ))}
                            </select>
                            <select
                              className={`housekeeping-table__select housekeeping-table__select--action${
                                room.extra_bed_action === 'add'
                                  ? ' is-add'
                                  : room.extra_bed_action === 'remove'
                                    ? ' is-remove'
                                    : ''
                              }`}
                              value={room.extra_bed_action}
                              onChange={(e) =>
                                updateBedRoom(floor, suffix, {
                                  extra_bed_action: e.target.value as HkExtraBedAction,
                                })
                              }
                              aria-label={`${room.room_number} 엑스트라베드`}
                            >
                              {HK_EXTRA_BED_ACTIONS.map((item) => (
                                <option key={item.value || 'none'} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="schedule-panel housekeeping-panel">
          <div className="schedule-panel__header schedule-panel__header--split">
            <div>
              <h3>특이 객실</h3>
              <p>일찍 체크인, VIP, 장박 등 하우스키핑에 알릴 객실을 추가하세요.</p>
            </div>
            <button type="button" className="btn btn--ghost btn--small" onClick={addSpecialRoom}>
              + 객실 추가
            </button>
          </div>

          <div className="housekeeping-table-wrap">
            <table className="housekeeping-table housekeeping-table--special">
              <thead>
                <tr>
                  <th>객실</th>
                  <th>일찍 체크인</th>
                  <th>VIP</th>
                  <th>장박</th>
                  <th>비고</th>
                  <th aria-label="인수인계" />
                  <th aria-label="삭제" />
                </tr>
              </thead>
              <tbody>
                {form.specialRooms.map((room, index) => (
                  <tr key={room.id ?? `special-${index}`}>
                    <td>
                      <input
                        className="housekeeping-table__input"
                        value={room.room_number}
                        onChange={(e) => updateSpecialRoom(index, { room_number: e.target.value })}
                        placeholder="501"
                      />
                    </td>
                    <td>
                      <input
                        className="housekeeping-table__input"
                        value={room.early_checkin}
                        onChange={(e) => updateSpecialRoom(index, { early_checkin: e.target.value })}
                        placeholder="12:00"
                      />
                    </td>
                    <td className="housekeeping-table__check">
                      <label className="field field--checkbox">
                        <input
                          type="checkbox"
                          checked={room.is_vip}
                          onChange={(e) => updateSpecialRoom(index, { is_vip: e.target.checked })}
                        />
                        <span>VIP</span>
                      </label>
                    </td>
                    <td className="housekeeping-table__check">
                      <label className="field field--checkbox">
                        <input
                          type="checkbox"
                          checked={room.is_long_stay}
                          onChange={(e) => updateSpecialRoom(index, { is_long_stay: e.target.checked })}
                        />
                        <span>장박</span>
                      </label>
                    </td>
                    <td>
                      <input
                        className="housekeeping-table__input"
                        value={room.notes}
                        onChange={(e) => updateSpecialRoom(index, { notes: e.target.value })}
                        placeholder="특이사항"
                      />
                    </td>
                    <td className="housekeeping-table__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => handleCreateHandoverFromSpecialRoom(index)}
                        disabled={!room.room_number.trim()}
                      >
                        인수인계
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small btn--danger"
                        onClick={() => removeSpecialRoom(index)}
                        aria-label="특이 객실 삭제"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {dirty ? <p className="housekeeping-dirty-hint">저장되지 않은 변경이 있습니다.</p> : null}
          </>
        )}
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
