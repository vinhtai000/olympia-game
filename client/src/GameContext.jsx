import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from './socket';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [selfId, setSelfId] = useState(socket.id);
  const [playerName, setPlayerName] = useState('');
  const [room, setRoom] = useState(null); // publicRoomView from server

  useEffect(() => {
    function onConnect() {
      setSelfId(socket.id);
    }
    function onRoomUpdate(r) {
      setRoom(r);
    }
    socket.on('connect', onConnect);
    socket.on('room:update', onRoomUpdate);
    return () => {
      socket.off('connect', onConnect);
      socket.off('room:update', onRoomUpdate);
    };
  }, []);

  const isHost = !!room?.players.find((p) => p.id === selfId)?.isHost;

  return (
    <GameContext.Provider value={{ selfId, playerName, setPlayerName, room, setRoom, isHost }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
