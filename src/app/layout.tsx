import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Nav } from '@/components/nav';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OTF - the OT/ICS Cyber Range',
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
        <main className="relative z-10 mx-auto min-h-[calc(100vh-17rem)] max-w-[1680px] px-4 py-8">{children}</main>

        <footer className="relative z-10 mx-auto max-w-[1680px] px-4 pb-24 pt-6 text-center text-xs text-[var(--color-ink-faint)]">
          <p>
            OTF is a training range. Every target here is a simulation. Techniques you learn are for
            authorised testing only - never point them at equipment you do not own and have written
            permission to test.
          </p>
          <p className="mt-2">
            <a href="/legal" className="text-[var(--color-info)] hover:underline">Acceptable Use &amp; Safety</a>
          </p>
        </footer>

        {/* Operator status strip, fixed at the bottom like a real HMI shell */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--bevel-hi)] bg-[var(--color-panel-raised)]">
          <div className="mono mx-auto flex h-8 max-w-[1680px] items-center gap-2 overflow-hidden px-3 text-[10px] tracking-wide text-[var(--color-ink-dim)]">
            <span className="bevel-in bg-[var(--color-panel-sunken)] px-2 py-0.5">OPERATOR: <b className="text-[var(--color-navy)]">VISITOR</b></span>
            <span className="bevel-in hidden bg-[var(--color-panel-sunken)] px-2 py-0.5 sm:inline">AREA: <b className="text-[var(--color-navy)]">RANGE</b></span>
            <span className="bevel-in hidden bg-[var(--color-panel-sunken)] px-2 py-0.5 md:inline">SERVER: <b className="text-[var(--color-navy)]">OTF-01</b></span>
            <span className="bevel-in flex items-center gap-1.5 bg-[var(--color-panel-sunken)] px-2 py-0.5">
              COMMS: <span className="led" style={{ color: 'var(--color-process)' }} /><b className="text-[var(--color-process)]">ONLINE</b>
            </span>
            <span className="bevel-in bg-[var(--color-panel-sunken)] px-2 py-0.5">MODE: <b className="text-[var(--color-trip)]">RUN</b></span>
            <span className="ml-auto hidden lg:inline">OTF/range · P&amp;ID-001 · SHEET 1/1</span>
          </div>
        </div>
      </body>
    </html>
  );
}
