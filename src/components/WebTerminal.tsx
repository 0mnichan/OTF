'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createWorld, runCommand, tick } from '@/lib/webterm/engine.mjs';

interface Line { text: string; kind?: 'in' | 'out' | 'alert' }

/**
 * A fully in-browser OT lab console. No Docker, no server round-trip: the
 * scenario world runs client-side, and the simulated devices reveal the
 * player's own per-user flags (passed in from the server) only when the
 * objective is actually reached.
 */
export function WebTerminal({
  scenario,
  flags,
  briefing,
}: {
  scenario: string;
  flags: Record<string, string>;
  briefing?: string;
}) {
  const worldRef = useRef<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [live, setLive] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the world once (per scenario/flags).
  if (!worldRef.current) {
    try {
      worldRef.current = createWorld(scenario, { flags });
    } catch {
      worldRef.current = null;
    }
  }

  const banner: Line[] = [
    { text: 'OT Operations Console [Version 1.0]', kind: 'out' },
    { text: '(c) OTF training range. All targets simulated. No internet egress.', kind: 'out' },
    { text: '', kind: 'out' },
    { text: "Type 'help' for commands. This is a real interpreter — solve it by doing.", kind: 'out' },
    { text: '', kind: 'out' },
  ];

  useEffect(() => {
    if (lines.length === 0) setLines(banner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drainAlerts = useCallback(() => {
    const w = worldRef.current;
    if (!w || !w.alerts.length) return;
    const alerts = w.alerts.splice(0).map((text: string) => ({ text, kind: 'alert' as const }));
    setLines((ls) => [...ls, ...alerts]);
  }, []);

  // Live process tick (tank / breaker scenarios advance over time).
  useEffect(() => {
    const w = worldRef.current;
    if (!w?.sim || (w.sim.type !== 'tank')) return;
    if (!live) return;
    const t = setInterval(() => {
      tick(w);
      drainAlerts();
    }, 1000);
    return () => clearInterval(t);
  }, [live, drainAlerts]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = worldRef.current;
    const cmdText = input;
    setHistory((h) => (cmdText.trim() ? [cmdText, ...h].slice(0, 100) : h));
    setHistIdx(-1);
    setInput('');

    const promptLine: Line = { text: `${w?.prompt ?? 'C:\\>'} ${cmdText}`, kind: 'in' };
    if (!w) { setLines((ls) => [...ls, promptLine, { text: 'console unavailable', kind: 'out' }]); return; }

    const res = runCommand(w, cmdText);
    if (res.clear) { setLines(banner); return; }
    // Any write that could start the process turns the live tick on.
    if (w.sim?.type === 'tank') setLive(true);
    drainAlerts();
    setLines((ls) => [...ls, promptLine, ...res.lines.map((text: string) => ({ text, kind: 'out' as const }))]);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      if (history[next] != null) { setHistIdx(next); setInput(history[next]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(history[next]); }
    }
  }

  return (
    <div className="card">
      <div className="title-bar flex items-center gap-2 px-1.5 py-1">
        <span className="mono text-[12px]">cmd.exe — control LAN [{scenario}]</span>
        {live && <span className="mono ml-2 text-[10px] text-[#7fff7f]">● PROCESS LIVE</span>}
        <div className="ml-auto flex items-center gap-1">
          <span className="title-btn">_</span>
          <span className="title-btn">▢</span>
          <span className="title-btn">✕</span>
        </div>
      </div>
      {briefing && (
        <div className="mono border-b-2 border-[var(--w95-shadow)] bg-[var(--w95-face)] px-2 py-1.5 text-[11px] text-black">
          {briefing}
        </div>
      )}
      <div
        ref={bodyRef}
        onClick={() => inputRef.current?.focus()}
        className="mono h-80 overflow-y-auto bg-black px-3 py-2 text-[12.5px] leading-snug"
        style={{ color: '#c8c8c8' }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{
            color: l.kind === 'in' ? '#ffffff' : l.kind === 'alert' ? '#ff5555' : '#c0c0c0',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{l.text || '\u00a0'}</div>
        ))}
        <form onSubmit={submit} className="flex items-center gap-1">
          <span style={{ color: '#7fff7f' }}>{worldRef.current?.prompt ?? 'C:\\>'}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 border-none bg-transparent p-0 text-[12.5px] outline-none"
            style={{ color: '#ffffff', boxShadow: 'none' }}
          />
        </form>
      </div>
    </div>
  );
}
