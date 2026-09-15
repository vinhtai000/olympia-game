import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { socket } from '../socket';
import { useGame } from '../GameContext.jsx';

const LEVEL_GRADES = {
  primary: { label: 'Tiểu học', grades: [1, 2, 3, 4, 5] },
  secondary: { label: 'Trung học cơ sở', grades: [6, 7, 8, 9] },
  highschool: { label: 'Trung học phổ thông', grades: [10, 11, 12] }
};

export default function Home() {
  const navigate = useNavigate();
  const { playerName, setPlayerName, setRoom } = useGame();
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [level, setLevel] = useState('primary');
  const [grade, setGrade] = useState(1);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!playerName.trim()) return setError('Vui lòng nhập tên của bạn.');
    socket.emit('room:create', { name: playerName.trim(), level, grade }, (res) => {
      if (!res.ok) return setError('Không thể tạo phòng.');
      setRoom(res.room);
      navigate(`/lobby/${res.room.roomId}`);
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    setError('');
    if (!playerName.trim()) return setError('Vui lòng nhập tên của bạn.');
    if (!roomIdInput.trim()) return setError('Vui lòng nhập mã phòng.');
    socket.emit('room:join', { roomId: roomIdInput.trim().toUpperCase(), name: playerName.trim() }, (res) => {
      if (!res.ok) return setError(errorMessage(res.error));
      setRoom(res.room);
      navigate(`/lobby/${res.room.roomId}`);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-olympia-navy to-olympia-blue">
      <div className="olympia-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-olympia-navy text-center mb-1">
          Đường Lên Đỉnh Olympia
        </h1>
        <p className="text-center text-slate-500 mb-6">Phiên bản nhiều người chơi</p>

        <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-olympia-gold"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Nhập tên của bạn"
          maxLength={20}
        />

        <div className="flex mb-4 rounded-lg overflow-hidden border">
          <button
            className={`flex-1 py-2 font-medium ${mode === 'create' ? 'bg-olympia-blue text-white' : 'bg-white text-slate-600'}`}
            onClick={() => setMode('create')}
          >
            Tạo phòng
          </button>
          <button
            className={`flex-1 py-2 font-medium ${mode === 'join' ? 'bg-olympia-blue text-white' : 'bg-white text-slate-600'}`}
            onClick={() => setMode('join')}
          >
            Tham gia
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cấp học</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setGrade(LEVEL_GRADES[e.target.value].grades[0]);
                }}
              >
                {Object.entries(LEVEL_GRADES).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
              <select className="w-full border rounded-lg px-3 py-2" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {LEVEL_GRADES[level].grades.map((g) => (
                  <option key={g} value={g}>
                    Lớp {g}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="olympia-btn-primary w-full">
              Tạo phòng mới
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã phòng</label>
              <input
                className="w-full border rounded-lg px-3 py-2 uppercase tracking-widest"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="VD: AB12C"
                maxLength={8}
              />
            </div>
            <button type="submit" className="olympia-btn-primary w-full">
              Tham gia phòng
            </button>
          </form>
        )}

        {error && <p className="text-olympia-red text-sm mt-3">{error}</p>}

        <div className="text-center mt-6">
          <Link to="/admin" className="text-xs text-slate-400 hover:text-slate-600 underline">
            Quản trị ngân hàng câu hỏi
          </Link>
        </div>
      </div>
    </div>
  );
}

function errorMessage(code) {
  switch (code) {
    case 'ROOM_NOT_FOUND':
      return 'Không tìm thấy phòng.';
    case 'ROOM_FULL':
      return 'Phòng đã đủ 5 người chơi.';
    case 'GAME_ALREADY_STARTED':
      return 'Trận đấu đã bắt đầu.';
    default:
      return 'Đã xảy ra lỗi.';
  }
}
