/** Small presentation helpers shared across server components. */

export const DIFFICULTY_META: Record<string, { label: string; color: string }> = {
  intro: { label: 'Intro', color: 'var(--color-info)' },
  easy: { label: 'Easy', color: 'var(--color-process)' },
  medium: { label: 'Medium', color: 'var(--color-hazard)' },
  hard: { label: 'Hard', color: 'var(--color-trip)' },
  insane: { label: 'Insane', color: '#c678f5' },
};

export const PROTOCOL_LABELS: Record<string, string> = {
  modbus: 'Modbus',
  s7comm: 'S7comm',
  dnp3: 'DNP3',
  'iec-104': 'IEC-104',
  'ethernet-ip': 'EtherNet/IP',
  'opc-ua': 'OPC UA',
  bacnet: 'BACnet',
};

export function protocolLabel(p: string): string {
  return PROTOCOL_LABELS[p] ?? p;
}

export function purdueLabel(level: number): string {
  const names: Record<number, string> = {
    0: 'Process',
    1: 'Basic Control',
    2: 'Supervisory',
    3: 'Site Ops',
    4: 'Business',
    5: 'Enterprise',
  };
  return `L${level} ${names[level] ?? ''}`.trim();
}

export function timeAgo(iso: string): string {
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function pluralize(n: number, singular: string, plural = singular + 's'): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
