require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const qb = require('./questionBank');
const rm = require('./roomManager');
const aiChecker = require('./aiChecker');

const PORT = process.env.PORT || 4000;
// CLIENT_ORIGIN can be a comma-separated allowlist for production use
// (e.g. "https://mygame.com,https://www.mygame.com"). Left unset, the
// server reflects whatever origin the request came from, which is what
// you want during local/LAN play: players opening the app from
// http://localhost:5173, http://<your-lan-ip>:5173, or a phone on the
// same WiFi all need to be allowed, and their exact origin isn't known
// ahead of time.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim())
  : true; // true = reflect request origin (cors & socket.io both support this)

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });

/* ============================================================
 * Admin REST API — no-deploy question management
 * ========================================================== */

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/questions/:level?/:grade?/:round?', (req, res) => {
  const { level, grade, round } = req.params;
  res.json(qb.listQuestions(level, grade, round));
});

app.post('/api/questions/:level/:grade/:round', (req, res) => {
  const { level, grade, round } = req.params;
  const question = { id: req.body.id || `custom-${Date.now()}`, ...req.body };
  const created = qb.addQuestion(level, grade, round, question);
  res.status(201).json(created);
});

app.put('/api/questions/:level/:grade/:round/:id', (req, res) => {
  const { level, grade, round, id } = req.params;
  const updated = qb.updateQuestion(level, grade, round, id, req.body);
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(updated);
});

app.delete('/api/questions/:level/:grade/:round/:id', (req, res) => {
  const { level, grade, round, id } = req.params;
  const ok = qb.deleteQuestion(level, grade, round, id);
  if (!ok) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ ok: true });
});

app.get('/api/meta', (req, res) => {
  res.json({ levelFloor: qb.LEVEL_FLOOR, levelGrades: qb.LEVEL_GRADES });
});

/* ============================================================
 * Socket.io — real-time game engine
 * ========================================================== */

const FINISH_PACK_POINTS = [10, 20, 30];
const ACCEL_RANK_POINTS = [40, 30, 20, 10];

function emitRoomUpdate(roomId) {
  const room = rm.getRoom(roomId);
  if (room) io.to(roomId).emit('room:update', rm.publicRoomView(room));
}

