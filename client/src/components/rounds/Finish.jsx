import React, { useEffect, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';

export default function Finish({ roomId }) {
  const { room, selfId, isHost } = useGame();
  const [packs, setPacks] = useState({});
  const [turnPlayerId, setTurnPlayerId] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null); // {id,text,points,pickedBy,starred}
  const [answer, setAnswer] = useState('');
  const [stealOpen, setStealOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [starUsed, setStarUsed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    function onStarted(payload) {
      if (payload.round !== 'finish') return;
      setPacks(payload.packs);
      setActiveQuestion(null);
    }
    function onTurn({ playerId }) {
      setTurnPlayerId(playerId);
      setActiveQuestion(null);
      setLastResult(null);
      setAnswer('');
    }
    function onQuestionShown(q) {
      setActiveQuestion(q);
      setStealOpen(false);
      setChecking(false);
      setAnswer('');
    }
    function onChecking() {
      setChecking(true);
    }
    function onQuestionResult(r) {
      setChecking(false);
      setLastResult(r);
      setStealOpen(!!r.stealOpen);
      setPacks((prev) => removeQuestion(prev, activeQuestion?.id));
    }
    function onStealResult(r) {
      setChecking(false);
      setLastResult((prev) => ({ ...prev, steal: r }));
      if (r.correct) setStealOpen(false);
    }
    function onStarUsed({ playerId }) {
      if (playerId === selfId) setStarUsed(true);
    }
    function onEnded() {
      setEnded(true);
    }
    socket.on('round:started', onStarted);
    socket.on('finish:turn', onTurn);
    socket.on('finish:questionShown', onQuestionShown);
    socket.on('finish:checking', onChecking);
    socket.on('finish:questionResult', onQuestionResult);
    socket.on('finish:stealResult', onStealResult);
    socket.on('finish:starUsed', onStarUsed);
    socket.on('finish:ended', onEnded);
    socket.emit('room:sync', { roomId });
    return () => {
      socket.off('round:started', onStarted);
      socket.off('finish:turn', onTurn);
      socket.off('finish:questionShown', onQuestionShown);
      socket.off('finish:checking', onChecking);
      socket.off('finish:questionResult', onQuestionResult);
      socket.off('finish:stealResult', onStealResult);
      socket.off('finish:starUsed', onStarUsed);
      socket.off('finish:ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId, roomId, activeQuestion?.id]);

  const isMyTurn = turnPlayerId === selfId;
  const myName = room?.players.find((p) => p.id === selfId)?.name;
  const turnName = room?.players.find((p) => p.id === turnPlayerId)?.name;

  function pick(points, q) {
    socket.emit('finish:pick', { roomId, points, questionId: q.id });
  }

  function useStar() {
    socket.emit('finish:useStar', { roomId });
  }

  function submitAnswer(e) {
    e.preventDefault();
    if (checking) return;
    socket.emit('finish:answer', { roomId, answer });
  }

  function submitSteal(e) {
    e.preventDefault();
    if (checking) return;
    socket.emit('finish:steal', { roomId, answer });
    setAnswer('');
  }

  if (ended) {
    return (
      <div className="olympia-panel p-8 text-center">
        <h2 className="text-xl font-semibold text-olympia-navy mb-4">Kết thúc Về đích</h2>
        {isHost ? (
          <button className="olympia-btn-primary" onClick={() => socket.emit('round:next', { roomId })}>
            Xem kết quả chung cuộc
          </button>
        ) : (
          <p className="text-slate-500">Chờ chủ phòng công bố kết quả...</p>
        )}
      </div>
    );
  }

  return (
    <div className="olympia-panel p-8">
      <h2 className="text-xl font-semibold text-olympia-navy mb-1">Về đích</h2>
      <p className="text-sm text-slate-500 mb-6">
        Lượt của: <span className="font-semibold">{turnName || '...'}</span>
      </p>

      {!activeQuestion && (
        <div>
          {isMyTurn && (
            <div className="mb-4">
              <button
                onClick={useStar}
                disabled={starUsed}
                className={`olympia-btn ${starUsed ? 'bg-slate-200 text-slate-400' : 'bg-yellow-400 text-olympia-navy'}`}
              >
                ⭐ Dùng Ngôi sao hy vọng
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(packs).map(([points, qs]) => (
              <div key={points} className="border rounded-xl p-3">
                <p className="font-semibold text-olympia-navy mb-2">{points} điểm</p>
                <div className="space-y-2">
                  {qs.length === 0 && <p className="text-xs text-slate-400">Hết câu hỏi</p>}
                  {qs.map((q) => (
                    <button
                      key={q.id}
                      className="w-full olympia-btn-secondary text-xs py-1.5"
                      disabled={!isMyTurn}
                      onClick={() => pick(Number(points), q)}
                    >
                      Chọn câu hỏi
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!isMyTurn && <p className="text-slate-500 mt-4">Chờ {turnName} chọn câu hỏi...</p>}
        </div>
      )}

      {activeQuestion && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="olympia-btn-primary text-xs py-1 px-3">{activeQuestion.points} điểm</span>
            {activeQuestion.starred && <span className="text-yellow-500 font-semibold text-sm">⭐ Ngôi sao hy vọng</span>}
          </div>
          <p className="text-lg font-medium text-olympia-navy mb-4">{activeQuestion.text}</p>

          {activeQuestion.pickedBy === selfId && !lastResult && (
            <form onSubmit={submitAnswer} className="flex gap-2">
              <input
                autoFocus
                className="flex-1 border rounded-lg px-3 py-2"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={checking}
                placeholder="Nhập câu trả lời..."
              />
              <button className="olympia-btn-primary min-w-[90px]" disabled={checking}>
                {checking ? '⏳ Kiểm tra...' : 'Trả lời'}
              </button>
            </form>
          )}

          {checking && <p className="mt-4 text-sm text-slate-500 animate-pulse">🤖 AI đang kiểm tra câu trả lời...</p>}

          {activeQuestion.pickedBy !== selfId && !lastResult && (
            <p className="text-slate-500">Chờ {turnName} trả lời...</p>
          )}

          {lastResult && (
            <div className="mt-4 border-t pt-4 space-y-2">
              <p className={lastResult.correct ? 'text-green-600 font-medium' : 'text-olympia-red font-medium'}>
                {lastResult.correct ? `Trả lời đúng! (${lastResult.delta >= 0 ? '+' : ''}${lastResult.delta} điểm)` : 'Trả lời sai.'}
              </p>
              {stealOpen && activeQuestion.pickedBy !== selfId && !lastResult.steal?.correct && (
                <form onSubmit={submitSteal} className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={checking}
                    placeholder="Giành điểm: nhập câu trả lời..."
                  />
                  <button className="olympia-btn-secondary min-w-[90px]" disabled={checking}>
                    {checking ? '⏳ Kiểm tra...' : 'Giành điểm'}
                  </button>
                </form>
              )}
              {lastResult.steal && (
                <p className={lastResult.steal.correct ? 'text-green-600' : 'text-slate-400 text-sm'}>
                  {lastResult.steal.correct ? 'Giành điểm thành công!' : 'Giành điểm không thành công.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function removeQuestion(packs, questionId) {
  const next = {};
  for (const [pts, qs] of Object.entries(packs)) {
    next[pts] = qs.filter((q) => q.id !== questionId);
  }
  return next;
}
