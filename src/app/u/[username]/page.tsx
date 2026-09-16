import Link from 'next/link';
import { notFound } from 'next/navigation';
import { userProfile } from '@/lib/queries.mjs';
import { rankFor } from '@/lib/scoring.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { DifficultyBadge, Stat, ProgressBar } from '@/components/ui';
import { timeAgo, pluralize } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username} — OTF` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = userProfile(username);
  if (!profile) notFound();
  const { user, completedRooms, badges, solves, firstBloods, rank: position } = profile;
  const rank = rankFor(user.points);
  const me = await currentUser();
  const isMe = me && me.id === user.id;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-hazard)]">
          <Icon.user size={40} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            {isMe && <Link href="/settings" className="mono rounded-md border border-[var(--color-panel-border)] px-2 py-0.5 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">edit</Link>}
          </div>
          <div className="mono mt-1 flex items-center gap-2 text-sm text-[var(--color-hazard)]">
            <Icon.cpu size={15} /> {rank.name}
          </div>
          {user.bio && <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-dim)]">{user.bio}</p>}
          {rank.next && (
            <div className="mt-3 max-w-xs">
              <div className="mono mb-1 flex justify-between text-[11px] text-[var(--color-ink-faint)]">
                <span>{rank.name}</span><span>{rank.next.name} · {rank.next.min} pts</span>
              </div>
              <ProgressBar value={user.points - rank.min} max={rank.next.min - rank.min} />
            </div>
          )}
        </div>
        <div className="mono text-right">
          <div className="text-3xl font-bold text-[var(--color-hazard)]">{user.points}</div>
          <div className="text-xs text-[var(--color-ink-faint)]">points · rank #{position}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="check" label="Challenges solved" value={solves} />
        <Stat icon="layers" label="Rooms completed" value={completedRooms.length} />
        <Stat icon="bolt" label="First bloods" value={firstBloods} />
        <Stat icon="award" label="Badges" value={badges.length} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Badges */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Badges</h2>
          {badges.length === 0 ? (
            <div className="card p-6 text-sm text-[var(--color-ink-faint)]">No badges yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {badges.map((b: any) => (
                <div key={b.slug} className="card flex items-center gap-2.5 p-3" title={b.description}>
                  <span className="text-[var(--color-hazard)]"><Icon.award size={20} /></span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.title}</div>
                    <div className="truncate text-[11px] text-[var(--color-ink-faint)]">{timeAgo(b.awarded_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed rooms */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Rooms completed</h2>
          {completedRooms.length === 0 ? (
            <div className="card p-6 text-sm text-[var(--color-ink-faint)]">No rooms completed yet.</div>
          ) : (
            <div className="card divide-y divide-[var(--color-panel-border)]">
              {completedRooms.map((r: any) => (
                <Link key={r.slug} href={`/rooms/${r.slug}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-panel)]">
                  <span className="text-[var(--color-process)]"><Icon.check size={15} /></span>
                  <span className="flex-1 text-sm">{r.title}</span>
                  <DifficultyBadge difficulty={r.difficulty} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
