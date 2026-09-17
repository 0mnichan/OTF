import Link from 'next/link';
import { GoogleButton } from '@/components/GoogleButton';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { Icon } from '@/components/icons';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; field?: string }>;
}) {
  if (await currentUser()) redirect('/rooms');
  const { error } = await searchParams;
  const open = process.env.OTF_OPEN_REGISTRATION === '1';

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-[var(--color-hazard)] text-black">
          <Icon.bolt size={24} />
        </div>
        <h1 className="text-2xl font-bold">Enlist</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
          Free. Every target is a simulation.
        </p>
      </div>

      {!open && (
        <div className="mb-4 rounded-lg border border-[var(--color-hazard-dim)] bg-[color-mix(in_srgb,var(--color-hazard)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-hazard)]">
          Registration is invite-only on this instance. The first account created becomes the admin.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-[var(--color-trip)] bg-[color-mix(in_srgb,var(--color-trip)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-trip)]">
          {error}
        </div>
      )}

      <form action="/api/auth/register" method="post" className="card flex flex-col gap-4 p-6">
        <GoogleButton />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Callsign (username)</span>
          <input name="username" required autoFocus minLength={3} maxLength={24} pattern="[a-zA-Z0-9_\-]+"
            className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Email</span>
          <input name="email" type="email" required autoComplete="email"
            className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Password <span className="text-[var(--color-ink-faint)]">(min 10 chars)</span></span>
          <input name="password" type="password" required minLength={10} autoComplete="new-password"
            className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <button type="submit" className="mt-1 rounded-md bg-[var(--color-hazard)] px-4 py-2 font-medium text-black hover:brightness-110">
          Create account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-ink-faint)]">
        Already enlisted? <Link href="/login" className="text-[var(--color-info)] hover:underline">Log in</Link>
      </p>
    </div>
  );
}
