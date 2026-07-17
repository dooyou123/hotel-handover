'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { WORK_GROUPS, formatWorkGroupLabel, type WorkGroupCode } from '@/lib/constants';
import { emptyGroupSchedule, normalizeScheduleGroup } from '@/lib/schedule/group-utils';
import type { ScheduleEntry } from '@/lib/schedule/parse-csv';
import type { ScheduleEntryInput } from '@/lib/schedule/use-schedule';

type ScheduleEntryModalProps = {
  open: boolean;
  entry: ScheduleEntry | null;
  staffNames: string[];
  /** 해당 날짜에 이미 등록된 근무 (추가 시 조별 표시) */
  dayEntries?: ScheduleEntry[];
  defaultDate?: string;
  defaultShift?: string;
  onClose: () => void;
  onSave: (input: ScheduleEntryInput | ScheduleEntryInput[], id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

function emptySelection(): Record<WorkGroupCode, string[]> {
  return emptyGroupSchedule();
}

function resolveGroup(value: string | undefined): WorkGroupCode {
  return normalizeScheduleGroup(value ?? '') ?? WORK_GROUPS[0];
}

export function ScheduleEntryModal({
  open,
  entry,
  staffNames,
  dayEntries = [],
  defaultDate,
  defaultShift,
  onClose,
  onSave,
  onDelete,
}: ScheduleEntryModalProps) {
  const { confirm } = useConfirmDialog();
  const isEdit = Boolean(entry);
  const [workDate, setWorkDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [activeGroup, setActiveGroup] = useState<WorkGroupCode>(WORK_GROUPS[0]);
  const [staffName, setStaffName] = useState('');
  const [selection, setSelection] = useState<Record<WorkGroupCode, string[]>>(emptySelection);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const occupiedByGroup = useMemo(() => {
    const map = emptyGroupSchedule();
    for (const row of dayEntries) {
      const group = normalizeScheduleGroup(row.shift);
      if (group) map[group].push(row.staff_name);
    }
    return map;
  }, [dayEntries]);

  const occupiedAll = useMemo(() => {
    const set = new Set<string>();
    for (const names of Object.values(occupiedByGroup)) {
      for (const name of names) set.add(name);
    }
    return set;
  }, [occupiedByGroup]);

  const selectedCount = useMemo(
    () => WORK_GROUPS.reduce((sum, group) => sum + selection[group].length, 0),
    [selection],
  );

  const selectedSummary = useMemo(
    () =>
      WORK_GROUPS.filter((group) => selection[group].length > 0)
        .map((group) => `${formatWorkGroupLabel(group)} ${selection[group].length}명`)
        .join(' · '),
    [selection],
  );

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setWorkDate(entry.work_date);
      setActiveGroup(resolveGroup(entry.shift));
      setStaffName(entry.staff_name);
      setSelection(emptySelection());
    } else {
      setWorkDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setActiveGroup(resolveGroup(defaultShift));
      setStaffName('');
      setSelection(emptySelection());
    }
    setError(null);
  }, [open, entry, defaultDate, defaultShift]);

  if (!open) return null;

  function staffGroupInSelection(name: string): WorkGroupCode | null {
    for (const group of WORK_GROUPS) {
      if (selection[group].includes(name)) return group;
    }
    return null;
  }

  function toggleStaffForActiveGroup(name: string) {
    if (occupiedAll.has(name)) return;
    setSelection((prev) => {
      const next = emptySelection();
      for (const group of WORK_GROUPS) {
        next[group] = prev[group].filter((item) => item !== name);
      }
      if (!prev[activeGroup].includes(name)) {
        next[activeGroup] = [...next[activeGroup], name];
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (entry) {
      if (!staffName.trim()) {
        setError('직원을 선택해 주세요.');
        return;
      }
    } else if (selectedCount === 0) {
      setError('조를 고른 뒤 직원을 한 명 이상 선택해 주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (entry) {
        await onSave(
          { work_date: workDate, shift: activeGroup, staff_name: staffName.trim() },
          entry.id,
        );
      } else {
        const rows: ScheduleEntryInput[] = [];
        for (const group of WORK_GROUPS) {
          for (const name of selection[group]) {
            rows.push({ work_date: workDate, shift: group, staff_name: name });
          }
        }
        await onSave(rows);
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--schedule-entry" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className="modal__form">
          <div className="modal__header">
            <h2>{isEdit ? '근무 일정 수정' : '근무 일정 추가'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="schedule-entry-modal">
            <label className="field schedule-entry-modal__date">
              <span>날짜 *</span>
              <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </label>

            <div className="schedule-entry-modal__section">
              <p className="schedule-entry-modal__label">근무조 *</p>
              <div className="schedule-entry-modal__groups" role="tablist" aria-label="근무조">
                {WORK_GROUPS.map((group) => {
                  const picked = selection[group].length;
                  const occupied = occupiedByGroup[group].length;
                  const active = activeGroup === group;
                  return (
                    <button
                      key={group}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={[
                        'schedule-entry-modal__group',
                        active ? 'is-active' : '',
                        picked || occupied ? 'has-people' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setActiveGroup(group)}
                    >
                      <strong>{formatWorkGroupLabel(group)}</strong>
                      <span>
                        {isEdit
                          ? active
                            ? '선택됨'
                            : ''
                          : picked
                            ? `+${picked}`
                            : occupied
                              ? `${occupied}명`
                              : '비움'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="schedule-entry-modal__section">
              <p className="schedule-entry-modal__label">
                {isEdit
                  ? `${formatWorkGroupLabel(activeGroup)} 직원 *`
                  : `${formatWorkGroupLabel(activeGroup)}에 넣을 직원 * · 눌러서 선택`}
              </p>

              {occupiedByGroup[activeGroup].length > 0 && !isEdit ? (
                <p className="schedule-entry-modal__occupied">
                  이미 등록: {occupiedByGroup[activeGroup].join(', ')}
                </p>
              ) : null}

              {staffNames.length ? (
                <div className="schedule-entry-modal__chips" role="group" aria-label="직원 선택">
                  {staffNames.map((name) => {
                    if (isEdit) {
                      const selected = staffName === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          className={`schedule-entry-modal__chip${selected ? ' is-selected' : ''}`}
                          onClick={() => setStaffName(name)}
                        >
                          {name}
                        </button>
                      );
                    }

                    const occupied = occupiedAll.has(name);
                    const inGroup = staffGroupInSelection(name);
                    const selectedHere = inGroup === activeGroup;
                    const selectedElsewhere = inGroup != null && inGroup !== activeGroup;

                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={occupied}
                        className={[
                          'schedule-entry-modal__chip',
                          selectedHere ? 'is-selected' : '',
                          selectedElsewhere ? 'is-other' : '',
                          occupied ? 'is-occupied' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => toggleStaffForActiveGroup(name)}
                        title={
                          occupied
                            ? '이미 등록된 직원'
                            : selectedElsewhere
                              ? `${formatWorkGroupLabel(inGroup)} → ${formatWorkGroupLabel(activeGroup)}로 이동`
                              : undefined
                        }
                      >
                        {name}
                        {selectedElsewhere ? (
                          <em>{formatWorkGroupLabel(inGroup)}</em>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="schedule-entry-modal__empty">
                  등록된 직원이 없습니다. 설정에서 직원을 추가해 주세요.
                </p>
              )}

              {!isEdit && selectedCount > 0 ? (
                <p className="schedule-entry-modal__count">{selectedSummary}</p>
              ) : null}
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal__footer">
            {entry && onDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={async () => {
                  if (!entry) return;
                  const ok = await confirm({
                    title: '근무 일정 삭제',
                    message: `${entry.work_date} ${formatWorkGroupLabel(normalizeScheduleGroup(entry.shift) ?? entry.shift)} · ${entry.staff_name} 근무를 삭제할까요?`,
                    confirmLabel: '삭제',
                    tone: 'danger',
                  });
                  if (!ok) return;
                  await onDelete(entry.id);
                  onClose();
                }}
              >
                삭제
              </button>
            ) : (
              <span />
            )}
            <div className="modal__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving
                  ? '저장 중…'
                  : isEdit
                    ? '저장'
                    : selectedCount > 0
                      ? `${selectedCount}명 추가`
                      : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
