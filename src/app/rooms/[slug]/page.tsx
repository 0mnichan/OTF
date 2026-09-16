import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getRoomBySlug, getRoomTasks, roomPrereqs, solvedQuestionIds } from '@/lib/queries.mjs';
import { currentUser } from '@/lib/session';
import { get } from '@/lib/db.mjs';
import { renderMarkdown } from '@/lib/markdown';
import { Icon } from '@/components/icons';
import { DifficultyBadge, Tag, Pill, Stat, ProgressBar } from '@/components/ui';
import { protocolLabel, purdueLabel } from '@/lib/format';
import { Question } from './Question';
import { LabPanel } from './LabPanel';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoomBySlug(slug);
  return { title: room ? `${room.title} — OTF` : 'Room — OTF' };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoomBySlug(slug);
  if (!room) notFound();

  const user = await currentUser();
  const tasks = getRoomTasks(room.id);
  const prereqs = roomPrereqs(room.id);
  const solved = user ? solvedQuestionIds(user.id, room.id) : new Set<number>();

  // Gate the room on prerequisites for signed-in users.
  let lockedBy: { slug: string; title: string }[] = [];
  if (user && prereqs.length) {
    lockedBy = prereqs.filter(
      (p) =>
        !get(
          `SELECT 1 FROM room_progress rp JOIN rooms r ON r.id = rp.room_id
            WHERE rp.user_id = ? AND r.slug = ? AND rp.completed_at IS NOT NULL`,
          user.id,
          p.slug,
        ),
    );
  }

  const totalQuestions = tasks.reduce((n: number, t: any) => n + t.questions.length, 0);
  const solvedCount = tasks.reduce(
    (n: number, t: any) => n + t.questions.filter((q: any) => solved.has(q.id)).length,
    0,
  );
  const orchestratorConfigured = Boolean(process.env.OTF_ORCHESTRATOR_URL);
  const attackLink = (t: string) =>
    `https://collaborate.mitre.org/attackics/index.php/Technique/${t}`;

  let questionIndex = 0;

  return (
    <div>
      <Link href="/rooms" className="mono mb-4 inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
        ← all rooms
      </Link>

      {/* Header */}
      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-[var(--color-panel-border)] bg-gradient-to-br from-[var(--color-panel-raised)] to-[var(--color-panel)] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={room.difficulty} />
            {room.hasLab && <Pill tone="lab">LIVE LAB</Pill>}
            {room.free && <Pill tone="free">FREE</Pill>}
          </div>
          <h1 className="mt-3 text-3xl font-bold">{room.title}</h1>
          <p className="mt-2 max-w-2xl text-[var(--color-ink-dim)]">{room.summary}</p>
          {room.banner && (
            <p className="mono mt-3 flex items-center gap-2 text-sm text-[var(--color-hazard)]">
              <Icon.alertTriangle size={14} /> {room.banner}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {room.protocols.map((p: string) => <Tag key={p}>{protocolLabel(p)}</Tag>)}
            {room.purdue_levels.map((l: number) => <Tag key={l}>{purdueLabel(l)}</Tag>)}
            {room.attack_ics.map((t: string) => (
              <a key={t} href={attackLink(t)} target="_blank" rel="noreferrer">
                <Tag>ATT&CK {t}</Tag>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column: tasks */}
        <div className="order-2 lg:order-1">
          {lockedBy.length > 0 ? (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <Icon.lock size={32} />
              <h2 className="text-lg font-semibold">Room locked</h2>
              <p className="max-w-md text-sm text-[var(--color-ink-dim)]">
                Complete the prerequisite {lockedBy.length > 1 ? 'rooms' : 'room'} first:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {lockedBy.map((p) => (
                  <Link key={p.slug} href={`/rooms/${p.slug}`} className="mono rounded-md border border-[var(--color-hazard-dim)] px-3 py-1.5 text-sm text-[var(--color-hazard)] hover:bg-[color-mix(in_srgb,var(--color-hazard)_8%,transparent)]">
                    {p.title} →
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {tasks.map((task: any) => (
                <section key={task.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                    <span className="text-[var(--color-hazard)]"><Icon.layers size={20} /></span>
                    {task.title}
                  </h2>
                  <div className="prose mb-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(task.body_md) }} />
                  {task.questions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {task.questions.map((q: any) => {
                        questionIndex += 1;
                        return (
                          <Question
                            key={q.id}
                            index={questionIndex}
                            q={{
                              id: q.id, ref: q.ref, prompt: q.prompt, kind: q.kind,
                              points: q.points, placeholder: q.placeholder,
                              options: q.kind === 'choice' ? q.answer_spec.options : undefined,
                              hints: q.hints, solved: solved.has(q.id),
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 flex flex-col gap-4 lg:order-2">
          {user ? (
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-dim)]">Your progress</span>
                <span className="mono text-[var(--color-hazard)]">{solvedCount}/{totalQuestions}</span>
              </div>
              <ProgressBar value={solvedCount} max={totalQuestions} tone={solvedCount === totalQuestions ? 'process' : 'hazard'} />
              {solvedCount === totalQuestions && totalQuestions > 0 && (
                <p className="mono mt-2 flex items-center gap-1.5 text-xs text-[var(--color-process)]">
                  <Icon.check size={13} /> Room complete
                </p>
              )}
            </div>
          ) : (
            <div className="card p-4 text-sm">
              <p className="text-[var(--color-ink-dim)]">
                <Link href={`/login?next=/rooms/${room.slug}`} className="text-[var(--color-info)] hover:underline">Log in</Link> to
                submit flags, track progress and spawn the lab.
              </p>
            </div>
          )}

          {room.hasLab && user && lockedBy.length === 0 && (
            <LabPanel roomSlug={room.slug} briefing={room.lab_spec?.briefing ?? ''} available={orchestratorConfigured} />
          )}

          <div className="card p-4">
            <div className="mono mb-3 text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">Briefing</div>
            <div className="flex flex-col gap-2.5 text-sm">
              <Row icon="flag" label="Points" value={`${room.points}`} />
              <Row icon="clock" label="Est. time" value={`${room.est_minutes} min`} />
              <Row icon="user" label="Author" value={room.author} />
              {room.hasLab && <Row icon="terminal" label="Lab TTL" value={`${room.lab_spec?.ttl_minutes ?? 60} min`} />}
            </div>
            {prereqs.length > 0 && (
              <div className="mt-3 border-t border-[var(--color-panel-border)] pt-3">
                <div className="mono mb-1.5 text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">Prerequisites</div>
                {prereqs.map((p) => (
                  <Link key={p.slug} href={`/rooms/${p.slug}`} className="block text-sm text-[var(--color-info)] hover:underline">{p.title}</Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  const I = Icon[icon as keyof typeof Icon];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-ink-faint)]"><I size={15} /></span>
      <span className="text-[var(--color-ink-dim)]">{label}</span>
      <span className="mono ml-auto text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
