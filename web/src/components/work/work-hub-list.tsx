'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

export function WorkHubPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['work-hub-today', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function WorkHubToolbar({ children }: { children: ReactNode }) {
  return <div className="work-hub__subtoolbar">{children}</div>;
}

export function WorkHubToolbarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['work-hub__subtoolbar-group', className].filter(Boolean).join(' ')}>{children}</div>
  );
}

export function WorkHubFilterTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="work-hub__filters" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={`work-hub__filter${value === item.id ? ' is-active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count != null && item.count > 0 ? ` ${item.count}` : ''}
        </button>
      ))}
    </div>
  );
}

export function WorkHubSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <label className="work-hub__search">
      <span aria-hidden>⌕</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
      />
    </label>
  );
}

export function WorkHubMonthField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="work-hub__month">
      <span>조회 월</span>
      <input type="month" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function WorkHubSection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="work-hub-today__section" aria-labelledby={id}>
      <header className="work-hub-today__head">
        <h2 id={id}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function WorkHubList({ children }: { children: ReactNode }) {
  return <ul className="work-hub-today__list">{children}</ul>;
}

export function WorkHubEmpty({ children }: { children: ReactNode }) {
  return <p className="work-hub-today__empty">{children}</p>;
}

type WorkHubRowProps = {
  kind: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  href?: string;
  onClick?: () => void;
  liClassName?: string;
  rowClassName?: string;
  leading?: ReactNode;
};

export function WorkHubRow({
  kind,
  title,
  meta,
  href,
  onClick,
  liClassName,
  rowClassName,
  leading,
}: WorkHubRowProps) {
  const rowClass = [
    'work-hub-today__row',
    href || onClick ? 'work-hub-today__row--interactive' : '',
    rowClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <span className="work-hub-today__kind">{kind}</span>
      <span className="work-hub-today__title">{title}</span>
      {meta ? <span className="work-hub-today__meta">{meta}</span> : null}
    </>
  );

  const main =
    href ? (
      <Link href={href} className={rowClass}>
        {body}
      </Link>
    ) : onClick ? (
      <button type="button" className={rowClass} onClick={onClick}>
        {body}
      </button>
    ) : (
      <div className={rowClass}>{body}</div>
    );

  if (!leading) {
    return <li className={liClassName}>{main}</li>;
  }

  return (
    <li className={['work-hub-today__item', liClassName].filter(Boolean).join(' ')}>
      {leading}
      {main}
    </li>
  );
}

export function WorkHubCheckButton({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={`work-hub-today__check${checked ? ' is-checked' : ''}`}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
    >
      {checked ? '✓' : ''}
    </button>
  );
}
