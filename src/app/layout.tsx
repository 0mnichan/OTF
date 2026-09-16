import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'OTF — the OT/ICS Cyber Range',
  description:
    'A capture-the-flag training range for operational technology and industrial control system security. Break simulated plants, not real ones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="scanlines">
        <Suspense fallback={<div className="h-14 border-b border-[var(--color-panel-border)]" />}>
          <Nav />
        </Suspense>
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="relative z-10 mx-auto max-w-6xl px-4 py-10 text-center text-xs text-[var(--color-ink-faint)]">
          <p>
            OTF is a training range. Every target here is a simulation. Techniques you learn are for
            authorised testing only — never point them at equipment you do not own and have written
            permission to test.
          </p>
          <p className="mt-2">
            <a href="/legal" className="hover:text-[var(--color-ink-dim)] hover:underline">Acceptable Use &amp; Safety</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
