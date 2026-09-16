/** A small inline icon set (stroke-based), so we ship no icon dependency. */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export const Icon = {
  gauge: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 14 8 9" /><circle cx="12" cy="14" r="8" /><path d="M4 14h1M19 14h1M12 6v1" /></svg>
  ),
  flag: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 21V4M4 4h13l-2 4 2 4H4" /></svg>
  ),
  lock: (p: IconProps) => (
    <svg {...base(p)}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  ),
  check: (p: IconProps) => (
    <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  bolt: (p: IconProps) => (
    <svg {...base(p)}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
  ),
  shield: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /></svg>
  ),
  cpu: (p: IconProps) => (
    <svg {...base(p)}><rect x="7" y="7" width="10" height="10" rx="1" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>
  ),
  droplet: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>
  ),
  radio: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a9 9 0 0 0 0 14M19 19a9 9 0 0 0 0-14" /></svg>
  ),
  network: (p: IconProps) => (
    <svg {...base(p)}><rect x="9" y="2" width="6" height="5" rx="1" /><rect x="2" y="17" width="6" height="5" rx="1" /><rect x="16" y="17" width="6" height="5" rx="1" /><path d="M12 7v5M12 12H5v5M12 12h7v5" /></svg>
  ),
  terminal: (p: IconProps) => (
    <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></svg>
  ),
  trophy: (p: IconProps) => (
    <svg {...base(p)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
  ),
  path: (p: IconProps) => (
    <svg {...base(p)}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 17V9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v0" /></svg>
  ),
  clock: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  layers: (p: IconProps) => (
    <svg {...base(p)}><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" /></svg>
  ),
  user: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  award: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="9" r="6" /><path d="m9 14-1 8 4-3 4 3-1-8" /></svg>
  ),
  logout: (p: IconProps) => (
    <svg {...base(p)}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 12h11M16 8l4 4-4 4" /></svg>
  ),
  chevronRight: (p: IconProps) => (
    <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
  ),
  alertTriangle: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3 2 20h20L12 3ZM12 9v5M12 17v.5" /></svg>
  ),
  eyeOff: (p: IconProps) => (
    <svg {...base(p)}><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.5 6.6C4.3 8 2.7 10 2 12c1.7 4 5.5 7 10 7 1.6 0 3.1-.4 4.4-1M9.9 5.2A9.9 9.9 0 0 1 12 5c4.5 0 8.3 3 10 7-.5 1.2-1.3 2.4-2.3 3.4" /></svg>
  ),
};

export type IconName = keyof typeof Icon;
