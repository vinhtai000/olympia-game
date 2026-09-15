import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGame } from '../GameContext.jsx';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { room, isHost } = useGame();

  useEffect(() => {
    function onGameStarted() {
      navigate(`/game/${roomId}`);
    }
    socket.on('round:started', onGameStarted);
    return () => socket.off('round:started', onGameStarted);
  }, [roomId, navigate]);

  function copyRoomId() {
    navigator.clipboard?.writeText(roomId);
  }

  function handleStart() {
    socket.emit('room:start', { roomId });
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Đang kết nối tới phòng...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-olympia-navy to-olympia-blue">
      <div className="olympia-panel w-full max-w-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-sm">Mã phòng</p>
            <button onClick={copyRoomId} className="text-3xl font-bold tracking-widest text-olympia-navy">
              {roomId}
            </button>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Lớp {room.grade}</p>
            <p>{room.players.length}/5 người chơi</p>
          </div>
        </div>

        <ul className="space-y-2 mb-6">
          {room.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2">
              <span className="font-medium">
                {p.name} {p.isHost && <span className="text-xs text-olympia-gold ml-1">(Chủ phòng)</span>}
              </span>
              <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-slate-300'}`} />
            </li>
          ))}
        </ul>

        {isHost ? (
          <button className="olympia-btn-primary w-full" onClick={handleStart} disabled={room.players.length < 1}>
            Bắt đầu trận đấu
          </button>
        ) : (
          <p className="text-center text-slate-500">Đang chờ chủ phòng bắt đầu...</p>
        )}
      </div>
    </div>
  );
}
