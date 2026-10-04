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
  const [revealedAnswer, setRevealedAnswer] = useState(null);
  const [starUsed, setStarUsed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [aiError, setAiError] = useState(null); // {message} when AI fails
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    function onStarted(payload) {
      if (payload.round !== 'finish') return;
      setPacks(payload.packs);
      setActiveQuestion(null);
      setRevealedAnswer(null);
    }
    function onTurn({ playerId }) {
      setTurnPlayerId(playerId);
      setActiveQuestion(null);
      setLastResult(null);
      setRevealedAnswer(null);
      setStealOpen(false);
      setChecking(false);
      setAiError(null);
      setAnswer('');
    }
    function onQuestionShown(q) {
      setActiveQuestion(q);
      setStealOpen(false);
      setChecking(false);
      setAiError(null);
      setRevealedAnswer(null);
      setLastResult(null);
      setAnswer('');
    }
    function onChecking() {
      setChecking(true);
      setAiError(null);
    }
    function onAiError({ message }) {
      setChecking(false);
      setAiError({ message });
    }
    function onQuestionResult(r) {
      setChecking(false);
      setAiError(null);
      setLastResult(r);
      setStealOpen(!!r.stealOpen);
      if (r.answer) setRevealedAnswer(r.answer);
      setPacks((prev) => removeQuestion(prev, activeQuestion?.id));
    }
    function onStealResult(r) {
      setChecking(false);
      setAiError(null);
      setLastResult((prev) => ({ ...prev, steal: r }));
      if (r.correct) {
        setStealOpen(false);
        if (r.answer) setRevealedAnswer(r.answer);
      }
    }
    function onStealClosed({ answer }) {
      setStealOpen(false);
      if (answer) setRevealedAnswer(answer);
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
    socket.on('finish:aiError', onAiError);
    socket.on('finish:questionResult', onQuestionResult);
    socket.on('finish:stealResult', onStealResult);
    socket.on('finish:stealClosed', onStealClosed);
    socket.on('finish:starUsed', onStarUsed);
    socket.on('finish:ended', onEnded);
    socket.emit('room:sync', { roomId });

    return () => {
      socket.off('round:started', onStarted);
      socket.off('finish:turn', onTurn);
      socket.off('finish:questionShown', onQuestionShown);
      socket.off('finish:checking', onChecking);
      socket.off('finish:aiError', onAiError);
      socket.off('finish:questionResult', onQuestionResult);
      socket.off('finish:stealResult', onStealResult);
      socket.off('finish:stealClosed', onStealClosed);
      socket.off('finish:starUsed', onStarUsed);
      socket.off('finish:ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId, roomId, activeQuestion?.id]);

  const isMyTurn = turnPlayerId === selfId;
  const turnName = room?.players.find((p) => p.id === turnPlayerId)?.name;

  function pick(points, q) {
    socket.emit('finish:pick', { roomId, points, questionId: q.id });
  }

  function useStar() {
    socket.emit('finish:useStar', { roomId });
  }

  function submitAnswer(e) {
    e.preventDefault();
    if (checking || !answer.trim()) return;
    setAiError(null);
    socket.emit('finish:answer', { roomId, answer });
  }

  function submitSteal(e) {
    e.preventDefault();
    if (checking || !answer.trim()) return;
    setAiError(null);
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-olympia-navy mb-1">Về đích</h2>
        <p className="text-sm text-slate-500">
          Lượt của: <span className="font-bold text-olympia-navy">{turnName || '...'}</span>
        </p>
      </div>

      {!activeQuestion && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(packs).map(([points, qs]) => (
              <div key={points} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 text-center flex flex-col justify-between">
                <div>
                  <p className="font-extrabold text-2xl text-olympia-navy mb-1">{points} điểm</p>
                  <p className="text-xs text-slate-500 mb-4">Còn {qs.length} câu hỏi</p>
                </div>
                <button
                  className="w-full olympia-btn-primary text-sm py-2.5 font-bold shadow-sm disabled:opacity-50"
                  disabled={!isMyTurn || qs.length === 0}
                  onClick={() => qs.length > 0 && pick(Number(points), qs[0])}
                >
                  {qs.length === 0 ? 'Hết câu hỏi' : isMyTurn ? `Chọn câu ${points} điểm` : 'Chờ lượt'}
                </button>
              </div>
            ))}
          </div>
          {!isMyTurn && <p className="text-slate-500 mt-4 text-center">Chờ {turnName} chọn gói câu hỏi...</p>}
        </div>
      )}

      {activeQuestion && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="olympia-btn-primary text-xs py-1 px-3">{activeQuestion.points} điểm</span>
            {activeQuestion.starred && <span className="text-yellow-600 font-bold text-sm bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">⭐ Ngôi sao hy vọng</span>}
            {/* Star button: only show when question is shown and this player hasn't answered yet */}
            {isMyTurn && activeQuestion.pickedBy === selfId && !lastResult && !starUsed && (
              <button
                onClick={useStar}
                className="ml-auto text-xs px-3 py-1 rounded bg-yellow-400 hover:bg-yellow-500 text-olympia-navy font-bold"
              >
                ⭐ Dùng Ngôi sao hy vọng
              </button>
            )}
          </div>

          <p className="text-lg font-semibold text-olympia-navy bg-slate-50 p-4 rounded-xl border border-slate-200">
            {activeQuestion.text}
          </p>

          {activeQuestion.pickedBy === selfId && !lastResult && (
            <>
              <form onSubmit={submitAnswer} className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 border rounded-lg px-3 py-2 bg-white text-slate-800"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={checking}
                  placeholder="Nhập câu trả lời của bạn..."
                />
                <button
                  className={`min-w-[100px] rounded-lg font-medium transition-colors ${
                    aiError
                      ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                      : 'olympia-btn-primary'
                  }`}
                  disabled={checking}
                >
                  {checking ? '⏳ Đang chấm...' : aiError ? '🔄 Thử lại' : 'Trả lời'}
                </button>
              </form>
              {aiError && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800 font-medium">
                  ⚠️ {aiError.message}
                </div>
              )}
            </>
          )}

          {checking && <p className="text-sm text-slate-500 animate-pulse font-medium">🤖 AI đang kiểm tra câu trả lời...</p>}

          {activeQuestion.pickedBy !== selfId && !lastResult && (
            <p className="text-slate-500 italic text-sm">Chờ {turnName} đưa ra câu trả lời...</p>
          )}

          {lastResult && (
            <div className="border-t pt-4 space-y-3">
              <div className={`p-3 rounded-lg text-sm font-medium ${lastResult.correct ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {lastResult.correct ? (
                  <p>✅ Trả lời chính xác! ({lastResult.delta >= 0 ? '+' : ''}{lastResult.delta} điểm)</p>
                ) : (
                  <p>❌ Trả lời chưa chính xác!</p>
                )}
              </div>

              {/* Phần giành điểm cho người chơi khác */}
              {stealOpen && activeQuestion.pickedBy !== selfId && !lastResult.steal?.correct && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                    🔔 Cơ hội giành điểm (10 giây):
                  </p>
                  <form onSubmit={submitSteal} className="flex gap-2">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2 bg-white text-sm"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={checking}
                      placeholder="Nhập câu trả lời để giành điểm..."
                    />
                    <button
                      className={`min-w-[100px] rounded-lg font-medium transition-colors ${
                        aiError
                          ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                          : 'olympia-btn-secondary'
                      }`}
                      disabled={checking}
                    >
                      {checking ? '⏳ Đang chấm...' : aiError ? '🔄 Thử lại' : 'Giành điểm'}
                    </button>
                  </form>
                  {aiError && (
                    <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800 font-medium">
                      ⚠️ {aiError.message}
                    </div>
                  )}
                </div>
              )}

              {lastResult.steal && (
                <div className={`text-sm p-2 rounded ${lastResult.steal.correct ? 'bg-green-50 text-green-700 font-semibold' : 'bg-slate-100 text-slate-600'}`}>
                  {lastResult.steal.correct ? '🎉 Giành điểm thành công!' : '❌ Giành điểm không thành công.'}
                </div>
              )}

              {revealedAnswer && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  <span className="font-semibold text-amber-900">💡 Đáp án chính xác: </span>
                  <span className="font-bold text-amber-950 text-base">{revealedAnswer}</span>
                  <p className="text-xs text-amber-700 mt-1">Đang chuyển sang lượt tiếp theo...</p>
                </div>
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
