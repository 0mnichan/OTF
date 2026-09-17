import Link from 'next/link';
import { leaderboard } from '@/lib/scoring.mjs';
import { rankFor } from '@/lib/scoring.mjs';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';
import { pluralize } from '@/lib/format';

export const metadata = { title: 'Leaderboard - OTF' };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window } = await searchParams;
  const scope = window === '7d' ? '7d' : window === '30d' ? '30d' : 'all';
  const since = scope === '7d' ? '-7 days' : scope === '30d' ? '-30 days' : null;
  const rows = leaderboard({ limit: 100, since });
  const me = await currentUser();

  const medal = ['#f5c542', '#c0c4cc', '#cd7f32'];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon.trophy size={24} /> Leaderboard</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-dim)]">Who owns the most plants.</p>
        </div>
        <div className="flex gap-1">
          {(['all', '30d', '7d'] as const).map((w) => (
            <Link key={w} href={w === 'all' ? '/leaderboard' : `/leaderboard?window=${w}`}
              className={`mono rounded-md px-2.5 py-1 text-xs ${scope === w ? 'bg-[var(--color-hazard)] text-black' : 'border border-[var(--color-panel-border)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]'}`}>
              {w === 'all' ? 'All time' : w}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-[var(--color-ink-faint)]">
          No points scored in this window yet.
        </div>
      ) : (
        <div className="card divide-y divide-[var(--color-panel-border)]">
          {rows.map((row: any, i: number) => {
            const rank = rankFor(row.points);
            const isMe = me && me.id === row.id;
            return (
              <div key={row.id} className={`flex items-center gap-4 px-4 py-3 ${isMe ? 'bg-[color-mix(in_srgb,var(--color-hazard)_8%,transparent)]' : ''}`}>
                <div className="mono w-8 shrink-0 text-center text-lg font-bold" style={{ color: medal[i] ?? 'var(--color-ink-faint)' }}>
                  {i + 1}
                </div>
                <Link href={`/u/${row.username}`} className="min-w-0 flex-1">
                  <div className="font-medium hover:underline">{row.username}{isMe && <span className="mono ml-2 text-xs text-[var(--color-hazard)]">you</span>}</div>
                  <div className="mono text-xs text-[var(--color-ink-faint)]">{rank.name} · {pluralize(row.rooms ?? 0, 'room')}</div>
                </Link>
                <div className="mono shrink-0 text-right">
                  <div className="text-lg font-semibold text-[var(--color-hazard)]">{row.points}</div>
                  <div className="text-[11px] text-[var(--color-ink-faint)]">points</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
