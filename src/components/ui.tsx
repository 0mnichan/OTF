import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { DIFFICULTY_META } from '@/lib/format';

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const meta = DIFFICULTY_META[difficulty] ?? { label: difficulty, color: 'var(--color-ink-dim)' };
  return (
    <span
      className="mono inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: '#fff', background: meta.color }}
    >
      <span className="led" style={{ color: 'rgba(255,255,255,0.85)' }} />
      {meta.label}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mono bevel-in bg-[var(--color-panel-sunken)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-dim)]">
      {children}
    </span>
  );
}

export function Stat({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  const I = Icon[icon];
  return (
    <div className="card flex items-center gap-3 p-2">
      <div className="grid h-10 w-10 place-items-center bg-[var(--w95-face)] text-[#000080]" style={{ boxShadow: 'inset -1px -1px 0 #0a0a0a, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #dfdfdf' }}>
        <I size={20} />
      </div>
      <div className="bevel-in flex-1 self-stretch bg-white px-3 py-1.5">
        <div className="mono text-xl font-bold leading-none text-black">{value}</div>
        <div className="mono mt-1 text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</div>
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'lab' | 'free' }) {
  const tones = {
    default: 'bg-[var(--color-ink-faint)] text-white',
    lab: 'bg-[var(--color-navy)] text-white',
    free: 'bg-[var(--color-process)] text-white',
  };
  return (
    <span className={`mono px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
      <div className="text-[var(--color-hazard)]"><Icon.alertTriangle size={32} /></div>
      <div className="font-bold">{title}</div>
      {children && <div className="max-w-md text-sm text-[var(--color-ink-dim)]">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'hazard' }: { value: number; max: number; tone?: 'hazard' | 'process' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone === 'process' ? 'var(--color-process)' : 'var(--color-alarm)';
  // A segmented "bargraph", the way an HMI level indicator reads.
  return (
    <div className="bevel-in h-3 w-full overflow-hidden bg-[#0b1c33] p-[2px]">
      <div
        className="h-full transition-all"
        style={{
          width: `${pct}%`,
          background: `repeating-linear-gradient(90deg, ${color} 0, ${color} 6px, rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 8px)`,
        }}
      />
    </div>
  );
}
