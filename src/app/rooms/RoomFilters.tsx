'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { DifficultyBadge, Tag, Pill, ProgressBar } from '@/components/ui';
import { protocolLabel, purdueLabel } from '@/lib/format';

interface RoomCard {
  id: number; slug: string; title: string; summary: string; difficulty: string;
  protocols: string[]; purdue_levels: number[]; tags: string[]; points: number;
  est_minutes: number; hasLab: boolean; free: boolean;
  solved: number; total: number; completed: boolean; locked: boolean;
  lockedBy: string[];
}

const DIFFICULTIES = ['intro', 'easy', 'medium', 'hard', 'insane'];

export function RoomFilters({ rooms, allProtocols }: { rooms: RoomCard[]; allProtocols: string[] }) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'todo' | 'done'>('all');

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (difficulty && r.difficulty !== difficulty) return false;
      if (protocol && !r.protocols.includes(protocol)) return false;
      if (status === 'done' && !r.completed) return false;
      if (status === 'todo' && r.completed) return false;
      if (query) {
        const hay = `${r.title} ${r.summary} ${r.tags.join(' ')} ${r.protocols.join(' ')}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [rooms, query, difficulty, protocol, status]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]">
            <Icon.terminal size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms, protocols, tags…"
            className="mono w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-raised)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--color-hazard)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
                {d}
              </Chip>
            ))}
          </FilterGroup>
          <span className="mx-1 h-4 w-px bg-[var(--color-panel-border)]" />
          <FilterGroup label="Protocol">
            {allProtocols.map((p) => (
              <Chip key={p} active={protocol === p} onClick={() => setProtocol(protocol === p ? null : p)}>
                {protocolLabel(p)}
              </Chip>
            ))}
          </FilterGroup>
          <span className="mx-1 h-4 w-px bg-[var(--color-panel-border)]" />
          <FilterGroup label="Status">
            {(['all', 'todo', 'done'] as const).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="mb-3 text-sm text-[var(--color-ink-faint)]">
        {filtered.length} of {rooms.length} rooms
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((room) => (
          <RoomTile key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}

function RoomTile({ room }: { room: RoomCard }) {
  const body = (
    <div className={`card group relative flex h-full flex-col gap-3 p-4 transition-colors ${room.locked ? 'opacity-60' : 'hover:border-[var(--color-hazard-dim)]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-panel)] text-[var(--color-hazard)]">
            {room.completed ? <span className="text-[var(--color-process)]"><Icon.check size={20} /></span>
              : room.locked ? <Icon.lock size={18} /> : <Icon.gauge size={20} />}
          </div>
          <div>
            <div className="font-medium leading-tight">{room.title}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <DifficultyBadge difficulty={room.difficulty} />
              {room.hasLab && <Pill tone="lab">LAB</Pill>}
              {room.free && <Pill tone="free">FREE</Pill>}
            </div>
          </div>
        </div>
        <div className="mono shrink-0 text-right text-xs">
          <div className="text-[var(--color-hazard)]">{room.points} pts</div>
          <div className="flex items-center justify-end gap-1 text-[var(--color-ink-faint)]">
            <Icon.clock size={12} /> {room.est_minutes}m
          </div>
        </div>
      </div>

      <p className="line-clamp-2 flex-1 text-sm text-[var(--color-ink-dim)]">{room.summary}</p>

      <div className="flex flex-wrap gap-1.5">
        {room.protocols.map((p) => <Tag key={p}>{protocolLabel(p)}</Tag>)}
        {room.purdue_levels.length > 0 && (
          <Tag>{purdueLabel(Math.min(...room.purdue_levels))}{room.purdue_levels.length > 1 ? `–L${Math.max(...room.purdue_levels)}` : ''}</Tag>
        )}
      </div>

      {room.locked ? (
        <div className="mono flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
          <Icon.lock size={12} /> Requires: {room.lockedBy.join(', ')}
        </div>
      ) : room.total > 0 ? (
        <div className="flex items-center gap-2">
          <ProgressBar value={room.solved} max={room.total} tone={room.completed ? 'process' : 'hazard'} />
          <span className="mono shrink-0 text-[11px] text-[var(--color-ink-faint)]">{room.solved}/{room.total}</span>
        </div>
      ) : null}
    </div>
  );

  if (room.locked) return <div>{body}</div>;
  return <Link href={`/rooms/${room.slug}`}>{body}</Link>;
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="mono text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`mono rounded-md px-2 py-0.5 text-xs capitalize transition-colors ${
        active
          ? 'bg-[var(--color-hazard)] text-black'
          : 'border border-[var(--color-panel-border)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]'
      }`}
    >
      {children}
    </button>
  );
}
