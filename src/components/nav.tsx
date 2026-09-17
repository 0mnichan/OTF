import Link from 'next/link';
import { currentUser } from '@/lib/session';
import { Icon } from './icons';
import { rankFor } from '@/lib/scoring.mjs';
import { HmiClock } from './HmiClock';

const LINKS = [
  { href: '/rooms', label: 'Rooms', icon: 'layers' as const },
  { href: '/paths', label: 'Paths', icon: 'path' as const },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'trophy' as const },
];

/** The diamond mark from an old vendor HMI splash. */
function DiamondMark({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size, transform: 'rotate(45deg)', background: 'var(--color-alarm)', boxShadow: 'inset -1px -1px 0 #b9791a, inset 1px 1px 0 #ffe1a0' }}
    >
      <span style={{ transform: 'rotate(-45deg)', color: '#241a05', display: 'grid', placeItems: 'center' }}>
        <Icon.bolt size={size * 0.6} />
      </span>
    </span>
  );
}

export async function Nav() {
  const user = await currentUser();
  const rank = user ? rankFor(user.points) : null;

  return (
    <header className="sticky top-0 z-20">
      {/* The desktop menu bar sits on a raised chassis */}
      <div className="card" style={{ boxShadow: 'inset 0 -1px 0 var(--w95-shadow), inset 0 -2px 0 var(--w95-light)' }}>
        {/* Title bar */}
        <div className="title-bar flex items-center gap-2 px-1.5 py-1">
          <div className="mx-auto flex w-full max-w-[1680px] items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <DiamondMark />
              <span className="text-[13px] font-bold tracking-wide">
                OTF - OT/ICS Cyber Range
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <HmiClock />
              <div className="flex items-center gap-1">
                <span className="title-btn" aria-hidden>_</span>
                <span className="xp-close" aria-hidden>✕</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu / toolbar row */}
        <div className="mx-auto flex max-w-[1680px] items-center gap-1 px-1.5 py-1">
          <nav className="flex items-center gap-0.5">
            {LINKS.map((l) => {
              const I = Icon[l.icon];
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-1.5 px-2 py-1 text-[12px] text-black hover:bg-[#000080] hover:text-white"
                >
                  <I size={14} /> <span className="underline decoration-dotted underline-offset-2">{l.label[0]}</span>{l.label.slice(1)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="mono hidden items-center gap-1.5 bevel-in bg-white px-2 py-0.5 text-[11px] md:flex">
              <span className="led" style={{ color: user ? 'var(--color-process)' : 'var(--color-alarm)' }} />
              {user ? 'AUTHENTICATED' : 'GUEST'}
            </span>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin" className="bevel-out bg-[var(--w95-face)] px-2.5 py-1 text-[12px] text-black">Admin</Link>
                )}
                <Link href={`/u/${user.username}`} className="bevel-out flex items-center gap-1.5 bg-[var(--w95-face)] px-2 py-1 text-black">
                  <Icon.user size={13} />
                  <span className="hidden text-left leading-none sm:block">
                    <span className="block text-[12px] font-bold">{user.username}</span>
                    <span className="mono block text-[10px] text-[var(--color-hazard)]">{user.points} pts · {rank?.name}</span>
                  </span>
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button className="bg-[var(--w95-face)] px-2 py-1 text-[12px] text-black" type="submit">Log&nbsp;off</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="bevel-out bg-[var(--w95-face)] px-3 py-1 text-[12px] font-medium text-black">Log&nbsp;in</Link>
                <Link href="/register" className="bevel-out bg-[var(--w95-face)] px-3 py-1 text-[12px] font-bold text-black">Enlist</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amber caution sub-strip, like a process-screen alarm banner */}
      <div className="hmi-alarm">
        <div className="mono mx-auto flex h-6 max-w-[1680px] items-center gap-3 px-3 text-[10px] font-bold tracking-wide">
          <span className="flex items-center gap-1"><Icon.alertTriangle size={11} /> TRAINING RANGE</span>
          <span className="opacity-40">|</span>
          <span className="hidden sm:inline">ALL TARGETS SIMULATED</span>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span>AUTHORISED USE ONLY</span>
          <span className="ml-auto hidden md:inline">PURDUE L0–L5 · MODBUS / DNP3 / IEC-104 / S7</span>
        </div>
      </div>
    </header>
  );
}
