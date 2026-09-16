import Link from 'next/link';
import { listPaths } from '@/lib/queries.mjs';
import { progressByRoom } from '@/lib/scoring.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { DifficultyBadge, ProgressBar } from '@/components/ui';

export const metadata = { title: 'Paths — OTF' };

export default async function PathsPage() {
  const user = await currentUser();
  const paths = listPaths();
  const progress = user ? progressByRoom(user.id) : new Map();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Learning paths</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Curated sequences that take you from first principles to full plant compromise.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {paths.map((path: any) => {
          const done = path.rooms.filter((r: any) => progress.get(r.id)?.completed_at).length;
          return (
            <Link key={path.id} href={`/paths/${path.slug}`} className="card group flex flex-col gap-4 p-5 transition-colors hover:border-[var(--color-hazard-dim)]">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-panel)] text-[var(--color-hazard)]">
                  <Icon.path size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{path.title}</h2>
                  <span className="mono text-xs capitalize text-[var(--color-ink-faint)]">{path.difficulty} · {path.rooms.length} rooms</span>
                </div>
              </div>
              <p className="text-sm text-[var(--color-ink-dim)]">{path.summary}</p>
              <div className="mt-auto">
                <div className="mb-1.5 flex items-center gap-2">
                  {path.rooms.map((r: any) => (
                    <span key={r.id} title={r.title} className={`h-1.5 flex-1 rounded-full ${progress.get(r.id)?.completed_at ? 'bg-[var(--color-process)]' : 'bg-[var(--color-panel)]'}`} />
                  ))}
                </div>
                {user && <span className="mono text-xs text-[var(--color-ink-faint)]">{done}/{path.rooms.length} complete</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
