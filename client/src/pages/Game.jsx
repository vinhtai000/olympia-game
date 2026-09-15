import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../socket';
import { useGame } from '../GameContext.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import Warmup from '../components/rounds/Warmup.jsx';
import Obstacle from '../components/rounds/Obstacle.jsx';
import Acceleration from '../components/rounds/Acceleration.jsx';
import Finish from '../components/rounds/Finish.jsx';

export default function Game() {
  const { roomId } = useParams();
  const { room } = useGame();
  const [finalResult, setFinalResult] = useState(null);

  useEffect(() => {
    function onGameEnded(payload) {
      setFinalResult(payload);
    }
    socket.on('game:ended', onGameEnded);
    // Re-request room state in case we navigated here and missed a room:update
    socket.emit('room:sync', { roomId });
    return () => socket.off('game:ended', onGameEnded);
  }, [roomId]);

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center text-white">Đang tải trận đấu...</div>;
  }

  if (finalResult) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-olympia-navy to-olympia-blue">
        <div className="olympia-panel w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-olympia-navy mb-2">🏆 Chung cuộc</h1>
          <p className="text-lg mb-4">
            Nhà vô địch: <span className="font-bold text-olympia-gold">{finalResult.winner?.name}</span>
          </p>
          <ol className="space-y-2 text-left">
            {finalResult.scores.map((p, idx) => (
              <li key={p.id} className="flex justify-between bg-slate-100 rounded-lg px-4 py-2">
                <span>
                  {idx + 1}. {p.name}
                </span>
                <span className="font-semibold">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-gradient-to-b from-olympia-navy to-olympia-blue">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
        <Leaderboard />
        <div className="flex-1">
          {room.status === 'warmup' && <Warmup roomId={roomId} />}
          {room.status === 'obstacle' && <Obstacle roomId={roomId} />}
          {room.status === 'acceleration' && <Acceleration roomId={roomId} />}
          {room.status === 'finish' && <Finish roomId={roomId} />}
          {room.status === 'lobby' && <p className="text-white">Đang chờ bắt đầu...</p>}
        </div>
      </div>
    </div>
  );
}
