import Link from 'next/link';
import { Icon } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="text-[var(--color-hazard)]"><Icon.alertTriangle size={48} /></div>
      <h1 className="mono text-4xl font-bold">404</h1>
      <p className="text-[var(--color-ink-dim)]">
        That point is not in the register map. The page you asked for does not exist.
      </p>
      <Link href="/" className="rounded-md bg-[var(--color-hazard)] px-4 py-2 font-medium text-black hover:brightness-110">
        Back to safety
      </Link>
    </div>
  );
}
