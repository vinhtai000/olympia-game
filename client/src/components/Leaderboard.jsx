import React from 'react';
import { useGame } from '../GameContext.jsx';

const ROUND_LABEL = {
  lobby: 'Sảnh chờ',
  warmup: 'Khởi động',
  obstacle: 'Vượt chướng ngại vật',
  acceleration: 'Tăng tốc',
  finish: 'Về đích',
  ended: 'Kết thúc'
};

export default function Leaderboard() {
  const { room, selfId } = useGame();
  if (!room) return null;

  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <aside className="olympia-panel p-4 w-full md:w-64 shrink-0">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Vòng thi: {ROUND_LABEL[room.status] || room.status}
      </p>
      <ul className="space-y-2">
        {sorted.map((p, idx) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              p.id === selfId ? 'bg-olympia-gold/20 border border-olympia-gold' : 'bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2 font-medium truncate">
              <span className="text-slate-400 text-xs w-4">{idx + 1}</span>
              {p.name}
            </span>
            <span className="font-bold text-olympia-blue">{p.score}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
