import { requireUser } from '@/lib/session';
import { Icon } from '@/components/icons';

export const metadata = { title: 'Settings — OTF' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser('/settings');
  const { saved } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Icon.user size={22} /> Settings</h1>
      {saved && (
        <div className="mb-4 rounded-lg border border-[var(--color-process)] bg-[color-mix(in_srgb,var(--color-process)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-process)]">
          Saved.
        </div>
      )}
      <form action="/api/profile" method="post" className="card flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Callsign</span>
          <input disabled value={user.username} className="mono cursor-not-allowed rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-ink-faint)]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-ink-dim)]">Bio</span>
          <textarea name="bio" defaultValue={user.bio} rows={4} maxLength={500}
            className="rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-hazard)]" />
        </label>
        <button type="submit" className="self-start rounded-md bg-[var(--color-hazard)] px-4 py-2 text-sm font-medium text-black hover:brightness-110">
          Save
        </button>
      </form>
    </div>
  );
}
