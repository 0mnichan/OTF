import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from './icons';

/** An XP "group box": a flat titled panel, the Explorer/Control-Panel unit. */
export function GroupBox({
  title, icon, children, className = '', bodyClass = 'p-3',
}: { title?: ReactNode; icon?: IconName; children: ReactNode; className?: string; bodyClass?: string }) {
  const I = icon ? Icon[icon] : null;
  return (
    <div className={`group-box ${className}`}>
      {title != null && (
        <div className="gb-title flex items-center gap-1.5 text-[12px]">
          {I && <I size={14} />} {title}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

/** The blue Explorer task pane (left rail). */
export function TaskPane({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <aside className={`xp-taskpane w-full shrink-0 self-start lg:w-56 ${className}`}>{children}</aside>;
}

export function TaskGroup({ title, icon, children }: { title: string; icon?: IconName; children: ReactNode }) {
  const I = icon ? Icon[icon] : null;
  return (
    <div className="xp-taskgroup">
      <div className="hd text-[12px]">{I && <I size={14} />}{title}</div>
      <div className="bd flex flex-col gap-1 text-[12px]">{children}</div>
    </div>
  );
}

export function TaskLink({ href, icon, children, external }: { href: string; icon?: IconName; children: ReactNode; external?: boolean }) {
  const I = icon ? Icon[icon] : null;
  const inner = <>{I && <span className="text-[#2b6fe0]"><I size={13} /></span>}{children}</>;
  if (external) return <a className="xp-tasklink" href={href}>{inner}</a>;
  return <Link className="xp-tasklink" href={href}>{inner}</Link>;
}

/** A read-only field row, like the "Details" lines in an XP task pane. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-[12px]">
      <span className="text-[#39506f]">{label}</span>
      <span className="font-bold text-[#0a246a]">{value}</span>
    </div>
  );
}
