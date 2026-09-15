import React, { useEffect, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';
import { RoundEndPanel } from './Warmup.jsx';

export default function Obstacle({ roomId }) {
  const { isHost } = useGame();
  const [rows, setRows] = useState([]);
  const [revealed, setRevealed] = useState({}); // rowId -> answer text
  const [rowGuess, setRowGuess] = useState({});
  const [phraseGuess, setPhraseGuess] = useState('');
  const [solved, setSolved] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    function onStarted(payload) {
      if (payload.round !== 'obstacle') return;
      setRows(payload.rows);
      setRevealed({});
      setSolved(null);
    }
    function onRowResult(r) {
      if (r.correct) setRevealed((prev) => ({ ...prev, [r.rowId]: r.answer }));
      setMessage(r.correct ? 'Trả lời đúng gợi ý hàng ngang!' : 'Sai rồi, người khác có thể thử.');
    }
    function onSolved(r) {
      setSolved(r);
    }
    socket.on('round:started', onStarted);
    socket.on('obstacle:rowResult', onRowResult);
    socket.on('obstacle:solved', onSolved);
    socket.emit('room:sync', { roomId });
    return () => {
      socket.off('round:started', onStarted);
      socket.off('obstacle:rowResult', onRowResult);
      socket.off('obstacle:solved', onSolved);
    };
  }, [roomId]);

  function answerRow(rowId) {
    socket.emit('obstacle:answerRow', { roomId, rowId, guess: rowGuess[rowId] || '' });
  }

  function guessPhrase(e) {
    e.preventDefault();
    socket.emit('obstacle:guessPhrase', { roomId, guess: phraseGuess });
  }

  if (solved) {
    return (
      <div>
        <div className="olympia-panel p-8 text-center mb-4">
          <h2 className="text-xl font-semibold text-olympia-navy">Đã tìm ra từ khóa!</h2>
          <p className="text-2xl font-bold text-olympia-gold mt-2">{solved.phrase}</p>
        </div>
        <RoundEndPanel title="Kết thúc Vượt chướng ngại vật" isHost={isHost} onNext={() => socket.emit('round:next', { roomId })} />
      </div>
    );
  }

  return (
    <div className="olympia-panel p-8">
      <h2 className="text-xl font-semibold text-olympia-navy mb-4">Vượt chướng ngại vật</h2>
      {message && <p className="text-sm text-slate-500 mb-3">{message}</p>}
      <div className="space-y-3 mb-6">
        {rows.map((row) => (
          <div key={row.id} className="border rounded-lg p-3">
            <p className="text-sm font-medium mb-2">{row.clue}</p>
            {revealed[row.id] ? (
              <p className="text-green-600 font-semibold">{revealed[row.id]}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                  value={rowGuess[row.id] || ''}
                  onChange={(e) => setRowGuess((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  placeholder="Trả lời gợi ý hàng ngang..."
                />
                <button className="olympia-btn-secondary text-sm" onClick={() => answerRow(row.id)}>
                  Gửi
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={guessPhrase} className="flex gap-2 border-t pt-4">
        <input
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-olympia-gold"
          value={phraseGuess}
          onChange={(e) => setPhraseGuess(e.target.value)}
          placeholder="Đoán từ khóa chướng ngại vật..."
        />
        <button className="olympia-btn-primary">Đoán từ khóa</button>
      </form>
    </div>
  );
}
