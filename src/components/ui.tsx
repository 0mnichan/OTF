import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { DIFFICULTY_META } from '@/lib/format';

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const meta = DIFFICULTY_META[difficulty] ?? { label: difficulty, color: 'var(--color-ink-dim)' };
  return (
    <span
      className="mono inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: meta.color, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {meta.label}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mono rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-dim)]">
      {children}
    </span>
  );
}

export function Stat({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  const I = Icon[icon];
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <div className="text-[var(--color-hazard)]"><I size={22} /></div>
      <div>
        <div className="mono text-lg font-semibold leading-none">{value}</div>
        <div className="text-xs text-[var(--color-ink-faint)]">{label}</div>
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'lab' | 'free' }) {
  const tones = {
    default: 'border-[var(--color-panel-border)] text-[var(--color-ink-dim)]',
    lab: 'border-[var(--color-conduit)] text-[var(--color-info)]',
    free: 'border-[var(--color-process)] text-[var(--color-process)]',
  };
  return (
    <span className={`mono rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
      <div className="text-[var(--color-ink-faint)]"><Icon.alertTriangle size={32} /></div>
      <div className="font-medium">{title}</div>
      {children && <div className="max-w-md text-sm text-[var(--color-ink-dim)]">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'hazard' }: { value: number; max: number; tone?: 'hazard' | 'process' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone === 'process' ? 'var(--color-process)' : 'var(--color-hazard)';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
