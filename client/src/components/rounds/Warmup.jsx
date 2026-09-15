import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket';
import { useGame } from '../../GameContext.jsx';

export default function Warmup({ roomId }) {
  const { selfId, isHost } = useGame();
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // {correct, correctAnswer, scoreDelta}
  const [reveal, setReveal] = useState(null);     // {correctAnswer} shown for 5s
  const [revealCountdown, setRevealCountdown] = useState(5);
  const [ended, setEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef(null);
  const revealTimerRef = useRef(null);

  useEffect(() => {
    function onQuestion(q) {
      setQuestion(q);
      setProgress({ index: q.index, total: q.total });
      setAnswer('');
      setFeedback(null);
      setReveal(null);
      setTimeLeft(q.timeLimitSeconds || 10);
      clearInterval(timerRef.current);
      clearInterval(revealTimerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    }
    function onResult(r) {
      if (r.playerId === selfId) setFeedback(r);
    }
    function onReveal(r) {
      // Time's up or someone got it right — show the correct answer for 5s
      setReveal(r);
      setRevealCountdown(5);
      clearInterval(timerRef.current);
      // Countdown the 5-second reveal window
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = setInterval(() => {
        setRevealCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    function onEnded() {
      setEnded(true);
      clearInterval(timerRef.current);
      clearInterval(revealTimerRef.current);
    }
    function onRoundStarted(payload) {
      if (payload.round === 'warmup') {
        socket.emit('room:sync', { roomId });
      }
    }
    socket.on('warmup:question', onQuestion);
    socket.on('warmup:result', onResult);
    socket.on('warmup:reveal', onReveal);
    socket.on('warmup:ended', onEnded);
    socket.on('round:started', onRoundStarted);
    socket.emit('room:sync', { roomId });
    return () => {
      socket.off('warmup:question', onQuestion);
      socket.off('warmup:result', onResult);
      socket.off('warmup:reveal', onReveal);
      socket.off('warmup:ended', onEnded);
      socket.off('round:started', onRoundStarted);
      clearInterval(timerRef.current);
      clearInterval(revealTimerRef.current);
    };
  }, [selfId, roomId]);

  function submit(e) {
    e.preventDefault();
    if (!question || feedback || reveal) return;
    socket.emit('warmup:answer', { roomId, questionId: question.id, answer });
  }

  if (ended) {
    return (
      <RoundEndPanel
        title="Kết thúc Khởi động"
        isHost={isHost}
        onNext={() => socket.emit('round:next', { roomId })}
      />
    );
  }

  if (!question) return <div className="olympia-panel p-8 text-center">Đang tải câu hỏi...</div>;

  // Answer reveal panel (shown for 5 seconds after time up or correct answer)
  if (reveal) {
    const wasCorrect = feedback?.correct;
    return (
      <div className="olympia-panel p-8">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>Câu {progress.index + 1}/{progress.total}</span>
          <span className="font-semibold text-olympia-blue">Câu tiếp theo: {revealCountdown}s</span>
        </div>
        <h2 className="text-xl font-semibold text-olympia-navy mb-4">{question.text}</h2>
        <div className="rounded-xl border-2 border-olympia-gold bg-olympia-gold/10 p-5 text-center animate-pulse">
          <p className="text-sm text-slate-500 mb-1">Đáp án đúng</p>
          <p className="text-2xl font-bold text-olympia-navy">{reveal.correctAnswer}</p>
        </div>
        {wasCorrect && (
          <p className="mt-4 text-center font-medium text-green-600">
            ✅ Bạn đã trả lời đúng! +{feedback.scoreDelta} điểm
          </p>
        )}
        {feedback && !wasCorrect && (
          <p className="mt-4 text-center font-medium text-olympia-red">❌ Chưa chính xác</p>
        )}
        {!feedback && (
          <p className="mt-4 text-center text-slate-400">Hết giờ!</p>
        )}
      </div>
    );
  }

  return (
    <div className="olympia-panel p-8">
      <div className="flex justify-between text-sm text-slate-500 mb-2">
        <span>Câu {progress.index + 1}/{progress.total}</span>
        <span className={`font-semibold ${timeLeft <= 3 ? 'text-olympia-red animate-pulse' : 'text-olympia-blue'}`}>
          {timeLeft}s
        </span>
      </div>
      <h2 className="text-xl font-semibold text-olympia-navy mb-6">{question.text}</h2>
      <form onSubmit={submit} className="flex gap-2">
        <input
          autoFocus
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-olympia-gold"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!feedback || !!reveal}
          placeholder="Nhập câu trả lời..."
        />
        <button className="olympia-btn-primary" disabled={!!feedback || !!reveal}>
          Trả lời
        </button>
      </form>
      {feedback && (
        <p className={`mt-4 font-medium ${feedback.correct ? 'text-green-600' : 'text-olympia-red'}`}>
          {feedback.correct
            ? `✅ Chính xác! +${feedback.scoreDelta} điểm — chờ đáp án...`
            : '❌ Chưa chính xác — chờ đáp án...'}
        </p>
      )}
    </div>
  );
}

export function RoundEndPanel({ title, isHost, onNext }) {
  return (
    <div className="olympia-panel p-8 text-center">
      <h2 className="text-xl font-semibold text-olympia-navy mb-4">{title}</h2>
      {isHost ? (
        <button className="olympia-btn-primary" onClick={onNext}>
          Tiếp tục vòng thi sau
        </button>
      ) : (
        <p className="text-slate-500">Chờ chủ phòng chuyển vòng thi...</p>
      )}
    </div>
  );
}
