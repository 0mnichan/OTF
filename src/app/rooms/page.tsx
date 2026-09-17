import Link from 'next/link';
import { listRooms, roomStats } from '@/lib/queries.mjs';
import { progressByRoom, lockedRoomIds } from '@/lib/scoring.mjs';
import { get } from '@/lib/db.mjs';
import { currentUser } from '@/lib/session';
import { RoomFilters } from './RoomFilters';
import { TaskPane, TaskGroup, TaskLink, DetailRow } from '@/components/xp';

export const metadata = { title: 'Rooms - OTF' };

export default async function RoomsPage() {
  const user = await currentUser();
  const rooms = listRooms();
  const progress = user ? progressByRoom(user.id) : new Map();
  const locked = user ? lockedRoomIds(user.id) : new Set<number>();

  // Map prereq room ids -> titles for the "locked by" hint.
  const titleBySlug = new Map(rooms.map((r) => [r.slug, r.title]));

  const cards = rooms.map((room) => {
    const p = progress.get(room.id);
    const total = get('SELECT COUNT(*) AS n FROM questions WHERE room_id = ?', room.id).n as number;
    const prereqs = get(
      `SELECT GROUP_CONCAT(r.slug) AS slugs FROM room_prereqs rp JOIN rooms r ON r.id = rp.requires_room_id WHERE rp.room_id = ?`,
      room.id,
    ).slugs as string | null;
    const lockedBy = (prereqs ? prereqs.split(',') : []).map((s) => titleBySlug.get(s) ?? s);
    return {
      id: room.id, slug: room.slug, title: room.title, summary: room.summary,
      difficulty: room.difficulty, protocols: room.protocols, purdue_levels: room.purdue_levels,
      tags: room.tags, points: room.points, est_minutes: room.est_minutes,
      hasLab: room.hasLab, free: room.free,
      solved: p?.solved ?? 0, total, completed: Boolean(p?.completed_at),
      locked: locked.has(room.id), lockedBy,
    };
  });

  const allProtocols = [...new Set(rooms.flatMap((r) => r.protocols))].sort();

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <TaskPane>
          <TaskGroup title="Room Tasks" icon="layers">
            <TaskLink href="/paths" icon="path">Follow a learning path</TaskLink>
            <TaskLink href="/leaderboard" icon="trophy">View leaderboard</TaskLink>
            <TaskLink href="/paths/famous-incidents" icon="bolt">Famous OT incidents</TaskLink>
          </TaskGroup>
          <TaskGroup title="Details" icon="cpu">
            <DetailRow label="Rooms" value={cards.length} />
            <DetailRow label="With console" value={cards.filter((c) => c.hasLab).length} />
            {user && <DetailRow label="Completed" value={cards.filter((c) => c.completed).length} />}
          </TaskGroup>
          <TaskGroup title="Legend" icon="flag">
            <div className="text-[11px] text-[#39506f]">CONSOLE = in-browser terminal lab. FREE = no account tier required. A padlock means a prerequisite room is not finished.</div>
          </TaskGroup>
        </TaskPane>

        <div className="min-w-0 flex-1">
          <h1 className="mb-1 text-xl font-bold text-[#0a246a]">Rooms</h1>
          <p className="mb-2 text-[12px] text-[#1a2432]">
            Each room is a self-contained scenario. Work the tasks, open the console, submit the flags.
            {!user && ' Log in to track progress and get your own flags.'}
          </p>
          <RoomFilters rooms={cards} allProtocols={allProtocols} />
        </div>
      </div>
    </div>
  );
}
