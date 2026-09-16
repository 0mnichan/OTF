import Link from 'next/link';
import { currentUser } from '@/lib/session';
import { Icon } from './icons';
import { rankFor } from '@/lib/scoring.mjs';
import { HmiClock } from './HmiClock';

const LINKS = [
  { href: '/rooms', label: 'ROOMS', icon: 'layers' as const },
  { href: '/paths', label: 'PATHS', icon: 'path' as const },
  { href: '/leaderboard', label: 'LEADERBOARD', icon: 'trophy' as const },
];

/** The diamond mark from an old vendor HMI splash. */
function DiamondMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size, transform: 'rotate(45deg)', background: 'var(--color-alarm)', border: '1px solid #b9791a', boxShadow: 'inset 1px 1px 0 #ffe1a0' }}
    >
      <span style={{ transform: 'rotate(-45deg)', color: '#241a05', display: 'grid', placeItems: 'center' }}>
        <Icon.bolt size={size * 0.55} />
      </span>
    </span>
  );
}

export async function Nav() {
  const user = await currentUser();
  const rank = user ? rankFor(user.points) : null;

  return (
    <header className="sticky top-0 z-20">
      {/* Navy titlebar — the HMI window chrome */}
      <div className="hmi-titlebar">
        <div className="mx-auto flex h-11 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <DiamondMark />
            <span className="mono text-sm font-bold tracking-widest">
              OTF<span className="text-[#8fb2e6]"> · OT/ICS RANGE</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-stretch gap-0.5 self-stretch sm:flex">
            {LINKS.map((l) => {
              const I = Icon[l.icon];
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="mono flex items-center gap-1.5 px-3 text-[11px] font-medium tracking-wide text-[#cddcf5] transition-colors hover:bg-[var(--color-navy-deep)] hover:text-white"
                >
                  <I size={13} /> {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="mono hidden items-center gap-1.5 text-[11px] text-[#cddcf5] md:flex">
              <span className="led" style={{ color: user ? 'var(--color-process)' : 'var(--color-alarm)' }} />
              {user ? 'AUTHENTICATED' : 'GUEST SESSION'}
            </span>
            <HmiClock />
            {user ? (
              <div className="flex items-center gap-1.5">
                {user.role === 'admin' && (
                  <Link href="/admin" className="mono bevel-out bg-[var(--color-panel-raised)] px-2 py-1 text-[10px] text-[var(--color-ink)] hover:brightness-105">
                    ADMIN
                  </Link>
                )}
                <Link href={`/u/${user.username}`} className="mono bevel-out flex items-center gap-2 bg-[var(--color-panel-raised)] px-2 py-1 text-[var(--color-ink)] hover:brightness-105">
                  <Icon.user size={14} />
                  <span className="hidden text-left sm:block">
                    <span className="block text-[11px] font-bold leading-none">{user.username}</span>
                    <span className="block text-[10px] leading-none text-[var(--color-hazard-dim)]">{user.points} PTS · {rank?.name}</span>
                  </span>
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button className="bevel-out grid h-7 w-7 place-items-center bg-[var(--color-panel-raised)] text-[var(--color-trip)] hover:brightness-105" title="Log out" type="submit">
                    <Icon.logout size={14} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="mono bevel-out bg-[var(--color-panel-raised)] px-3 py-1 text-[11px] text-[var(--color-ink)] hover:brightness-105">
                  LOG IN
                </Link>
                <Link href="/register" className="mono bevel-out bg-[var(--color-alarm)] px-3 py-1 text-[11px] font-bold text-[#241a05] hover:brightness-105">
                  ENLIST
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amber caution sub-strip, like the alarm banner on a process screen */}
      <div className="hmi-alarm">
        <div className="mono mx-auto flex h-6 max-w-6xl items-center gap-3 px-4 text-[10px] font-semibold tracking-wide">
          <span className="flex items-center gap-1"><Icon.alertTriangle size={11} /> TRAINING RANGE</span>
          <span className="opacity-50">|</span>
          <span className="hidden sm:inline">ALL TARGETS SIMULATED</span>
          <span className="opacity-50 hidden sm:inline">|</span>
          <span>AUTHORISED USE ONLY</span>
          <span className="ml-auto hidden md:inline">PURDUE L0–L5 · MODBUS / DNP3 / IEC-104 / S7</span>
        </div>
      </div>
    </header>
  );
}
