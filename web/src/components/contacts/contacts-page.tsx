'use client';

import { useEffect, useMemo, useState } from 'react';
import { CONTACT_DEPARTMENTS, CONTACT_FORM_DEPARTMENTS, type Contact, type ContactInput } from '@/lib/contacts/types';
import { useContacts } from '@/lib/contacts/use-contacts';
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
      setError('이름과 전화번호를 입력해 주세요.');
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
              <span>연락처 *</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="예: 02-1234-5678"
              />
            </label>
            <label className="field">
              <span>추가 번호</span>
              <input
                value={form.phone_alt}
                onChange={(e) => setForm({ ...form, phone_alt: e.target.value })}
                placeholder="예: 내선 210"
              />
            </label>
            <label className="field field--full">
              <span>메모</span>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="예: 야간만 연락"
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

function phoneHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '#';
}

export function ContactsPageClient() {
  const { contacts, isLoading, createContact, updateContact, deleteContact, togglePin } = useContacts();
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (filter !== '전체' && contact.department !== filter) return false;
      if (!q) return true;
      return [contact.name, contact.department, contact.phone, contact.phone_alt, contact.note]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [contacts, filter, query]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <>
      <section className="contacts-page">
        <div className="contacts-page__header">
          <div>
            <h2>외부 연락처</h2>
            <p>엔지니어링·업체·응급 등 자주 쓰는 번호를 빠르게 확인하세요.</p>
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
        </div>

        <div className="contacts-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·번호·메모 검색…"
            aria-label="연락처 검색"
          />
          <div className="contacts-filters" aria-label="구분 필터">
            {CONTACT_DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setFilter(dept)}
                className={`contacts-filter${filter === dept ? ' is-active' : ''}`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : !visible.length ? (
          <p className="empty-state">등록된 연락처가 없습니다.</p>
        ) : (
          <div className="contacts-grid">
            {visible.map((contact) => (
              <article
                key={contact.id}
                className="contact-card"
                onClick={() => {
                  setEditing(contact);
                  setModalOpen(true);
                }}
              >
                <div className="contact-card__top">
                  <span className="contact-card__dept">{contact.department}</span>
                  <div className="contact-card__actions">
                    <button
                      type="button"
                      className={`contact-card__pin${contact.is_pinned ? ' is-active' : ''}`}
                      aria-label={contact.is_pinned ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await togglePin.mutateAsync({ id: contact.id, isPinned: contact.is_pinned });
                        showToast(contact.is_pinned ? '즐겨찾기 해제' : '즐겨찾기 추가');
                      }}
                    >
                      ⭐
                    </button>
                    <button
                      type="button"
                      className="contact-card__edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(contact);
                        setModalOpen(true);
                      }}
                    >
                      수정
                    </button>
                  </div>
                </div>
                <h3 className="contact-card__name">{contact.name}</h3>
                <div className="contact-card__phones">
                  <a href={phoneHref(contact.phone)} className="contact-card__phone" onClick={(e) => e.stopPropagation()}>
                    {contact.phone}
                  </a>
                  {contact.phone_alt ? (
                    <a
                      href={phoneHref(contact.phone_alt)}
                      className="contact-card__phone contact-card__phone--alt"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.phone_alt}
                    </a>
                  ) : null}
                </div>
                {contact.note ? <p className="contact-card__note">{contact.note}</p> : null}
              </article>
            ))}
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
