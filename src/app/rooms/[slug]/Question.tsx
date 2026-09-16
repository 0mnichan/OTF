'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';

interface Hint { id: number; cost: number; body?: string }
interface QuestionData {
  id: number; ref: string; prompt: string; kind: string; points: number;
  placeholder: string; hints: Hint[];
  options?: string[];
  solved: boolean;
}

export function Question({ q, index }: { q: QuestionData; index: number }) {
  const [solved, setSolved] = useState(q.solved);
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'correct' | 'wrong' | 'rate' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [award, setAward] = useState<number | null>(null);
  const [firstBlood, setFirstBlood] = useState(false);
  const [hints, setHints] = useState<Hint[]>(q.hints);
  const [explain, setExplain] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (solved) return;
    const submitted = q.kind === 'choice' ? String(choice ?? '') : value;
    if (q.kind === 'ack') { /* ack still posts */ }
    else if (submitted.trim() === '') return;

    setState('checking');
    try {
      const res = await fetch('/api/rooms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, value: submitted }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setState('rate');
        setMessage(`Too many attempts. Wait ${data.retryAfter ?? 60}s.`);
        return;
      }
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong.');
        return;
      }
      if (data.correct) {
        setSolved(true);
        setState('correct');
        setAward(data.points ?? 0);
        setFirstBlood(Boolean(data.firstBlood));
        setExplain(data.explain ?? '');
        if (data.badges?.length) {
          setMessage(`Badge unlocked: ${data.badges.map((b: any) => b.title).join(', ')}`);
        }
      } else {
        setState('wrong');
        setMessage('Not quite. Try again.');
      }
    } catch {
      setState('error');
      setMessage('Network error.');
    }
  }

  async function revealHint(hintId: number) {
    const res = await fetch('/api/rooms/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hintId }),
    });
    if (res.ok) {
      const data = await res.json();
      setHints((hs) => hs.map((h) => (h.id === hintId ? { ...h, body: data.body } : h)));
    }
  }

  return (
    <div className={`card p-4 transition-colors ${solved ? 'border-[var(--color-process)]' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`mono grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs ${solved ? 'bg-[var(--color-process)] text-black' : 'bg-[var(--color-panel)] text-[var(--color-ink-dim)]'}`}>
          {solved ? <Icon.check size={16} /> : index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--color-ink)]">{q.prompt}</p>
            <span className="mono shrink-0 text-xs text-[var(--color-hazard)]">{q.points} pts</span>
          </div>

          {!solved ? (
            <form onSubmit={submit} className="mt-3">
              {q.kind === 'choice' && q.options ? (
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt, i) => (
                    <label key={i} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${choice === i ? 'border-[var(--color-hazard)] bg-[color-mix(in_srgb,var(--color-hazard)_8%,transparent)]' : 'border-[var(--color-panel-border)] hover:border-[var(--color-ink-faint)]'}`}>
                      <input type="radio" name={`q-${q.id}`} checked={choice === i} onChange={() => setChoice(i)} className="accent-[var(--color-hazard)]" />
                      {opt}
                    </label>
                  ))}
                  <button type="submit" disabled={choice === null || state === 'checking'} className="mt-1 self-start rounded-md bg-[var(--color-hazard)] px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40">
                    {state === 'checking' ? 'Checking…' : 'Submit'}
                  </button>
                </div>
              ) : q.kind === 'ack' ? (
                <button type="submit" disabled={state === 'checking'} className="rounded-md bg-[var(--color-hazard)] px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40">
                  {state === 'checking' ? '…' : 'Mark as read'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={q.placeholder || (q.kind === 'dynamic' ? 'OTF{…}' : 'Your answer')}
                    className="mono flex-1 rounded-md border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-hazard)]"
                  />
                  <button type="submit" disabled={state === 'checking'} className="shrink-0 rounded-md bg-[var(--color-hazard)] px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40">
                    {state === 'checking' ? '…' : 'Submit'}
                  </button>
                </div>
              )}

              {(state === 'wrong' || state === 'rate' || state === 'error') && (
                <p className={`mt-2 text-xs ${state === 'wrong' ? 'text-[var(--color-trip)]' : 'text-[var(--color-hazard)]'}`}>{message}</p>
              )}
            </form>
          ) : (
            <div className="mt-2">
              <p className="mono flex items-center gap-1.5 text-xs text-[var(--color-process)]">
                <Icon.check size={13} />
                Solved{award !== null && award > 0 ? ` · +${award} pts` : ''}
                {firstBlood && <span className="ml-1 flex items-center gap-1 text-[var(--color-trip)]"><Icon.bolt size={12} /> FIRST BLOOD</span>}
              </p>
              {message && <p className="mt-1 text-xs text-[var(--color-hazard)]">{message}</p>}
              {explain && <p className="mt-2 rounded-md bg-[var(--color-panel)] p-2.5 text-xs text-[var(--color-ink-dim)]">{explain}</p>}
            </div>
          )}

          {hints.length > 0 && !solved && (
            <div className="mt-3 flex flex-col gap-1.5">
              {hints.map((h) => (
                <div key={h.id}>
                  {h.body ? (
                    <div className="rounded-md border border-[var(--color-hazard-dim)] bg-[color-mix(in_srgb,var(--color-hazard)_6%,transparent)] p-2.5 text-xs text-[var(--color-ink-dim)]">
                      <span className="mono mr-1 text-[var(--color-hazard)]">HINT:</span>{h.body}
                    </div>
                  ) : (
                    <button onClick={() => revealHint(h.id)} className="mono flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-hazard)]">
                      <Icon.alertTriangle size={12} /> Reveal hint {h.cost > 0 ? `(−${h.cost} pts)` : '(free)'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
