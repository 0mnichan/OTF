import Link from 'next/link';
import { currentUser } from '@/lib/session';
import { Icon } from './icons';
import { rankFor } from '@/lib/scoring.mjs';

const LINKS = [
  { href: '/rooms', label: 'Rooms', icon: 'layers' as const },
  { href: '/paths', label: 'Paths', icon: 'path' as const },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'trophy' as const },
];

export async function Nav() {
  const user = await currentUser();
  const rank = user ? rankFor(user.points) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-hazard)] text-black">
            <Icon.bolt size={17} />
          </span>
          <span className="mono text-sm font-bold tracking-tight">
            OTF<span className="text-[var(--color-ink-faint)]">/range</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const I = Icon[l.icon];
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-dim)] transition-colors hover:bg-[var(--color-panel-raised)] hover:text-[var(--color-ink)]"
              >
                <I size={15} /> {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link href="/admin" className="mono rounded-md border border-[var(--color-panel-border)] px-2.5 py-1 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                  admin
                </Link>
              )}
              <Link href={`/u/${user.username}`} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[var(--color-panel-raised)]">
                <div className="text-right">
                  <div className="text-sm font-medium leading-none">{user.username}</div>
                  <div className="mono text-[11px] text-[var(--color-hazard)]">{user.points} pts · {rank?.name}</div>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-raised)]">
                  <Icon.user size={16} />
                </span>
              </Link>
              <form action="/api/auth/logout" method="post">
                <button className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-ink-faint)] hover:text-[var(--color-trip)]" title="Log out" type="submit">
                  <Icon.logout size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                Log in
              </Link>
              <Link href="/register" className="rounded-md bg-[var(--color-hazard)] px-3 py-1.5 text-sm font-medium text-black hover:brightness-110">
                Enlist
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
