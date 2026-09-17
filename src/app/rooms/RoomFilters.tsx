'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { DifficultyBadge } from '@/components/ui';
import { protocolLabel } from '@/lib/format';

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
  const [difficulty, setDifficulty] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [status, setStatus] = useState<'all' | 'todo' | 'done'>('all');

  const filtered = useMemo(() => rooms.filter((r) => {
    if (difficulty && r.difficulty !== difficulty) return false;
    if (protocol && !r.protocols.includes(protocol)) return false;
    if (status === 'done' && !r.completed) return false;
    if (status === 'todo' && r.completed) return false;
    if (query) {
      const hay = `${r.title} ${r.summary} ${r.tags.join(' ')} ${r.protocols.join(' ')}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  }), [rooms, query, difficulty, protocol, status]);

  return (
    <div>
      {/* Toolbar: search + XP dropdowns, like an Explorer address/filter bar */}
      <div className="mb-2 flex flex-wrap items-center gap-2 border border-[#919b9c] bg-[#ece9d8] p-1.5">
        <div className="flex items-center gap-1">
          <Icon.terminal size={13} />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="mono w-48 text-[12px]"
          />
        </div>
        <label className="flex items-center gap-1 text-[12px]">Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="text-[12px]">
            <option value="">Any</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[12px]">Protocol
          <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="text-[12px]">
            <option value="">Any</option>
            {allProtocols.map((p) => <option key={p} value={p}>{protocolLabel(p)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[12px]">Status
          <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'todo' | 'done')} className="text-[12px]">
            <option value="all">All</option>
            <option value="todo">Not done</option>
            <option value="done">Completed</option>
          </select>
        </label>
        <span className="ml-auto mono text-[11px] text-[#5a5a52]">{filtered.length} of {rooms.length}</span>
      </div>

      {/* Details list view */}
      <div className="xp-list">
        <div className="xp-list-head text-[11px]">
          <div className="w-6" />
          <div className="flex-1">Name</div>
          <div className="w-24 hidden sm:block">Difficulty</div>
          <div className="w-40 hidden lg:block">Protocols</div>
          <div className="w-20 hidden md:block">Progress</div>
          <div className="w-14 text-right">Points</div>
        </div>
        {filtered.map((room) => {
          const inner = (
            <>
              <div className="w-6">
                {room.completed ? <span className="text-[#157a0e]"><Icon.check size={15} /></span>
                  : room.locked ? <Icon.lock size={14} /> : <Icon.gauge size={15} />}
              </div>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className={`truncate font-semibold ${room.locked ? 'text-[#5a5a52]' : 'text-[#0a3ec9]'}`}>{room.title}</span>
                {room.hasLab && !room.locked && <span className="tag-plate px-1 text-[9px]">CONSOLE</span>}
                {room.free && <span className="border border-[#157a0e] px-1 text-[9px] text-[#157a0e]">FREE</span>}
              </div>
              <div className="w-24 hidden sm:block"><DifficultyBadge difficulty={room.difficulty} /></div>
              <div className="mono w-40 truncate text-[11px] text-[#39506f] hidden lg:block">
                {room.protocols.map(protocolLabel).join(', ') || '-'}
              </div>
              <div className="mono w-20 text-[11px] text-[#39506f] hidden md:block">
                {room.locked ? <span className="flex items-center gap-1"><Icon.lock size={11} /> locked</span>
                  : room.total > 0 ? `${room.solved}/${room.total}` : '-'}
              </div>
              <div className="mono w-14 text-right font-bold text-[#9a4d00]">{room.points}</div>
            </>
          );
          if (room.locked) {
            return <div key={room.id} className="xp-row text-[12px] opacity-70" style={{ cursor: 'default' }} title={`Requires: ${room.lockedBy.join(', ')}`}>{inner}</div>;
          }
          return <Link key={room.id} href={`/rooms/${room.slug}`} className="xp-row text-[12px]">{inner}</Link>;
        })}
      </div>
    </div>
  );
}
