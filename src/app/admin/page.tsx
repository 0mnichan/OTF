import Link from 'next/link';
import { requireRole } from '@/lib/session';
import { all, get } from '@/lib/db.mjs';
import { listUsers } from '@/lib/users.mjs';
import { Icon } from '@/components/icons';
import { Stat } from '@/components/ui';
import { timeAgo } from '@/lib/format';

export const metadata = { title: 'Admin - OTF' };

export default async function AdminPage() {
  await requireRole('admin');

  const users = listUsers({ limit: 50 });
  const runningLabs = all(
    `SELECT li.id, li.state, li.created_at, li.expires_at, u.username, r.title AS room
       FROM lab_instances li JOIN users u ON u.id = li.user_id JOIN rooms r ON r.id = li.room_id
      WHERE li.state IN ('queued','starting','running','stopping')
      ORDER BY li.created_at DESC`,
  );
  const audit = all('SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 20');
  const stats = {
    users: get('SELECT COUNT(*) AS n FROM users').n,
    submissions: get('SELECT COUNT(*) AS n FROM submissions').n,
    solves: get('SELECT COUNT(*) AS n FROM question_progress').n,
    labs: runningLabs.length,
  };
  const shared = all(`SELECT * FROM audit_log WHERE action = 'flag.shared' ORDER BY id DESC LIMIT 10`);

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Icon.shield size={24} /> Admin console</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="user" label="Users" value={stats.users} />
        <Stat icon="flag" label="Submissions" value={stats.submissions} />
        <Stat icon="check" label="Solves" value={stats.solves} />
        <Stat icon="terminal" label="Running labs" value={stats.labs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Running labs */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Running labs</h2>
          <div className="card">
            {runningLabs.length === 0 ? (
              <div className="p-4 text-sm text-[var(--color-ink-faint)]">No labs running.</div>
            ) : (
              <div className="divide-y divide-[var(--color-panel-border)]">
                {runningLabs.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="live-dot h-2 w-2 rounded-full bg-[var(--color-process)]" />
                    <span className="font-medium">{l.username}</span>
                    <span className="text-[var(--color-ink-faint)]">{l.room}</span>
                    <span className="mono ml-auto text-xs text-[var(--color-ink-faint)]">{l.state}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {shared.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-lg font-semibold text-[var(--color-trip)]">
                <Icon.alertTriangle size={18} /> Flag-sharing signals
              </h2>
              <div className="card divide-y divide-[var(--color-panel-border)]">
                {shared.map((s: any) => {
                  let detail: any = {};
                  try { detail = JSON.parse(s.detail); } catch { /* */ }
                  return (
                    <div key={s.id} className="px-4 py-2.5 text-sm">
                      <span className="font-medium">{s.username ?? 'someone'}</span>
                      <span className="text-[var(--color-ink-faint)]"> submitted a flag issued to user #{detail.issuedTo} in </span>
                      <span className="mono text-xs">{detail.room}</span>
                      <span className="mono ml-2 text-[11px] text-[var(--color-ink-faint)]">{timeAgo(s.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Users */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Users</h2>
          <div className="card max-h-[500px] divide-y divide-[var(--color-panel-border)] overflow-y-auto">
            {users.map((u: any) => (
              <div key={u.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <Link href={`/u/${u.username}`} className="font-medium hover:underline">{u.username}</Link>
                <span className={`mono rounded px-1.5 py-0.5 text-[10px] ${u.role === 'admin' ? 'bg-[var(--color-trip)] text-black' : u.role === 'author' ? 'bg-[var(--color-conduit)] text-white' : 'text-[var(--color-ink-faint)]'}`}>{u.role}</span>
                <span className="mono ml-auto text-xs text-[var(--color-hazard)]">{u.points} pts</span>
                <span className="mono text-[11px] text-[var(--color-ink-faint)]">{u.last_seen_at ? timeAgo(u.last_seen_at) : 'never'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Audit log */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Audit log</h2>
        <div className="card divide-y divide-[var(--color-panel-border)] font-mono text-xs">
          {audit.length === 0 ? (
            <div className="p-4 text-[var(--color-ink-faint)]">Nothing logged yet.</div>
          ) : (
            audit.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 px-4 py-2">
                <span className="text-[var(--color-hazard)]">{a.action}</span>
                <span className="text-[var(--color-ink-dim)]">{a.username ?? '-'}</span>
                <span className="ml-auto text-[var(--color-ink-faint)]">{timeAgo(a.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
