# 🌊 ChatWave — Full-Stack WhatsApp Clone

## Architecture

```
chatwave/
├── backend/          ← Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── config/   ← db.js, migrate.js
│   │   ├── middleware/← auth.js, upload.js
│   │   ├── routes/   ← auth, users, chats, messages, groups, status, calls, communities, admin
│   │   └── sockets/  ← chatHandlers.js (Socket.IO)
│   ├── schema.sql    ← Full PostgreSQL schema
│   ├── .env          ← DB credentials + JWT secret
│   └── package.json
│
└── frontend/         ← React + Vite + Tailwind CSS
    ├── src/
    │   ├── context/  ← Auth, Socket, Chat, Theme
    │   ├── services/ ← api.js (Axios)
    │   ├── pages/    ← Splash, Auth, Home, ChatPage, Status, Calls, Communities, Settings, Admin
    │   └── components/
    │       ├── chat/ ← ChatList, ChatWindow, MessageBubble, MessageInput, ChatHeader, TypingIndicator, SmartReplies
    │       ├── calls/← CallScreen (WebRTC)
    │       └── ui/   ← Avatar
    └── package.json
```

## Database
- **Host**: db01.dbhost.dev:5051
- **DB**: db_44rvcjmvg (PostgreSQL)

## Quick Start

### 1. Setup Backend
```bash
cd chatwave/backend
npm install
npm run migrate       # Creates all tables
npm run dev           # Starts API + Socket.IO on :5000
```

### 2. Setup Frontend
```bash
cd chatwave/frontend
npm install
npm run dev           # Starts React on :3000
```

### 3. Open App
Visit **http://localhost:3000**

Default admin: `admin@chatwave.app` / `Admin@123`

## Features
- ✅ Phone OTP + Email + Google Login
- ✅ One-to-one & Group Chat
- ✅ Real-time messaging (Socket.IO)
- ✅ Read receipts (✓ ✓✓ 🔵)
- ✅ Typing indicators
- ✅ Online presence
- ✅ Media sharing (images, videos, documents, voice notes)
- ✅ Message reactions (emoji)
- ✅ Reply, forward, delete, star messages
- ✅ Status stories (24h, text + photo)
- ✅ Voice & Video calls (WebRTC)
- ✅ Communities
- ✅ AI Smart Replies (Gemini API)
- ✅ Admin dashboard
- ✅ Dark mode + font size settings
- ✅ Push notifications (Browser API)
- ✅ QR code profile
- ✅ Polls in group chats
