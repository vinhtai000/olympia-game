import React, { useEffect, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';
import { RoundEndPanel } from './Warmup.jsx';

export default function Obstacle({ roomId }) {
  const { isHost } = useGame();
  const [rows, setRows] = useState([]);
  const [secretPhraseCount, setSecretPhraseCount] = useState(0);
  const [revealed, setRevealed] = useState({}); // rowId -> answer text
  const [rowGuess, setRowGuess] = useState({});
  const [phraseGuess, setPhraseGuess] = useState('');
  const [solved, setSolved] = useState(null);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    function onStarted(payload) {
      if (payload.round !== 'obstacle') return;
      setRows(payload.rows || []);
      setSecretPhraseCount(payload.secretPhraseCharCount || 0);
      setRevealed({});
      setSolved(null);
      setChecking(false);
    }
    function onRowResult(r) {
      setChecking(false);
      if (r.correct) setRevealed((prev) => ({ ...prev, [r.rowId]: r.answer }));
      setMessage(r.correct ? 'Trả lời đúng gợi ý hàng ngang!' : 'Sai rồi, hãy thử hàng ngang khác hoặc đoán từ khóa!');
    }
    function onSolved(r) {
      setChecking(false);
      setSolved(r);
    }
    function onChecking() {
      setChecking(true);
    }
    socket.on('round:started', onStarted);
    socket.on('obstacle:rowResult', onRowResult);
    socket.on('obstacle:solved', onSolved);
    socket.on('obstacle:checking', onChecking);
    socket.emit('room:sync', { roomId });
    return () => {
      socket.off('round:started', onStarted);
      socket.off('obstacle:rowResult', onRowResult);
      socket.off('obstacle:solved', onSolved);
      socket.off('obstacle:checking', onChecking);
    };
  }, [roomId]);

  function answerRow(rowId) {
    if (checking) return;
    socket.emit('obstacle:answerRow', { roomId, rowId, guess: rowGuess[rowId] || '' });
  }

  function guessPhrase(e) {
    e.preventDefault();
    if (checking) return;
    socket.emit('obstacle:guessPhrase', { roomId, guess: phraseGuess });
  }

  if (solved) {
    return (
      <div>
        <div className="olympia-panel p-8 text-center mb-4">
          <h2 className="text-xl font-semibold text-olympia-navy">Đã tìm ra từ khóa chướng ngại vật!</h2>
          <p className="text-3xl font-extrabold text-olympia-gold mt-3 tracking-widest uppercase">{solved.phrase}</p>
        </div>
        <RoundEndPanel title="Kết thúc Vượt chướng ngại vật" isHost={isHost} onNext={() => socket.emit('round:next', { roomId })} />
      </div>
    );
  }

  return (
    <div className="olympia-panel p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-olympia-navy">Vượt chướng ngại vật</h2>
          {secretPhraseCount > 0 && (
            <p className="text-sm font-semibold text-olympia-gold">
              🎯 Từ khóa gồm <span className="underline font-extrabold">{secretPhraseCount}</span> chữ cái
            </p>
          )}
        </div>
        {checking && <p className="text-xs text-slate-500 animate-pulse font-medium">🤖 AI đang chấm câu trả lời...</p>}
      </div>

      {message && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-4">{message}</p>}

      <div className="space-y-4 mb-6">
        {rows.map((row, idx) => {
          const charLen = row.charCount || row.letterCount || 5;
          const isRevealed = !!revealed[row.id];
          const cleanAnswer = isRevealed ? String(revealed[row.id]).replace(/\s+/g, '').toUpperCase() : '';

          return (
            <div key={row.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Hàng ngang {idx + 1}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  {charLen} chữ cái
                </span>
              </div>

              <p className="text-sm font-medium text-slate-800 mb-3">{row.clue}</p>

              {/* Ô chữ Olympia representation */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {isRevealed ? (
                  cleanAnswer.split('').map((char, i) => (
                    <span
                      key={i}
                      className="w-8 h-8 flex items-center justify-center font-bold text-white bg-green-600 rounded text-sm shadow-sm"
                    >
                      {char}
                    </span>
                  ))
                ) : (
                  Array.from({ length: charLen }).map((_, i) => (
                    <span
                      key={i}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-400 bg-white border border-slate-300 rounded text-sm shadow-inner"
                    >
                      ?
                    </span>
                  ))
                )}
              </div>

              {!isRevealed && (
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white"
                    value={rowGuess[row.id] || ''}
                    disabled={checking}
                    onChange={(e) => setRowGuess((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder={`Nhập đáp án (${charLen} chữ cái)...`}
                  />
                  <button
                    className="olympia-btn-secondary text-sm px-4"
                    disabled={checking}
                    onClick={() => answerRow(row.id)}
                  >
                    Gửi
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={guessPhrase} className="border-t pt-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Bạn đã đoán ra Chướng ngại vật?
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olympia-gold bg-white"
            value={phraseGuess}
            disabled={checking}
            onChange={(e) => setPhraseGuess(e.target.value)}
            placeholder={secretPhraseCount ? `Nhập từ khóa (${secretPhraseCount} chữ cái)...` : "Nhập từ khóa chướng ngại vật..."}
          />
          <button className="olympia-btn-primary min-w-[120px]" disabled={checking}>
            Đoán từ khóa
          </button>
        </div>
      </form>
    </div>
  );
}
