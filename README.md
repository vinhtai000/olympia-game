# Đường Lên Đỉnh Olympia — Multiplayer Trivia Game

A real-time, multiplayer web trivia game inspired by the Vietnamese TV contest
"Đường lên đỉnh Olympia", built per the RPD: 4 official rounds, up to 5
players per room, grade-scoped question pools (Grade 1–12), and a no-deploy
admin panel for managing questions.

## Stack
- **Frontend**: React 18 (Vite) + Tailwind CSS + React Router + socket.io-client
- **Backend**: Node.js + Express + Socket.io
- **Data**: `server/questions.json`, read/written via the Node `fs` module (no DB, per MVP scope)

## Project layout
```
olympia-game/
├── server/               # Express + Socket.io backend
│   ├── index.js          # REST admin API + all real-time game logic
│   ├── questionBank.js   # grade-range pooling, CRUD over questions.json
│   ├── roomManager.js    # in-memory room/player state
│   ├── questions.json    # seeded starter question bank (placeholder content)
│   └── seed-generator.js # regenerates questions.json from scratch if needed
└── client/               # React (Vite) frontend
    └── src/
        ├── pages/        # Home, Lobby, Game, Admin
        ├── components/   # Leaderboard + one component per round
        ├── GameContext.jsx
        └── socket.js
```

## Running locally

### 1. Backend
```bash
cd server
npm install
npm start          # listens on http://localhost:4000
```

### 2. Frontend
```bash
cd client
npm install
cp .env.example .env   # points VITE_SERVER_URL at the backend
npm run dev             # http://localhost:5173
```

Open the app in up to 5 browser tabs/windows to simulate multiple players.
One player creates a room (choosing school level + grade) and shares the
5-character Room ID; others join from the home screen.

### Playing across different devices (not just tabs on one computer)

For a friend on another laptop/phone on the same WiFi to actually join:

1. Find the host machine's LAN IP (e.g. `192.168.1.23`) — `ipconfig` on
   Windows, `ifconfig` or `ipconfig getifaddr en0` on Mac/Linux.
2. In `client/.env`, set `VITE_SERVER_URL=http://192.168.1.23:4000`
   (the host's IP, not `localhost` — `localhost` on the guest's device
   points at *their own* machine, which is why joining silently fails).
3. Restart `npm run dev` in `client/` after changing `.env`. Vite is
   already configured to bind to all interfaces (`host: true`), so it'll
   print a "Network:" URL like `http://192.168.1.23:5173` — share that
   link with the other player instead of the `localhost` one.
4. The server's CORS is left open to any origin by default (fine for LAN
   play). If you deploy this publicly later, set `CLIENT_ORIGIN` to a
   comma-separated allowlist of real domains.
5. If it still can't connect, check that your firewall allows inbound
   connections on ports 4000 and 5173.

The Admin Panel is at `/admin` — add, edit, or delete questions for any
level/grade/round; changes write straight to `questions.json`, no restart
needed (per RPD §3.3). Note: no admin auth is implemented yet, matching the
RPD's "future scope" note.

## How the RPD requirements map to the code

- **Question selection logic (RPD §1)** — `questionBank.gradeRangeFor()`
  implements `min(grade - 2, levelFloor)` exactly as specified, and
  `getQuestionPool()` pools questions across that grade range.
- **Lobby & rooms (§3.1)** — `roomManager.js` (create/join/5-player cap) +
  `pages/Home.jsx` / `pages/Lobby.jsx`, synced live via `room:update` socket
  events.
- **4 rounds (§3.2)** — one server-side handler group per round in
  `server/index.js`, matched by a client component in
  `client/src/components/rounds/`:
  - Khởi động → `Warmup.jsx` (rapid sequential questions, fixed points)
  - Vượt chướng ngại vật → `Obstacle.jsx` (row clues + secret-phrase buzz-in,
    bonus scales down as more rows are revealed)
  - Tăng tốc → `Acceleration.jsx` (timed questions, rank-based points
    40/30/20/10)
  - Về đích → `Finish.jsx` (turn-based pack selection, Ngôi sao hy vọng
    star-of-hope doubling/penalty, buzz-in steal on a wrong answer)
- **Admin panel (§3.3)** — REST endpoints in `server/index.js`
  (`/api/questions/:level/:grade/:round[/:id]`) + `pages/Admin.jsx`.
- **Architecture (§4.2)** — the server is the single source of truth for game
  state (`roomManager`'s in-memory `rooms` map); the client only renders what
  it's told and never resolves scoring itself.

## Known MVP limitations / good next steps
- Answer matching is exact-ish (diacritic-insensitive, case/whitespace
  trimmed) — no fuzzy matching or partial-credit grading.
- No reconnection/session-resume: refreshing the browser drops you from the
  room (the socket ID changes). Rejoining requires creating/joining a new
  room.
- No admin authentication yet (flagged as future scope in the RPD).
- The obstacle round's row data model supports full editing only via the
  admin form's basic fields — editing individual row clues currently requires
  editing `questions.json` directly (noted in-app on the Admin screen).
- `questions.json` ships with placeholder sample content for all 12 grades so
  the app is playable immediately; replace it with real curated questions via
  the Admin Panel or by editing the file directly.
