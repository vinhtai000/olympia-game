const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

// roomId -> room
const rooms = new Map();

const ROUND_ORDER = ['warmup', 'obstacle', 'acceleration', 'finish'];

function createRoom({ hostSocketId, hostName, level, grade }) {
  let roomId;
  do {
    roomId = nanoid();
  } while (rooms.has(roomId));

  const room = {
    roomId,
    level,
    grade: Number(grade),
    hostSocketId,
    status: 'lobby', // lobby | warmup | obstacle | acceleration | finish | ended
    roundIndex: -1,
    players: [
      { id: hostSocketId, name: hostName, score: 0, connected: true, isHost: true }
    ],
    roundState: null
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function joinRoom(roomId, socketId, name) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'lobby') return { error: 'GAME_ALREADY_STARTED' };
  if (room.players.length >= 5) return { error: 'ROOM_FULL' };

  room.players.push({ id: socketId, name, score: 0, connected: true, isHost: false });
  return { room };
}

function removePlayer(socketId) {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.id === socketId);
    if (player) {
      player.connected = false;
      return room;
    }
  }
  return null;
}

function nextRound(room) {
  room.roundIndex += 1;
  room.status = ROUND_ORDER[room.roundIndex] || 'ended';
  room.roundState = null;
  return room.status;
}

function addScore(room, playerId, delta) {
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.score += delta;
  return player;
}

function publicRoomView(room) {
  return {
    roomId: room.roomId,
    level: room.level,
    grade: room.grade,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      isHost: p.isHost
    }))
  };
}

function deleteRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (room && room.players.every((p) => !p.connected)) {
    rooms.delete(roomId);
    return true;
  }
  return false;
}

module.exports = {
  ROUND_ORDER,
  createRoom,
  getRoom,
  joinRoom,
  removePlayer,
  nextRound,
  addScore,
  publicRoomView,
  deleteRoomIfEmpty
};
