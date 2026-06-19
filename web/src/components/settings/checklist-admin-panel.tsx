'use client';

import { useMemo, useState } from 'react';
import {
  CHECKLIST_SCOPE_LABELS,
  CHECKLIST_SCOPES,
  type ChecklistScope,
} from '@/lib/constants';
import {
  createChecklistDefinition,
  deactivateChecklistDefinition,
  restoreChecklistDefinition,
  swapChecklistSortOrder,
  updateChecklistDefinition,
  type ChecklistItemDef,
} from '@/lib/settings/use-settings';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

function ChecklistLabelPreview({ label }: { label: string }) {
  const hintIndex = label.indexOf('\n[참고]');
  if (hintIndex < 0) {
    return <span className="checklist-admin-preview__text">{label}</span>;
  }
  return (
    <span className="checklist-admin-preview">
      <span className="checklist-admin-preview__text">{label.slice(0, hintIndex)}</span>
      <span className="checklist-admin-preview__hint">{label.slice(hintIndex + 1)}</span>
    </span>
  );
}

type ChecklistAdminPanelProps = {
  items: ChecklistItemDef[];
  inactiveItems: ChecklistItemDef[];
  onRefresh: () => void;
  onToast: (message: string) => void;
};

export function ChecklistAdminPanel({
  items,
  inactiveItems,
  onRefresh,
  onToast,
}: ChecklistAdminPanelProps) {
  const { confirm } = useConfirmDialog();
  const [activeScope, setActiveScope] = useState<ChecklistScope>('common');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingScope, setEditingScope] = useState<ChecklistScope>('common');
  const [busyId, setBusyId] = useState<string | null>(null);

  const scopeItems = useMemo(
    () =>
      items
        .filter((item) => item.work_group === activeScope)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items, activeScope],
  );

  const scopeCounts = useMemo(() => {
    const counts = Object.fromEntries(CHECKLIST_SCOPES.map((scope) => [scope, 0])) as Record<
      ChecklistScope,
      number
    >;
    items.forEach((item) => {
      const scope = item.work_group as ChecklistScope;
      if (scope in counts) counts[scope] += 1;
    });
    return counts;
  }, [items]);

  function cancelEdit() {
    setEditingId(null);
    setEditingLabel('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setBusyId('new');
    try {
      await createChecklistDefinition(label, activeScope);
      setNewLabel('');
      onRefresh();
      onToast(`${CHECKLIST_SCOPE_LABELS[activeScope]} 항목을 추가했습니다.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(item: ChecklistItemDef) {
    const label = editingLabel.trim();
    if (!label) return;
    setBusyId(item.id);
    try {
      const patch: { label: string; work_group?: string } = { label };
      if (editingScope !== item.work_group) {
        patch.work_group = editingScope;
      }
      await updateChecklistDefinition(item.id, patch);
      cancelEdit();
      onRefresh();
      onToast('항목을 수정했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: ChecklistItemDef) {
    const ok = await confirm({
      title: '체크 항목 삭제',
      message: `「${item.label.split('\n')[0]}」 항목을 삭제할까요?`,
      tone: 'danger',
      confirmLabel: '삭제',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await deactivateChecklistDefinition(item.id);
      if (editingId === item.id) cancelEdit();
      onRefresh();
      onToast('항목을 삭제했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(item: ChecklistItemDef, direction: 'up' | 'down', index: number) {
    const neighbor = direction === 'up' ? scopeItems[index - 1] : scopeItems[index + 1];
    if (!neighbor) return;
    setBusyId(item.id);
    try {
      await swapChecklistSortOrder(item.id, neighbor.id, item.sort_order, neighbor.sort_order);
      onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  const scopeHint =
    activeScope === 'common' ? '모든 조가 함께 확인하는 항목입니다.' : `${activeScope}조 근무자만 확인합니다.`;

  return (
    <article className="checklist-admin">
      <div className="checklist-admin__intro">
        <div>
          <h3>체크리스트 항목 관리</h3>
          <p>
            조별로 항목을 추가·수정·삭제합니다. 줄바꿈 후 <code>[참고]</code>를 넣으면 체크 화면에
            안내 문구가 표시됩니다.
          </p>
        </div>
        <span className="shift-stat">
          <strong>{items.length}</strong>개
        </span>
      </div>

      <div className="checklist-admin__scope-tabs" role="tablist" aria-label="체크리스트 구분">
        {CHECKLIST_SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            role="tab"
            aria-selected={activeScope === scope}
            className={`checklist-admin__scope-tab${activeScope === scope ? ' is-active' : ''}`}
            onClick={() => {
              setActiveScope(scope);
              cancelEdit();
              setNewLabel('');
            }}
          >
            {CHECKLIST_SCOPE_LABELS[scope]}
            <span className="checklist-admin__scope-count">{scopeCounts[scope]}</span>
          </button>
        ))}
      </div>

      <section className="checklist-admin__panel">
        <header className="checklist-admin__panel-head">
          <h4>{CHECKLIST_SCOPE_LABELS[activeScope]}</h4>
          <p>{scopeHint}</p>
        </header>

        <ul className="checklist-admin__list">
          {!scopeItems.length ? (
            <li className="checklist-admin__empty">이 구분에 등록된 항목이 없습니다.</li>
          ) : (
            scopeItems.map((item, index) => {
              const isEditing = editingId === item.id;
              return (
                <li
                  key={item.id}
                  className={`checklist-admin__item${isEditing ? ' is-editing' : ''}`}
                >
                  <span className="checklist-admin__order" aria-hidden>
                    {index + 1}
                  </span>
                  <div className="checklist-admin__body">
                    {isEditing ? (
                      <>
                        <textarea
                          className="checklist-admin__edit"
                          value={editingLabel}
                          rows={4}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          placeholder="체크 항목 내용"
                          aria-label="체크 항목 수정"
                        />
                        <label className="checklist-admin__move-scope">
                          <span>표시 구분</span>
                          <select
                            value={editingScope}
                            onChange={(e) => setEditingScope(e.target.value as ChecklistScope)}
                          >
                            {CHECKLIST_SCOPES.map((scope) => (
                              <option key={scope} value={scope}>
                                {CHECKLIST_SCOPE_LABELS[scope]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <ChecklistLabelPreview label={item.label} />
                    )}
                  </div>
                  <div className="checklist-admin__actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--primary btn--small"
                          disabled={!editingLabel.trim() || busyId === item.id}
                          onClick={() => void handleSaveEdit(item)}
                        >
                          저장
                        </button>
                        <button type="button" className="btn btn--ghost btn--small" onClick={cancelEdit}>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          title="위로"
                          disabled={index === 0 || busyId === item.id}
                          onClick={() => void handleMove(item, 'up', index)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          title="아래로"
                          disabled={index === scopeItems.length - 1 || busyId === item.id}
                          onClick={() => void handleMove(item, 'down', index)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingLabel(item.label);
                            setEditingScope(item.work_group as ChecklistScope);
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          disabled={busyId === item.id}
                          onClick={() => void handleDelete(item)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <form className="checklist-admin__add" onSubmit={(e) => void handleAdd(e)}>
          <label className="checklist-admin__add-label">
            <span>새 항목 — {CHECKLIST_SCOPE_LABELS[activeScope]}</span>
            <textarea
              value={newLabel}
              rows={3}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={`체크 항목을 입력하세요.\n[참고] 두 번째 줄부터 안내 문구`}
              aria-label={`${CHECKLIST_SCOPE_LABELS[activeScope]} 새 항목`}
            />
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!newLabel.trim() || busyId === 'new'}
          >
            {busyId === 'new' ? '추가 중…' : '항목 추가'}
          </button>
        </form>
      </section>

      {inactiveItems.length ? (
        <section className="checklist-admin-archived">
          <h4>삭제된 항목</h4>
          <p>실수로 삭제한 체크 항목을 복구할 수 있습니다.</p>
          <ul className="checklist-admin__list checklist-admin__list--archived">
            {inactiveItems.map((item) => (
              <li key={item.id} className="checklist-admin__item checklist-admin__item--archived">
                <div className="checklist-admin__body">
                  <span className="checklist-admin__archived-scope">
                    {CHECKLIST_SCOPE_LABELS[item.work_group as ChecklistScope] ?? item.work_group}
                  </span>
                  <ChecklistLabelPreview label={item.label} />
                </div>
                <div className="checklist-admin__actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--small"
                    onClick={async () => {
                      await restoreChecklistDefinition(item.id);
                      onRefresh();
                      onToast('항목을 복구했습니다.');
                    }}
                  >
                    복구
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
