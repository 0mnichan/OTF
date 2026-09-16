import Link from 'next/link';
import { platformStats, listRooms, roomStats } from '@/lib/queries.mjs';
import { recentActivity } from '@/lib/scoring.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { DifficultyBadge, Stat, Pill } from '@/components/ui';
import { protocolLabel, timeAgo } from '@/lib/format';

export default async function HomePage() {
  const stats = platformStats();
  const rooms = listRooms().slice(0, 3);
  const stat = roomStats();
  const activity = recentActivity(6);
  const user = await currentUser();

  return (
    <div className="flex flex-col gap-12">
      {/* Hero — a Win9x "process overview" window */}
      <section className="card">
        <div className="title-bar flex items-center gap-2 px-1.5 py-1">
          <Icon.gauge size={14} />
          <span className="mono text-[12px]">PLANT-OVERVIEW.EXE — P&amp;ID-001 · SHEET 1/1</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="title-btn">_</span>
            <span className="title-btn">▢</span>
            <span className="title-btn">✕</span>
          </div>
        </div>
        <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-8 -top-4 opacity-[0.08]">
            <Icon.gauge size={260} />
          </div>
          <div className="relative max-w-2xl">
            <div className="mono mb-4 inline-flex items-center gap-2 bg-[var(--color-alarm)] px-2 py-1 text-[11px] font-bold tracking-wide text-[#241a05]"
              style={{ boxShadow: 'inset -1px -1px 0 #b9791a, inset 1px 1px 0 #ffe1a0' }}>
              <span className="live-dot led" style={{ color: '#a80000' }} />
              OT / ICS SECURITY RANGE — v1.0
            </div>
            <h1 className="text-4xl font-bold leading-tight text-[#000080] sm:text-5xl">
              Break the plant.<br />
              <span className="text-[#a05000]">Not a real one.</span>
            </h1>
            <p className="mt-5 text-[15px] text-black">
              Hands-on capture-the-flag for industrial control systems. Overflow a water tank, open a
              substation breaker, pivot from a phished laptop down to a reactor PLC — against
              simulations that behave like the real thing, speaking Modbus, DNP3, IEC-104 and S7comm.
            </p>
            <p className="mt-3 text-[13px] text-[var(--color-ink-faint)]">
              The flag is never just a string. It is a process state you have to actually cause.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link
                href={user ? '/rooms' : '/register'}
                className="bevel-out flex items-center gap-2 bg-[var(--w95-face)] px-5 py-2 text-[13px] font-bold text-black"
              >
                <Icon.bolt size={15} /> {user ? 'Enter the range' : 'Enlist — it is free'}
              </Link>
              <Link
                href="/paths/ics-fundamentals"
                className="bevel-out flex items-center gap-2 bg-[var(--w95-face)] px-5 py-2 text-[13px] text-black"
              >
                <Icon.path size={15} /> Fundamentals path
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="layers" label="Rooms" value={stats.rooms} />
        <Stat icon="flag" label="Challenges" value={stats.questions} />
        <Stat icon="terminal" label="Live labs" value={stats.labs} />
        <Stat icon="user" label="Operators" value={stats.players} />
      </section>

      {/* Why it's different */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Why this is not another CTF</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: 'droplet' as const, title: 'Physical-consequence flags', body: 'A physics simulation emits the flag only when the plant reaches an unsafe state. You cannot grep for it — you have to overflow the tank.' },
            { icon: 'shield' as const, title: 'Restraint is scored', body: 'Rooms reward hitting the objective without tripping the safety system, the exact discipline real OT red teams are graded on.' },
            { icon: 'radio' as const, title: 'Blue team is first class', body: 'Defensive rooms grade a detection rule you write against clean and malicious captures — true positives and false positives both count.' },
          ].map((c) => {
            const I = Icon[c.icon];
            return (
              <div key={c.title} className="card p-5">
                <div className="mb-3 text-[var(--color-hazard)]"><I size={24} /></div>
                <h3 className="mb-1.5 font-semibold">{c.title}</h3>
                <p className="text-sm text-[var(--color-ink-dim)]">{c.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured rooms + activity */}
      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Start here</h2>
            <Link href="/rooms" className="mono text-sm text-[var(--color-info)] hover:underline">all rooms →</Link>
          </div>
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.slug}`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-[var(--color-hazard-dim)]">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--color-panel)] text-[var(--color-hazard)]">
                  <Icon.gauge size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{room.title}</span>
                    <DifficultyBadge difficulty={room.difficulty} />
                    {room.hasLab && <Pill tone="lab">LAB</Pill>}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-ink-faint)]">{room.summary}</p>
                </div>
                <div className="mono hidden shrink-0 text-right text-xs text-[var(--color-ink-faint)] sm:block">
                  <div className="text-[var(--color-hazard)]">{room.points} pts</div>
                  <div>{room.protocols.map(protocolLabel).join(' · ')}</div>
                </div>
                <Icon.chevronRight size={18} />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Live feed</h2>
          <div className="card divide-y divide-[var(--color-panel-border)]">
            {activity.length === 0 ? (
              <div className="p-4 text-sm text-[var(--color-ink-faint)]">No solves yet. Be the first blood.</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-3 text-sm">
                  {a.first_blood ? (
                    <span title="First blood" className="text-[var(--color-trip)]"><Icon.bolt size={14} /></span>
                  ) : (
                    <span className="text-[var(--color-process)]"><Icon.check size={14} /></span>
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <Link href={`/u/${a.username}`} className="font-medium hover:underline">{a.username}</Link>
                    <span className="text-[var(--color-ink-faint)]"> solved in </span>
                    <span className="text-[var(--color-ink-dim)]">{a.room_title}</span>
                  </span>
                  <span className="mono shrink-0 text-[11px] text-[var(--color-ink-faint)]">{timeAgo(a.solved_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
