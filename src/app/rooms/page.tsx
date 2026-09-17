import { listRooms, roomStats } from '@/lib/queries.mjs';
import { progressByRoom, lockedRoomIds } from '@/lib/scoring.mjs';
import { get } from '@/lib/db.mjs';
import { currentUser } from '@/lib/session';
import { RoomFilters } from './RoomFilters';

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Each room is a self-contained scenario. Work the tasks, submit the flags, own the plant.
          {!user && ' Log in to track progress and spawn labs.'}
        </p>
      </div>
      <RoomFilters rooms={cards} allProtocols={allProtocols} />
    </div>
  );
}
