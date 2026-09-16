import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPathBySlug } from '@/lib/queries.mjs';
import { progressByRoom } from '@/lib/scoring.mjs';
import { get } from '@/lib/db.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { DifficultyBadge, Pill } from '@/components/ui';
import { protocolLabel } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = getPathBySlug(slug);
  return { title: path ? `${path.title} — OTF` : 'Path — OTF' };
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = getPathBySlug(slug);
  if (!path) notFound();
  const user = await currentUser();
  const progress = user ? progressByRoom(user.id) : new Map();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/paths" className="mono mb-4 inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">← all paths</Link>

      <div className="mb-8 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--color-hazard)] text-black">
          <Icon.path size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{path.title}</h1>
          <p className="mt-2 text-[var(--color-ink-dim)]">{path.description || path.summary}</p>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 pl-8">
        <div className="absolute bottom-6 left-[15px] top-6 w-px bg-[var(--color-panel-border)]" />
        {path.rooms.map((room: any, i: number) => {
          const p = progress.get(room.id);
          const total = get('SELECT COUNT(*) AS n FROM questions WHERE room_id = ?', room.id).n as number;
          const solved = p?.solved ?? 0;
          const completed = Boolean(p?.completed_at);
          return (
            <div key={room.id} className="relative">
              <div className={`absolute -left-8 top-4 grid h-8 w-8 place-items-center rounded-full border-2 ${completed ? 'border-[var(--color-process)] bg-[var(--color-process)] text-black' : 'border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-ink-dim)]'}`}>
                {completed ? <Icon.check size={16} /> : <span className="mono text-xs">{i + 1}</span>}
              </div>
              <Link href={`/rooms/${room.slug}`} className="card group flex items-center gap-3 p-4 transition-colors hover:border-[var(--color-hazard-dim)]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{room.title}</span>
                    <DifficultyBadge difficulty={room.difficulty} />
                    {room.hasLab && <Pill tone="lab">LAB</Pill>}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-ink-faint)]">{room.summary}</p>
                  <div className="mono mt-1 text-[11px] text-[var(--color-ink-faint)]">
                    {room.protocols.map(protocolLabel).join(' · ')} · {room.points} pts
                    {user && total > 0 && ` · ${solved}/${total} solved`}
                  </div>
                </div>
                <Icon.chevronRight size={18} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
