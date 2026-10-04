import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';
import { RoundEndPanel } from './Warmup.jsx';

// How long (ms) before we auto-unblock checking if the server never responds
const AI_TIMEOUT_MS = 14000;

export default function Obstacle({ roomId }) {
  const { room, selfId, isHost } = useGame();
  const [rows, setRows] = useState([]);
  const [secretPhraseCount, setSecretPhraseCount] = useState(0);
  const [revealed, setRevealed] = useState({}); // rowId -> answer text
  const [rowGuess, setRowGuess] = useState({});
  const [phraseGuess, setPhraseGuess] = useState('');
  const [solved, setSolved] = useState(null);
  const [message, setMessage] = useState('');

  // Per-target checking: 'row:<rowId>' | 'phrase' | null
  const [checkingTarget, setCheckingTarget] = useState(null);
  // Per-target AI error: same shape as checkingTarget
  const [aiErrorTarget, setAiErrorTarget] = useState(null);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [allRowsRevealed, setAllRowsRevealed] = useState(false);

  // Safety-net timer ref
  const safetyTimer = useRef(null);

  // Start the safety timer; auto-unblocks after AI_TIMEOUT_MS if server never responds
  function startSafetyTimer(target) {
    clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      setCheckingTarget(null);
      setAiErrorTarget(target);
      setAiErrorMsg('Dịch vụ AI phản hồi quá chậm. Câu trả lời chưa được chấm — hãy thử lại!');
    }, AI_TIMEOUT_MS);
  }

  function clearSafetyTimer() {
    clearTimeout(safetyTimer.current);
  }

  useEffect(() => {
    function onStarted(payload) {
      if (payload.round !== 'obstacle') return;
      setRows(payload.rows || []);
      setSecretPhraseCount(payload.secretPhraseCharCount || 0);
      setRevealed({});
      setSolved(null);
      setCheckingTarget(null);
      setAiErrorTarget(null);
      setAiErrorMsg('');
      setAllRowsRevealed(false);
      clearSafetyTimer();
    }

    function onChecking({ rowId, phrase }) {
      const target = phrase ? 'phrase' : `row:${rowId}`;
      setCheckingTarget(target);
      setAiErrorTarget(null);
      setAiErrorMsg('');
      startSafetyTimer(target);
    }

    function onRowResult(r) {
      if (r.by === selfId) {
        clearSafetyTimer();
        setCheckingTarget(null);
        setAiErrorTarget(null);
        if (r.correct) {
          setMessage('✅ Trả lời đúng gợi ý hàng ngang (+10 điểm)!');
        } else {
          setMessage('❌ Chưa chính xác gợi ý hàng ngang!');
        }
      }
      if (r.correct) {
        setRevealed((prev) => ({ ...prev, [r.rowId]: r.answer }));
      }
    }

    function onGuessResult(r) {
      if (r.by === selfId) {
        clearSafetyTimer();
        setCheckingTarget(null);
        setMessage('❌ Chưa chính xác từ khóa chướng ngại vật!');
      }
    }

    function onAllRowsRevealed() {
      setAllRowsRevealed(true);
      setMessage('🎉 Tất cả hàng ngang đã mở! Hãy đoán từ khóa chướng ngại vật!');
    }

    function onAiError({ rowId, context, message: msg }) {
      clearSafetyTimer();
      setCheckingTarget(null);
      const target = context === 'phrase' ? 'phrase' : `row:${rowId}`;
      setAiErrorTarget(target);
      setAiErrorMsg(msg || 'Dịch vụ AI gặp lỗi. Hãy thử lại!');
    }

    function onSolved(r) {
      clearSafetyTimer();
      setCheckingTarget(null);
      setSolved(r);
    }

    socket.on('round:started', onStarted);
    socket.on('obstacle:checking', onChecking);
    socket.on('obstacle:rowResult', onRowResult);
    socket.on('obstacle:guessResult', onGuessResult);
    socket.on('obstacle:allRowsRevealed', onAllRowsRevealed);
    socket.on('obstacle:aiError', onAiError);
    socket.on('obstacle:solved', onSolved);
    socket.emit('room:sync', { roomId });

    return () => {
      socket.off('round:started', onStarted);
      socket.off('obstacle:checking', onChecking);
      socket.off('obstacle:rowResult', onRowResult);
      socket.off('obstacle:guessResult', onGuessResult);
      socket.off('obstacle:allRowsRevealed', onAllRowsRevealed);
      socket.off('obstacle:aiError', onAiError);
      socket.off('obstacle:solved', onSolved);
      clearSafetyTimer();
    };
  }, [roomId, selfId]);

  function answerRow(rowId) {
    const target = `row:${rowId}`;
    if (checkingTarget === target) return;
    setAiErrorTarget(null);
    setAiErrorMsg('');
    socket.emit('obstacle:answerRow', { roomId, rowId, guess: rowGuess[rowId] || '' });
  }

  function guessPhrase(e) {
    e.preventDefault();
    if (checkingTarget === 'phrase') return;
    setAiErrorTarget(null);
    setAiErrorMsg('');
    socket.emit('obstacle:guessPhrase', { roomId, guess: phraseGuess });
  }

  if (solved) {
    const solverName = room?.players.find((p) => p.id === solved.solvedBy)?.name || (solved.solvedBy === selfId ? 'Bạn' : 'Người chơi');
    return (
      <div>
        <div className="olympia-panel p-8 text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 mb-2">
            🎉 Đã tìm ra từ khóa chướng ngại vật!
          </span>
          <p className="text-3xl font-extrabold text-olympia-gold my-3 tracking-widest uppercase">{solved.phrase}</p>
          <p className="text-sm font-semibold text-slate-700">
            {solverName} đã giải chính xác (+{solved.points || 10} điểm)
          </p>
        </div>
        <RoundEndPanel title="Kết thúc Vượt chướng ngại vật" isHost={isHost} onNext={() => socket.emit('round:next', { roomId })} />
      </div>
    );
  }

  const isAnyChecking = !!checkingTarget;

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
        {isAnyChecking && (
          <p className="text-xs text-slate-500 animate-pulse font-medium">🤖 AI đang chấm câu trả lời...</p>
        )}
      </div>

      {message && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-4">{message}</p>}

      <div className="space-y-4 mb-6">
        {rows.map((row, idx) => {
          const charLen = row.charCount || row.letterCount || 5;
          const isRevealed = !!revealed[row.id];
          const cleanAnswer = isRevealed ? String(revealed[row.id]).replace(/\s+/g, '').toUpperCase() : '';
          const target = `row:${row.id}`;
          const isThisChecking = checkingTarget === target;
          const hasAiError = aiErrorTarget === target;

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

              {/* AI error banner for this row */}
              {hasAiError && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2 text-xs text-orange-800 font-medium">
                  ⚠️ {aiErrorMsg}
                </div>
              )}

              {/* Checking indicator for this specific row */}
              {isThisChecking && (
                <p className="text-xs text-slate-500 animate-pulse mb-2">🤖 AI đang chấm hàng ngang này...</p>
              )}

              {!isRevealed && (
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white"
                    value={rowGuess[row.id] || ''}
                    disabled={isThisChecking}
                    onChange={(e) => setRowGuess((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && !isThisChecking && answerRow(row.id)}
                    placeholder={`Nhập đáp án (${charLen} chữ cái)...`}
                  />
                  <button
                    className={`text-sm px-4 rounded-lg font-medium transition-colors ${
                      hasAiError
                        ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                        : 'olympia-btn-secondary'
                    }`}
                    disabled={isThisChecking}
                    onClick={() => answerRow(row.id)}
                  >
                    {isThisChecking ? '⏳' : hasAiError ? '🔄 Thử lại' : 'Gửi'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guess the secret phrase */}
      <form onSubmit={guessPhrase} className={`border-t pt-4 ${allRowsRevealed ? 'border-green-300' : ''}`}>
        {allRowsRevealed && (
          <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 mb-3 text-sm font-semibold text-green-800 text-center animate-pulse">
            🎉 Tất cả hàng ngang đã mở! Đoán ngay từ khóa chướng ngại vật!
          </div>
        )}
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Bạn đã đoán ra Chướng ngại vật?
        </label>

        {aiErrorTarget === 'phrase' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2 text-xs text-orange-800 font-medium">
            ⚠️ {aiErrorMsg}
          </div>
        )}

        <div className="flex gap-2">
          <input
            className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${allRowsRevealed ? 'focus:ring-green-400 border-green-300' : 'focus:ring-olympia-gold'}`}
            value={phraseGuess}
            disabled={checkingTarget === 'phrase'}
            onChange={(e) => setPhraseGuess(e.target.value)}
            placeholder={secretPhraseCount ? `Nhập từ khóa (${secretPhraseCount} chữ cái)...` : 'Nhập từ khóa chướng ngại vật...'}
            autoFocus={allRowsRevealed}
          />
          <button
            className={`min-w-[120px] rounded-lg font-medium transition-colors ${
              aiErrorTarget === 'phrase'
                ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                : allRowsRevealed
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'olympia-btn-primary'
            }`}
            disabled={checkingTarget === 'phrase'}
          >
            {checkingTarget === 'phrase' ? '⏳ Đang chấm...' : aiErrorTarget === 'phrase' ? '🔄 Thử lại' : 'Đoán từ khóa'}
          </button>
        </div>
      </form>
    </div>
  );
}
