'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/icons';

interface Endpoint { name: string; label: string; expose: string; url?: string; hostname?: string }
interface LabState {
  id?: string; state: string; endpoints?: Endpoint[]; expires_at?: string; error?: string;
}

const ACTIVE = new Set(['queued', 'starting', 'running', 'stopping']);

export function LabPanel({ roomSlug, briefing, available }: { roomSlug: string; briefing: string; available: boolean }) {
  const [lab, setLab] = useState<LabState | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/labs/status?room=${roomSlug}`);
      if (res.ok) {
        const data = await res.json();
        setLab(data.instance ?? null);
      }
    } catch { /* transient */ }
  }, [roomSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll while a lab is spinning up or running; tick a clock for the countdown.
  useEffect(() => {
    if (!lab || !ACTIVE.has(lab.state)) return;
    const poll = setInterval(refresh, lab.state === 'running' ? 15000 : 3000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [lab, refresh]);

  async function act(action: 'start' | 'stop' | 'extend') {
    setBusy(true);
    try {
      const res = await fetch('/api/labs/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomSlug }),
      });
      const data = await res.json();
      if (res.ok) setLab(data.instance ?? null);
      else setLab({ state: 'failed', error: data.error ?? 'Lab control failed.' });
    } finally {
      setBusy(false);
    }
  }

  const running = lab && lab.state === 'running';
  const spinning = lab && (lab.state === 'queued' || lab.state === 'starting');

  let remaining = '';
  if (running && lab.expires_at) {
    const ms = new Date(lab.expires_at.replace(' ', 'T') + 'Z').getTime() - now;
    if (ms > 0) {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      remaining = `${m}:${String(s).padStart(2, '0')}`;
    } else remaining = 'expiring…';
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2.5">
        <Icon.terminal size={16} />
        <span className="mono text-sm font-medium">Lab environment</span>
        {running && (
          <span className="mono ml-auto flex items-center gap-1.5 text-xs text-[var(--color-process)]">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-process)]" /> RUNNING · {remaining}
          </span>
        )}
        {spinning && <span className="mono ml-auto text-xs text-[var(--color-hazard)]">PROVISIONING…</span>}
      </div>

      <div className="p-4">
        {!available ? (
          <p className="text-sm text-[var(--color-ink-faint)]">
            The lab orchestrator is not configured on this instance. This room's content is fully
            readable; live labs require the orchestrator service (see <span className="mono">docs/DEPLOY.md</span>).
          </p>
        ) : !lab || lab.state === 'stopped' || lab.state === 'failed' ? (
          <div>
            {briefing && <p className="mb-3 text-sm text-[var(--color-ink-dim)]">{briefing}</p>}
            {lab?.error && <p className="mb-3 text-xs text-[var(--color-trip)]">{lab.error}</p>}
            <button onClick={() => act('start')} disabled={busy}
              className="flex items-center gap-2 rounded-md bg-[var(--color-hazard)] px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-40">
              <Icon.bolt size={16} /> {busy ? 'Requesting…' : 'Spawn lab'}
            </button>
          </div>
        ) : spinning ? (
          <div className="flex items-center gap-3 py-2 text-sm text-[var(--color-ink-dim)]">
            <span className="live-dot h-2 w-2 rounded-full bg-[var(--color-hazard)]" />
            Building your isolated plant network. This takes a few seconds…
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {briefing && <p className="text-sm text-[var(--color-ink-dim)]">{briefing}</p>}
            <div className="flex flex-col gap-2">
              {(lab.endpoints ?? []).map((ep) => (
                <div key={ep.name} className="flex items-center gap-2 rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2">
                  <Icon.network size={15} />
                  <span className="text-sm">{ep.label || ep.name}</span>
                  {ep.hostname && <span className="mono text-xs text-[var(--color-ink-faint)]">{ep.hostname}</span>}
                  {ep.url && (ep.expose === 'terminal' || ep.expose === 'http') && (
                    <a href={ep.url} target="_blank" rel="noreferrer"
                      className="mono ml-auto flex items-center gap-1 rounded bg-[var(--color-conduit)] px-2 py-1 text-xs text-white hover:brightness-110">
                      {ep.expose === 'terminal' ? 'Open shell' : 'Open'} <Icon.chevronRight size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => act('extend')} disabled={busy}
                className="mono flex items-center gap-1.5 rounded-md border border-[var(--color-panel-border)] px-3 py-1.5 text-xs hover:border-[var(--color-hazard-dim)] disabled:opacity-40">
                <Icon.clock size={13} /> Extend
              </button>
              <button onClick={() => act('stop')} disabled={busy}
                className="mono flex items-center gap-1.5 rounded-md border border-[var(--color-panel-border)] px-3 py-1.5 text-xs text-[var(--color-trip)] hover:border-[var(--color-trip)] disabled:opacity-40">
                <Icon.alertTriangle size={13} /> Terminate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
