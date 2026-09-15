import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './GameContext.jsx';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameProvider>
  );
}
