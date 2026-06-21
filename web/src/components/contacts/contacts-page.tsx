'use client';

import { useEffect, useMemo, useState } from 'react';
import { CONTACT_DEPARTMENTS, CONTACT_FORM_DEPARTMENTS, type Contact, type ContactInput } from '@/lib/contacts/types';
import { useContacts } from '@/lib/contacts/use-contacts';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type ContactModalProps = {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
  onSave: (input: ContactInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function ContactModal({ open, contact, onClose, onSave, onDelete }: ContactModalProps) {
  const [form, setForm] = useState<ContactInput>({
    department: '기타',
    name: '',
    phone: '',
    phone_alt: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setForm({
        department: contact.department,
        name: contact.name,
        phone: contact.phone,
        phone_alt: contact.phone_alt,
        note: contact.note,
      });
    } else {
      setForm({ department: '기타', name: '', phone: '', phone_alt: '', note: '' });
    }
    setError(null);
  }, [open, contact]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('이름과 연락처를 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          name: form.name.trim(),
          phone: form.phone.trim(),
          phone_alt: form.phone_alt.trim(),
          note: form.note.trim(),
        },
        contact?.id,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{contact ? '연락처 수정' : '연락처 추가'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>구분</span>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {CONTACT_FORM_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>이름 / 업체명 *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 엔지니어링 실"
              />
            </label>
            <label className="field">
              <span>연락처 / ID *</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="전화번호 또는 로그인 ID"
              />
            </label>
            <label className="field">
              <span>추가 번호</span>
              <input
                value={form.phone_alt}
                onChange={(e) => setForm({ ...form, phone_alt: e.target.value })}
                placeholder="예: 휴대폰 · 내선"
              />
            </label>
            <label className="field field--full">
              <span>메모</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="비밀번호·결제 안내·유의사항"
              />
            </label>
          </div>

          {error ? <p style={{ color: '#b91c1c', fontSize: '0.88rem', marginTop: '0.75rem' }}>{error}</p> : null}

          <div className="modal__footer">
            <div className="modal__footer-left">
              {contact ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={async () => {
                    const ok = await confirm({
                      title: '연락처 삭제',
                      message: `「${contact.name}」 연락처를 삭제할까요?`,
                      tone: 'danger',
                      confirmLabel: '삭제',
                    });
                    if (!ok) return;
                    await onDelete(contact.id);
                    onClose();
                  }}
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="submit" disabled={saving} className="btn btn--primary">
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function phoneHref(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.length >= 8 ? `tel:${digits}` : null;
}

function isDialable(value: string): boolean {
  return phoneHref(value) !== null;
}

function isEmailOrId(value: string): boolean {
  if (isDialable(value)) return false;
  return value.includes('@') || value.length > 14;
}

function ContactPhone({
  value,
  onCopy,
  variant = 'primary',
}: {
  value: string;
  label?: string;
  onCopy: (text: string) => void;
  variant?: 'primary' | 'alt';
}) {
  if (!value) return null;
  const href = isDialable(value) ? phoneHref(value) : null;
  const isId = isEmailOrId(value);

  if (href) {
    return (
      <a
        href={href}
        className={`contact-card__number contact-card__number--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        {value}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`contact-card__number contact-card__number--copy contact-card__number--${variant}${
        isId ? ' contact-card__number--id' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        void onCopy(value);
      }}
      title="클릭하여 복사"
    >
      {value}
    </button>
  );
}

function ContactCard({
  contact,
  showDepartment,
  onEdit,
  onTogglePin,
  onCopy,
}: {
  contact: Contact;
  showDepartment: boolean;
  onEdit: (contact: Contact) => void;
  onTogglePin: (contact: Contact) => void;
  onCopy: (text: string) => void;
}) {
  const primaryDialable = isDialable(contact.phone);
  const primaryHref = primaryDialable ? phoneHref(contact.phone) : null;

  return (
    <article className="contact-card contact-card--tile">
      <div className="contact-card__top-row">
        <div className="contact-card__head">
          {showDepartment ? <span className="contact-card__dept">{contact.department}</span> : null}
          <h3 className="contact-card__name">{contact.name}</h3>
        </div>
        <button
          type="button"
          className={`contact-card__pin${contact.is_pinned ? ' is-active' : ''}`}
          aria-label={contact.is_pinned ? '즐겨찾기 해제' : '즐겨찾기'}
          onClick={() => onTogglePin(contact)}
        >
          ★
        </button>
      </div>

      <div className="contact-card__body">
        <div className="contact-card__phones">
          <ContactPhone value={contact.phone} onCopy={onCopy} />
          <ContactPhone value={contact.phone_alt} onCopy={onCopy} variant="alt" />
        </div>

        {contact.note ? (
          <p
            className="contact-card__note"
            onClick={() => onCopy(contact.note)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCopy(contact.note);
              }
            }}
            role="button"
            tabIndex={0}
            title="클릭하여 복사"
          >
            {contact.note}
          </p>
        ) : null}
      </div>

      <footer className="contact-card__actions">
        {primaryHref ? (
          <a href={primaryHref} className="btn btn--primary btn--xs contact-card__action">
            전화
          </a>
        ) : (
          <button
            type="button"
            className="btn btn--outline btn--xs contact-card__action"
            onClick={() => onCopy(contact.phone)}
          >
            복사
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--xs contact-card__action" onClick={() => onEdit(contact)}>
          수정
        </button>
      </footer>
    </article>
  );
}

function ContactCardList({
  contacts,
  showDepartment,
  onEdit,
  onTogglePin,
  onCopy,
}: {
  contacts: Contact[];
  showDepartment: boolean;
  onEdit: (contact: Contact) => void;
  onTogglePin: (contact: Contact) => void;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="contact-card-list">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          showDepartment={showDepartment}
          onEdit={onEdit}
          onTogglePin={onTogglePin}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
}

export function ContactsPageClient() {
  const pageMeta = getNavPageMeta('/contacts');
  const { contacts, isLoading, createContact, updateContact, deleteContact, togglePin } = useContacts();
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const countsByDept = useMemo(() => {
    const counts: Record<string, number> = { 전체: contacts.length };
    for (const contact of contacts) {
      counts[contact.department] = (counts[contact.department] ?? 0) + 1;
    }
    return counts;
  }, [contacts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts
      .filter((contact) => {
        if (filter !== '전체' && contact.department !== filter) return false;
        if (!q) return true;
        return [contact.name, contact.department, contact.phone, contact.phone_alt, contact.note]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [contacts, filter, query]);

  const listLayout = useMemo(() => {
    const pinned = visible.filter((contact) => contact.is_pinned);
    const rest = visible.filter((contact) => !contact.is_pinned);

    if (filter !== '전체') {
      return {
        pinned,
        sections: [{ dept: filter, items: rest }],
        showDepartment: false,
      };
    }

    const byDept = new Map<string, Contact[]>();
    for (const contact of rest) {
      const list = byDept.get(contact.department) ?? [];
      list.push(contact);
      byDept.set(contact.department, list);
    }

    const sections = CONTACT_FORM_DEPARTMENTS.filter((dept) => byDept.has(dept)).map((dept) => ({
      dept,
      items: byDept.get(dept) ?? [],
    }));

    return { pinned, sections, showDepartment: false };
  }, [visible, filter]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('복사했습니다.');
    } catch {
      showToast('복사에 실패했습니다.');
    }
  }

  return (
    <>
      <section className="project-board contacts-page">
        <header className="project-board__head">
          <div>
            <h1>{pageMeta.label}</h1>
            <p>{pageMeta.description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn btn--primary"
          >
            + 연락처 추가
          </button>
        </header>

        <div className="project-board__controls">
          <div className="project-board__search">
            <span aria-hidden>⌕</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·번호·메모 검색…"
              aria-label="연락처 검색"
            />
          </div>
          <div className="project-board__filters contacts-page__filters" aria-label="구분 필터">
            {CONTACT_DEPARTMENTS.map((dept) => {
              const count = countsByDept[dept];
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setFilter(dept)}
                  className={`contacts-page__filter${filter === dept ? ' is-active' : ''}`}
                >
                  {dept}
                  {count ? ` ${count}` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : !visible.length ? (
          <p className="empty-state">등록된 연락처가 없습니다.</p>
        ) : (
          <div className="contacts-list">
            {listLayout.pinned.length ? (
              <section className="contacts-list__section">
                <header className="contacts-list__head contacts-list__head--pinned">
                  <h3>⭐ 즐겨찾기</h3>
                  <span>{listLayout.pinned.length}</span>
                </header>
                <ContactCardList
                  contacts={listLayout.pinned}
                  showDepartment={filter === '전체'}
                  onEdit={(contact) => {
                    setEditing(contact);
                    setModalOpen(true);
                  }}
                  onTogglePin={async (contact) => {
                    await togglePin.mutateAsync({ id: contact.id, isPinned: contact.is_pinned });
                    showToast(contact.is_pinned ? '즐겨찾기 해제' : '즐겨찾기 추가');
                  }}
                  onCopy={handleCopy}
                />
              </section>
            ) : null}

            {listLayout.sections.map((section) =>
              section.items.length ? (
                <section key={section.dept} className="contacts-list__section">
                  {filter === '전체' ? (
                    <header className="contacts-list__head">
                      <h3>{section.dept}</h3>
                      <span>{section.items.length}</span>
                    </header>
                  ) : null}
                  <ContactCardList
                    contacts={section.items}
                    showDepartment={false}
                    onEdit={(contact) => {
                      setEditing(contact);
                      setModalOpen(true);
                    }}
                    onTogglePin={async (contact) => {
                      await togglePin.mutateAsync({ id: contact.id, isPinned: contact.is_pinned });
                      showToast(contact.is_pinned ? '즐겨찾기 해제' : '즐겨찾기 추가');
                    }}
                    onCopy={handleCopy}
                  />
                </section>
              ) : null,
            )}
          </div>
        )}
      </section>

      <ContactModal
        open={modalOpen}
        contact={editing}
        onClose={() => setModalOpen(false)}
        onSave={async (input, id) => {
          if (id) await updateContact.mutateAsync({ id, input });
          else await createContact.mutateAsync(input);
          showToast(id ? '연락처가 수정되었습니다.' : '연락처가 추가되었습니다.');
        }}
        onDelete={async (id) => {
          await deleteContact.mutateAsync(id);
          showToast('연락처가 삭제되었습니다.');
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
