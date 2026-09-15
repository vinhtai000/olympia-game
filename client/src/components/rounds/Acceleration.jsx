import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';
import { RoundEndPanel } from './Warmup.jsx';

export default function Acceleration({ roomId }) {
  const { room, selfId, isHost } = useGame();
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    function onQuestion(q) {
      setQuestion(q);
      setProgress({ index: q.index, total: q.total });
      setChoice(null);
      setResult(null);
      setTimeLeft(q.timeLimitSeconds || 30);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    }
    function onQuestionResult(r) {
      setResult(r);
      clearInterval(timerRef.current);
    }
    function onEnded() {
      setEnded(true);
      clearInterval(timerRef.current);
    }
    socket.on('acceleration:question', onQuestion);
    socket.on('acceleration:questionResult', onQuestionResult);
    socket.on('acceleration:ended', onEnded);
    socket.emit('room:sync', { roomId });
    return () => {
      socket.off('acceleration:question', onQuestion);
      socket.off('acceleration:questionResult', onQuestionResult);
      socket.off('acceleration:ended', onEnded);
      clearInterval(timerRef.current);
    };
  }, [roomId]);

  function pick(opt) {
    if (choice || !question) return;
    setChoice(opt);
    socket.emit('acceleration:answer', { roomId, questionId: question.id, choice: opt });
  }

  function nameFor(id) {
    return room?.players.find((p) => p.id === id)?.name || '???';
  }

  if (ended) {
    return <RoundEndPanel title="Kết thúc Tăng tốc" isHost={isHost} onNext={() => socket.emit('round:next', { roomId })} />;
  }

  if (!question) return <div className="olympia-panel p-8 text-center">Đang tải câu hỏi...</div>;

  return (
    <div className="olympia-panel p-8">
      <div className="flex justify-between text-sm text-slate-500 mb-2">
        <span>
          Câu {progress.index + 1}/{progress.total}
        </span>
        <span className="font-semibold text-olympia-red">{timeLeft}s</span>
      </div>
      <h2 className="text-xl font-semibold text-olympia-navy mb-6">{question.text}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt) => (
          <button
            key={opt}
            onClick={() => pick(opt)}
            disabled={!!choice}
            className={`olympia-btn text-left ${
              choice === opt ? 'bg-olympia-blue text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {choice && !result && <p className="mt-4 text-slate-500">Đã gửi câu trả lời, chờ kết quả...</p>}
      {result && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm text-slate-500 mb-2">Đáp án đúng: {result.correctAnswer}</p>
          {result.ranking.length === 0 ? (
            <p className="text-olympia-red">Không ai trả lời đúng.</p>
          ) : (
            <ol className="space-y-1">
              {result.ranking.map((r, idx) => (
                <li key={r.playerId} className="text-green-700 font-medium">
                  {idx + 1}. {nameFor(r.playerId)} (+{r.points})
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
