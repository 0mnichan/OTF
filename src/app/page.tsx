import Link from 'next/link';
import { platformStats, listRooms } from '@/lib/queries.mjs';
import { recentActivity } from '@/lib/scoring.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { DifficultyBadge } from '@/components/ui';
import { GroupBox, TaskPane, TaskGroup, TaskLink, DetailRow } from '@/components/xp';
import { protocolLabel, timeAgo } from '@/lib/format';

export default async function HomePage() {
  const stats = platformStats();
  const rooms = listRooms();
  const activity = recentActivity(8);
  const user = await currentUser();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      {/* Left task pane, like Windows Explorer */}
      <TaskPane>
        <TaskGroup title="Range Tasks" icon="gauge">
          <TaskLink href="/rooms" icon="layers">Browse all rooms</TaskLink>
          <TaskLink href="/paths" icon="path">Learning paths</TaskLink>
          <TaskLink href="/leaderboard" icon="trophy">View leaderboard</TaskLink>
          {!user && <TaskLink href="/register" icon="user">Create an account</TaskLink>}
          {user && <TaskLink href={`/u/${user.username}`} icon="user">My profile</TaskLink>}
        </TaskGroup>

        <TaskGroup title="Details" icon="cpu">
          <DetailRow label="Rooms" value={stats.rooms} />
          <DetailRow label="Challenges" value={stats.questions} />
          <DetailRow label="Web consoles" value={rooms.filter((r) => r.hasWebLab).length} />
          <DetailRow label="Operators" value={stats.players} />
          <DetailRow label="Solves logged" value={stats.solves} />
        </TaskGroup>

        <TaskGroup title="Other Places" icon="network">
          <TaskLink href="/paths/famous-incidents" icon="bolt">Famous OT Incidents</TaskLink>
          <TaskLink href="/legal" icon="shield">Acceptable Use &amp; Safety</TaskLink>
        </TaskGroup>
      </TaskPane>

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Welcome banner group box */}
        <div className="group-box">
          <div className="flex items-stretch">
            <div className="hidden w-40 shrink-0 items-center justify-center bg-gradient-to-b from-[#245edb] to-[#17408a] text-white sm:flex">
              <Icon.gauge size={72} />
            </div>
            <div className="min-w-0 flex-1 p-4">
              <h1 className="text-2xl font-bold text-[#0a246a]">OTF - the OT/ICS Cyber Range</h1>
              <p className="mt-1 text-[13px] text-[#1a2432]">
                Hands-on capture-the-flag for industrial control systems. Overflow a water tank, open a
                substation breaker, overspeed a centrifuge, defeat a safety system - against simulations
                that behave like the real thing. The flag is never a string; it is a process state you
                have to cause. Everything runs in your browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={user ? '/rooms' : '/register'} className="xp-btn text-[12px] font-bold">
                  {user ? 'Enter the range' : 'Enlist - it is free'}
                </Link>
                <Link href="/paths/ics-fundamentals" className="xp-btn text-[12px]">Start the fundamentals</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms list view */}
        <GroupBox title="Rooms" icon="layers" bodyClass="">
          <div className="xp-list">
            <div className="xp-list-head text-[11px]">
              <div className="flex-1">Name</div>
              <div className="w-24 hidden sm:block">Difficulty</div>
              <div className="w-40 hidden md:block">Protocols</div>
              <div className="w-16 text-right">Points</div>
            </div>
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.slug}`} className="xp-row text-[12px]">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Icon.gauge size={16} />
                  <span className="truncate font-semibold text-[#0a3ec9]">{room.title}</span>
                  {room.hasWebLab && <span className="tag-plate px-1 text-[9px]">CONSOLE</span>}
                </div>
                <div className="w-24 hidden sm:block"><DifficultyBadge difficulty={room.difficulty} /></div>
                <div className="mono w-40 truncate text-[11px] text-[#39506f] hidden md:block">
                  {room.protocols.map(protocolLabel).join(', ') || '-'}
                </div>
                <div className="mono w-16 text-right font-bold text-[#9a4d00]">{room.points}</div>
              </Link>
            ))}
          </div>
        </GroupBox>

        {/* Recent activity list */}
        <GroupBox title="Recent activity" icon="activity" bodyClass="">
          <div className="xp-list">
            {activity.length === 0 ? (
              <div className="p-3 text-[12px] text-[#5a5a52]">No solves yet. Be the first blood.</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="xp-row text-[12px]" style={{ cursor: 'default' }}>
                  <span className="w-5">
                    {a.first_blood
                      ? <span title="First blood" className="text-[#cc0000]"><Icon.bolt size={13} /></span>
                      : <span className="text-[#157a0e]"><Icon.check size={13} /></span>}
                  </span>
                  <span className="flex-1 truncate">
                    <Link href={`/u/${a.username}`} className="font-semibold text-[#0a3ec9] hover:underline">{a.username}</Link>
                    <span className="text-[#39506f]"> solved a task in </span>
                    <span className="text-[#1a2432]">{a.room_title}</span>
                  </span>
                  <span className="mono w-20 text-right text-[11px] text-[#5a5a52]">{timeAgo(a.solved_at)}</span>
                </div>
              ))
            )}
          </div>
        </GroupBox>
      </div>
    </div>
  );
}
