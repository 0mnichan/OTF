import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await currentUser()) redirect('/rooms');
  const { error, next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-[var(--color-hazard)] text-black">
          <Icon.bolt size={24} />
        </div>
        <h1 className="text-2xl font-bold">Log in to the range</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-faint)]">Resume where you left off.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--color-trip)] bg-[color-mix(in_srgb,var(--color-trip)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-trip)]">
          {error}
        </div>
      )}

      <form action="/api/auth/login" method="post" className="card flex flex-col gap-4 p-6">
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Email</span>
          <input name="email" type="email" required autoFocus autoComplete="email"
            className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Password</span>
          <input name="password" type="password" required autoComplete="current-password"
            className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <button type="submit" className="mt-1 rounded-md bg-[var(--color-hazard)] px-4 py-2 font-medium text-black hover:brightness-110">
          Log in
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-ink-faint)]">
        No account? <Link href="/register" className="text-[var(--color-info)] hover:underline">Enlist</Link>
      </p>
    </div>
  );
}
