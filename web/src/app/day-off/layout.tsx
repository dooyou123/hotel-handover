import type { ReactNode } from 'react';

export default function DayOffGuestLayout({ children }: { children: ReactNode }) {
  return <main className="dayoff-layout">{children}</main>;
}