io.on('connection', (socket) => {
  /* ---------- Lobby ---------- */

  socket.on('room:create', ({ name, level, grade }, ack) => {
    const room = rm.createRoom({ hostSocketId: socket.id, hostName: name, level, grade });
    socket.join(room.roomId);
    ack?.({ ok: true, room: rm.publicRoomView(room) });
  });

  socket.on('room:join', ({ roomId, name }, ack) => {
    const result = rm.joinRoom(roomId, socket.id, name);
    if (result.error) return ack?.({ ok: false, error: result.error });
    socket.join(roomId);
    ack?.({ ok: true, room: rm.publicRoomView(result.room) });
    emitRoomUpdate(roomId);
  });

  socket.on('room:start', ({ roomId }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    startWarmup(room);
  });

  // Whenever a round component mounts on the client, it asks for the
  // current round's live state. This closes a race where the server
  // pushes the first question/state for a round before the client has
  // finished navigating/rendering and attached its listeners — without
  // this, that initial push is silently missed and the client sits on
  // a permanent loading screen.
  socket.on('room:sync', ({ roomId }) => {
    const room = rm.getRoom(roomId);
    if (!room) return;
    // Always send the latest room snapshot first so the client
    // has room.status before we send round-specific payloads.
    socket.emit('room:update', rm.publicRoomView(room));
    sendCurrentRoundState(room, socket);
  });

  function sendCurrentRoundState(room, socket) {
    const rs = room.roundState;
    if (!rs) return;

    if (room.status === 'warmup' && rs.currentIndex >= 0 && rs.currentIndex < rs.questions.length) {
      const q = rs.questions[rs.currentIndex];
      socket.emit('warmup:question', {
        index: rs.currentIndex,
        total: rs.questions.length,
        id: q.id,
        text: q.text,
        timeLimitSeconds: 20
      });
    } else if (room.status === 'obstacle') {
      const puzzle = rs.puzzle;
      socket.emit('round:started', {
        round: 'obstacle',
        rows: puzzle ? puzzle.rows.map((r) => ({
          id: r.id,
          clue: r.clue,
          charCount: String(r.answer || '').replace(/\s+/g, '').length,
          letterCount: String(r.answer || '').replace(/\s+/g, '').length
        })) : [],
        totalRows: puzzle ? puzzle.rows.length : 0,
        secretPhraseCharCount: puzzle ? String(puzzle.secretPhrase || '').replace(/\s+/g, '').length : 0
      });
      rs.revealedRows.forEach((rowId) => {
        const row = rs.puzzle?.rows.find((r) => r.id === rowId);
        if (row) {
          socket.emit('obstacle:rowResult', {
            rowId,
            correct: true,
            answer: row.answer,
            revealedCount: rs.revealedRows.size
          });
        }
      });
    } else if (room.status === 'acceleration' && rs.currentIndex >= 0 && rs.currentIndex < rs.questions.length) {
      const q = rs.questions[rs.currentIndex];
      socket.emit('acceleration:question', {
        index: rs.currentIndex,
        total: rs.questions.length,
        id: q.id,
        text: q.text,
        image: q.image,
        options: q.options,
        timeLimitSeconds: q.timeLimitSeconds || 30
      });
    } else if (room.status === 'finish') {
      socket.emit('round:started', {
        round: 'finish',
        packs: Object.fromEntries(
          Object.entries(rs.packs).map(([pts, qs]) => [pts, qs.map((q) => ({ id: q.id, text: q.text, points: q.points }))])
        )
      });
      const connected = room.players.filter((p) => p.connected);
      const player = connected[rs.turnIndex % connected.length];
      socket.emit('finish:turn', { playerId: player?.id });
      if (rs.activeQuestion) {
        socket.emit('finish:questionShown', {
          id: rs.activeQuestion.id,
          text: rs.activeQuestion.text,
          points: rs.activeQuestion.points,
          pickedBy: rs.activeQuestion.pickedBy,
          starred: rs.starUsedBy.has(rs.activeQuestion.pickedBy)
        });
      }
    }
  }

  /* ---------- Round 1: Khởi động (Warm-up) ---------- */

  function startWarmup(room) {
    rm.nextRound(room); // -> 'warmup'
    const pool = qb.shuffle(qb.getQuestionPool(room.grade, 'warmup')).slice(0, 8);
    room.roundState = {
      questions: pool,
      currentIndex: -1,
      answered: new Set(),
      questionStartedAt: null
    };
    emitRoomUpdate(room.roomId);
    io.to(room.roomId).emit('round:started', { round: 'warmup', totalQuestions: pool.length });
    
    // Delay sending the first question so clients have time to navigate and mount components
    setTimeout(() => {
      nextWarmupQuestion(room);
    }, 2000);
  }

  function nextWarmupQuestion(room) {
    const rs = room.roundState;
    rs.currentIndex += 1;
    if (rs.currentIndex >= rs.questions.length) {
      io.to(room.roomId).emit('warmup:ended', { scores: rm.publicRoomView(room).players });
      return;
    }
    rs.answered = new Set();
    rs.questionSettled = false;
    rs.questionStartedAt = Date.now();
    const q = rs.questions[rs.currentIndex];
    io.to(room.roomId).emit('warmup:question', {
      index: rs.currentIndex,
      total: rs.questions.length,
      id: q.id,
      text: q.text,
      timeLimitSeconds: 20
    });
    // Auto-expire: reveal answer then advance after 5s
    setTimeout(() => revealWarmupAnswer(room, q.id), 20 * 1000);
  }

  function revealWarmupAnswer(room, questionId) {
    const rs = room.roundState;
    if (!rs || rs.questionSettled) return;
    const q = rs.questions[rs.currentIndex];
    if (!q || q.id !== questionId) return;
    rs.questionSettled = true;
    // Broadcast the correct answer to all players for 5 seconds
    io.to(room.roomId).emit('warmup:reveal', { questionId, correctAnswer: q.answer });
    setTimeout(() => nextWarmupQuestion(room), 5000);
  }

  socket.on('warmup:answer', async ({ roomId, questionId, answer }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'warmup') return;
    const rs = room.roundState;
    const q = rs.questions[rs.currentIndex];
    if (!q || q.id !== questionId || rs.answered.has(socket.id) || rs.questionSettled) return;
    rs.answered.add(socket.id);

    // If answer matches the questionbank answer directly, award points immediately without checking AI!
    if (aiChecker.isDirectMatch(answer, q.answer)) {
      rm.addScore(room, socket.id, 10);
      emitRoomUpdate(roomId);
      io.to(roomId).emit('warmup:result', {
        playerId: socket.id,
        questionId,
        correct: true,
        correctAnswer: q.answer,
        scoreDelta: 10
      });
      revealWarmupAnswer(room, questionId);
      return;
    }

    // Only consult AI if not directly matched
    socket.emit('warmup:checking', { questionId });

    const result = await aiChecker.check(q.text, answer, q.answer);

    // Re-validate room state after async call (player may have disconnected or question already settled)
    const roomNow = rm.getRoom(roomId);
    if (!roomNow || roomNow.status !== 'warmup' || rs.questionSettled) return;

    // If AI failed and fallback couldn't confirm, undo the lock and allow a retry
    if (result.aiError) {
      rs.answered.delete(socket.id);
      socket.emit('warmup:aiError', {
        questionId,
        message: 'Dịch vụ AI gặp lỗi. Câu trả lời chưa được chấm — bạn có thể thử lại!'
      });
      return;
    }

    if (result.correct) {
      rm.addScore(room, socket.id, 10);
      emitRoomUpdate(roomId);
      io.to(roomId).emit('warmup:result', {
        playerId: socket.id,
        questionId,
        correct: true,
        correctAnswer: q.answer,
        scoreDelta: 10
      });
      revealWarmupAnswer(room, questionId);
    } else {
      io.to(roomId).emit('warmup:result', { playerId: socket.id, questionId, correct: false });
      const connectedCount = room.players.filter((p) => p.connected).length;
      if (rs.answered.size >= connectedCount) {
        revealWarmupAnswer(room, questionId);
      }
    }
  });

  socket.on('round:next', ({ roomId }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.status === 'warmup') startObstacle(room);
    else if (room.status === 'obstacle') startAcceleration(room);
    else if (room.status === 'acceleration') startFinish(room);
    else if (room.status === 'finish') endGame(room);
  });

  /* ---------- Round 2: Vượt chướng ngại vật (Obstacle Course) ---------- */

  function startObstacle(room) {
    rm.nextRound(room); // -> 'obstacle'
    const puzzle = qb.getQuestionPool(room.grade, 'obstacle');
    room.roundState = {
      puzzle,
      revealedRows: new Set(),
      solved: false
    };
    emitRoomUpdate(room.roomId);
    io.to(room.roomId).emit('round:started', {
      round: 'obstacle',
      rows: puzzle ? puzzle.rows.map((r) => ({
        id: r.id,
        clue: r.clue,
        charCount: String(r.answer || '').replace(/\s+/g, '').length,
        letterCount: String(r.answer || '').replace(/\s+/g, '').length
      })) : [],
      totalRows: puzzle ? puzzle.rows.length : 0,
      secretPhraseCharCount: puzzle ? String(puzzle.secretPhrase || '').replace(/\s+/g, '').length : 0
    });
  }

  socket.on('obstacle:answerRow', async ({ roomId, rowId, guess }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'obstacle' || room.roundState.solved) return;
    const rs = room.roundState;
    if (!rs.puzzle || rs.revealedRows.has(rowId)) return;
    const row = rs.puzzle.rows.find((r) => r.id === rowId);
    if (!row) return;

    // If guess matches the questionbank answer directly, award points immediately without checking AI!
    if (aiChecker.isDirectMatch(guess, row.answer)) {
      rs.revealedRows.add(rowId);
      rm.addScore(room, socket.id, 10);
      emitRoomUpdate(roomId);
      io.to(roomId).emit('obstacle:rowResult', {
        rowId,
        correct: true,
        answer: row.answer,
        by: socket.id,
        revealedCount: rs.revealedRows.size
      });
      if (rs.revealedRows.size === rs.puzzle.rows.length) {
        io.to(roomId).emit('obstacle:allRowsRevealed');
      }
      return;
    }

    socket.emit('obstacle:checking', { rowId });
    const result = await aiChecker.check(row.clue, guess, row.answer);

    const roomNow = rm.getRoom(roomId);
    if (!roomNow || roomNow.status !== 'obstacle' || rs.revealedRows.has(rowId)) return;

    // If AI failed and fallback also couldn't confirm, let the player retry instead of marking wrong
    if (result.aiError) {
      socket.emit('obstacle:aiError', {
        rowId,
        context: 'row',
        message: 'Dịch vụ AI gặp lỗi. Câu trả lời chưa được chấm — bạn có thể thử lại!'
      });
      return;
    }

    if (result.correct) {
      rs.revealedRows.add(rowId);
      rm.addScore(room, socket.id, 10);
      emitRoomUpdate(roomId);
    }
    io.to(roomId).emit('obstacle:rowResult', {
      rowId,
      correct: result.correct,
      answer: result.correct ? row.answer : undefined,
      by: socket.id,
      revealedCount: rs.revealedRows.size
    });
    // When all rows revealed, notify clients (phrase guess still needed)
    if (result.correct && rs.revealedRows.size === rs.puzzle.rows.length) {
      io.to(roomId).emit('obstacle:allRowsRevealed');
    }
  });

  socket.on('obstacle:guessPhrase', async ({ roomId, guess }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'obstacle' || room.roundState.solved) return;
    const rs = room.roundState;
    if (!rs.puzzle) return;

    // If guess matches the secret phrase directly, award points immediately without checking AI!
    if (aiChecker.isDirectMatch(guess, rs.puzzle.secretPhrase)) {
      rs.solved = true;
      const bonus = 30 - rs.revealedRows.size * 5;
      const pts = Math.max(bonus, 10);
      rm.addScore(room, socket.id, pts);
      io.to(roomId).emit('obstacle:solved', {
        phrase: rs.puzzle.secretPhrase,
        solvedBy: socket.id,
        points: pts
      });
      emitRoomUpdate(roomId);
      return;
    }

    socket.emit('obstacle:checking', { phrase: true });
    const result = await aiChecker.check(
      `Từ khóa chướng ngại vật: ${rs.puzzle.secretPhrase}`,
      guess,
      rs.puzzle.secretPhrase
    );

    const roomNow = rm.getRoom(roomId);
    if (!roomNow || roomNow.status !== 'obstacle' || rs.solved) return;

    // If AI failed, let player retry instead of silently marking wrong
    if (result.aiError) {
      socket.emit('obstacle:aiError', {
        context: 'phrase',
        message: 'Dịch vụ AI gặp lỗi. Câu trả lời chưa được chấm — bạn có thể thử lại!'
      });
      return;
    }

    if (result.correct) {
      rs.solved = true;
      const bonus = 30 - rs.revealedRows.size * 5;
      const pts = Math.max(bonus, 10);
      rm.addScore(room, socket.id, pts);
      io.to(roomId).emit('obstacle:solved', {
        phrase: rs.puzzle.secretPhrase,
        solvedBy: socket.id,
        points: pts
      });
      emitRoomUpdate(roomId);
    } else {
      io.to(roomId).emit('obstacle:guessResult', { by: socket.id, correct: false });
    }
  });

  /* ---------- Round 3: Tăng tốc (Acceleration) ---------- */

  function startAcceleration(room) {
    rm.nextRound(room); // -> 'acceleration'
    const pool = qb.shuffle(qb.getQuestionPool(room.grade, 'acceleration')).slice(0, 4);
    room.roundState = { questions: pool, currentIndex: -1, ranking: [], startedAt: null };
    emitRoomUpdate(room.roomId);
    io.to(room.roomId).emit('round:started', { round: 'acceleration', totalQuestions: pool.length });
    setTimeout(() => nextAccelQuestion(room), 2000);
  }

  function nextAccelQuestion(room) {
    const rs = room.roundState;
    rs.currentIndex += 1;
    if (rs.currentIndex >= rs.questions.length) {
      io.to(room.roomId).emit('acceleration:ended', { scores: rm.publicRoomView(room).players });
      return;
    }
    rs.ranking = [];
    rs.startedAt = Date.now();
    const q = rs.questions[rs.currentIndex];
    io.to(room.roomId).emit('acceleration:question', {
      index: rs.currentIndex,
      total: rs.questions.length,
      id: q.id,
      text: q.text,
      image: q.image,
      options: q.options,
      timeLimitSeconds: q.timeLimitSeconds || 30
    });
    setTimeout(() => finishAccelQuestion(room, q), (q.timeLimitSeconds || 30) * 1000);
  }

  function finishAccelQuestion(room, q) {
    const rs = room.roundState;
    if (!rs || rs.questions[rs.currentIndex]?.id !== q.id || rs.settled) return;
    rs.settled = true;

    const correctRankers = rs.ranking.filter((r) => r.correct);
    correctRankers.forEach((r, idx) => {
      const pts = ACCEL_RANK_POINTS[idx] || 0;
      rm.addScore(room, r.playerId, pts);
    });
    io.to(room.roomId).emit('acceleration:questionResult', {
      questionId: q.id,
      correctAnswer: q.answer,
      ranking: correctRankers.map((r, idx) => ({ playerId: r.playerId, points: ACCEL_RANK_POINTS[idx] || 0 }))
    });
    emitRoomUpdate(room.roomId);
    rs.settled = false;
    setTimeout(() => nextAccelQuestion(room), 1500);
  }

  socket.on('acceleration:answer', ({ roomId, questionId, choice }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'acceleration') return;
    const rs = room.roundState;
    const q = rs.questions[rs.currentIndex];
    if (!q || q.id !== questionId) return;
    if (rs.ranking.find((r) => r.playerId === socket.id)) return; // already answered

    const correct = normalize(choice) === normalize(q.answer);
    rs.ranking.push({ playerId: socket.id, correct, at: Date.now() });
    rs.ranking.sort((a, b) => a.at - b.at);
    socket.emit('acceleration:ack', { correct });
  });

  /* ---------- Round 4: Về đích (Finish Line) ---------- */

  function startFinish(room) {
    rm.nextRound(room); // -> 'finish'
    const pool = qb.getQuestionPool(room.grade, 'finish');
    const packs = {};
    FINISH_PACK_POINTS.forEach((pts) => {
      const countNeeded = Math.max((room.players?.length || 1) * 3, 9);
      packs[pts] = qb.shuffle(pool.filter((q) => q.points === pts)).slice(0, countNeeded);
    });
    room.roundState = {
      packs,
      turnIndex: 0,
      starUsedBy: new Set(),
      activeQuestion: null,
      stealOpen: false
    };
    emitRoomUpdate(room.roomId);
    io.to(room.roomId).emit('round:started', {
      round: 'finish',
      packs: Object.fromEntries(
        Object.entries(packs).map(([pts, qs]) => [pts, qs.map((q) => ({ id: q.id, text: q.text, points: q.points }))])
      )
    });
    setTimeout(() => announceFinishTurn(room), 2000);
  }

  function announceFinishTurn(room) {
    const rs = room.roundState;
    const player = room.players.filter((p) => p.connected)[rs.turnIndex % room.players.filter((p) => p.connected).length];
    io.to(room.roomId).emit('finish:turn', { playerId: player?.id });
  }

  socket.on('finish:useStar', ({ roomId }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'finish') return;
    const rs = room.roundState;
    if (rs.starUsedBy.has(socket.id)) return;
    rs.starUsedBy.add(socket.id);
    io.to(roomId).emit('finish:starUsed', { playerId: socket.id });
  });

  socket.on('finish:pick', ({ roomId, points, questionId }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'finish') return;
    const rs = room.roundState;
    if (rs.activeQuestion) return;
    const q = (rs.packs[points] || []).find((x) => x.id === questionId);
    if (!q) return;
    // Remove the picked question from the pack on the server
    rs.packs[points] = (rs.packs[points] || []).filter((x) => x.id !== questionId);
    rs.activeQuestion = { ...q, pickedBy: socket.id, wrongBy: new Set() };
    rs.stealOpen = false;
    io.to(roomId).emit('finish:questionShown', {
      id: q.id,
      text: q.text,
      points: q.points,
      pickedBy: socket.id,
      starred: rs.starUsedBy.has(socket.id)
    });
  });

  socket.on('finish:answer', async ({ roomId, answer }) => {
    const room = rm.getRoom(roomId);
    if (!room || room.status !== 'finish' || !room.roundState?.activeQuestion) return;
    const rs = room.roundState;
    const q = rs.activeQuestion;
    if (q.pickedBy !== socket.id) return;

    // If answer matches the questionbank answer directly, award points immediately without checking AI!
    if (aiChecker.isDirectMatch(answer, q.answer)) {
      const starred = rs.starUsedBy.has(socket.id);
      const delta = q.points * (starred ? 2 : 1);
      rm.addScore(room, socket.id, delta);
      emitRoomUpdate(roomId);
      io.to(roomId).emit('finish:questionResult', { correct: true, answer: q.answer, playerId: socket.id, delta });
      setTimeout(() => advanceFinishTurn(room), 3500);
      return;
    }

    socket.emit('finish:checking');
    const result = await aiChecker.check(q.text, answer, q.answer);

    const roomNow = rm.getRoom(roomId);
    if (!roomNow || roomNow.status !== 'finish' || !rs.activeQuestion || rs.activeQuestion.id !== q.id) return;

    // AI failed - let the player retry without penalising them
    if (result.aiError) {
      socket.emit('finish:aiError', { message: 'Dịch vụ AI gặp lỗi. Câu trả lời chưa được chấm — bạn có thể thử lại!' });
      return;
    }

    const starred = rs.starUsedBy.has(socket.id);
    const delta = result.correct ? q.points * (starred ? 2 : 1) : (starred ? -q.points : 0);
    rm.addScore(room, socket.id, delta);
    emitRoomUpdate(roomId);

    if (result.correct) {
      io.to(roomId).emit('finish:questionResult', { correct: true, answer: q.answer, playerId: socket.id, delta });
      setTimeout(() => advanceFinishTurn(room), 3500);
    } else {
      const otherPlayers = room.players.filter((p) => p.connected && p.id !== socket.id);
      if (otherPlayers.length === 0) {
        // Solo player: no one else to steal, reveal answer immediately and advance turn!
        io.to(roomId).emit('finish:questionResult', {
          correct: false,
          answer: q.answer,
          playerId: socket.id,
          delta,
          stealOpen: false
        });
        setTimeout(() => advanceFinishTurn(room), 4000);
      } else {
        rs.stealOpen = true;
        io.to(roomId).emit('finish:questionResult', {
          correct: false,
          playerId: socket.id,
          delta,
          stealOpen: true,
          stealTimeoutSeconds: 10
        });
        if (rs.stealTimer) clearTimeout(rs.stealTimer);
        rs.stealTimer = setTimeout(() => {
          closeStealAndAdvance(room, q);
        }, 10000);
      }
    }
  });

  socket.on('finish:steal', async ({ roomId, answer }) => {
    const room = rm.getRoom(roomId);
    const rs = room?.roundState;
    if (!room || room.status !== 'finish' || !rs?.activeQuestion || !rs.stealOpen) return;
    const q = rs.activeQuestion;
    if (q.pickedBy === socket.id || q.wrongBy.has(socket.id)) return;

    // If steal answer matches the questionbank answer directly, award points immediately without checking AI!
    if (aiChecker.isDirectMatch(answer, q.answer)) {
      if (rs.stealTimer) clearTimeout(rs.stealTimer);
      rm.addScore(room, socket.id, q.points);
      rs.stealOpen = false;
      emitRoomUpdate(roomId);
      io.to(roomId).emit('finish:stealResult', { correct: true, playerId: socket.id, answer: q.answer });
      setTimeout(() => advanceFinishTurn(room), 3500);
      return;
    }

    socket.emit('finish:checking');
    const result = await aiChecker.check(q.text, answer, q.answer);

    const roomNow = rm.getRoom(roomId);
    if (!roomNow || roomNow.status !== 'finish' || !rs.activeQuestion || !rs.stealOpen) return;
    if (q.wrongBy.has(socket.id)) return; // prevent double-processing

    // AI failed - let the stealer retry without consuming their attempt
    if (result.aiError) {
      socket.emit('finish:aiError', { message: 'Dịch vụ AI gặp lỗi. Câu trả lời chưa được chấm — bạn có thể thử lại!' });
      return;
    }

    if (result.correct) {
      if (rs.stealTimer) clearTimeout(rs.stealTimer);
      rm.addScore(room, socket.id, q.points);
      rs.stealOpen = false;
      emitRoomUpdate(roomId);
      io.to(roomId).emit('finish:stealResult', { correct: true, playerId: socket.id, answer: q.answer });
      setTimeout(() => advanceFinishTurn(room), 3500);
    } else {
      q.wrongBy.add(socket.id);
      io.to(roomId).emit('finish:stealResult', { correct: false, playerId: socket.id });
      const otherPlayers = room.players.filter((p) => p.connected && p.id !== q.pickedBy);
      const remaining = otherPlayers.filter((p) => !q.wrongBy.has(p.id));
      if (remaining.length === 0) {
        if (rs.stealTimer) clearTimeout(rs.stealTimer);
        closeStealAndAdvance(room, q);
      }
    }
  });

  function closeStealAndAdvance(room, q) {
    const rs = room.roundState;
    if (!rs || !rs.activeQuestion || rs.activeQuestion.id !== q.id) return;
    rs.stealOpen = false;
    io.to(room.roomId).emit('finish:stealClosed', { answer: q.answer });
    setTimeout(() => advanceFinishTurn(room), 4000);
  }

  function advanceFinishTurn(room) {
    const rs = room.roundState;
    if (!rs) return;
    if (rs.stealTimer) clearTimeout(rs.stealTimer);
    rs.activeQuestion = null;
    rs.stealOpen = false;
    rs.turnIndex += 1;
    const remaining = Object.values(rs.packs).some((qs) => qs.length > 0);
    if (!remaining) {
      io.to(room.roomId).emit('finish:ended', { scores: rm.publicRoomView(room).players });
      return;
    }
    announceFinishTurn(room);
  }

  function endGame(room) {
    room.status = 'ended';
    emitRoomUpdate(room.roomId);
    const players = [...rm.publicRoomView(room).players].sort((a, b) => b.score - a.score);
    io.to(room.roomId).emit('game:ended', { winner: players[0], scores: players });
  }

  /* ---------- Disconnect ---------- */

  socket.on('disconnect', () => {
    const room = rm.removePlayer(socket.id);
    if (room) {
      emitRoomUpdate(room.roomId);
      rm.deleteRoomIfEmpty(room.roomId);
    }
  });
});

function normalize(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip Vietnamese diacritics for lenient matching
}

server.listen(PORT, () => {
  console.log(`Olympia server listening on http://localhost:${PORT}`);
});
