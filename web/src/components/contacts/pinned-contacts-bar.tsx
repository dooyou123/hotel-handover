'use client';

import Link from 'next/link';
import { usePinnedContacts } from '@/lib/contacts/use-contacts';

function phoneHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '#';
}

export function PinnedContactsBar() {
  const { data: contacts = [] } = usePinnedContacts();

  if (!contacts.length) return null;

  return (
    <section className="pinned-contacts-bar">
      <div className="pinned-contacts-bar__header">
        <span className="pinned-contacts-bar__label">⭐ 즐겨찾기 연락처</span>
        <Link href="/contacts" className="link-btn">
          연락처 관리
        </Link>
      </div>
      <div className="pinned-contacts-bar__list">
        {contacts.map((contact) => (
          <a key={contact.id} href={phoneHref(contact.phone)} className="pinned-contact">
            <span className="pinned-contact__name">{contact.name}</span>
            <span className="pinned-contact__phone">{contact.phone}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
