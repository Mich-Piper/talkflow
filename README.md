# TalkFlow — Real-Time Team Chat App

A Slack-style team communication app with real-time messaging, file sharing, threaded replies, and workspace channels. Supports **500+ concurrent users** with sub-100ms message latency.

## Features

- **Real-time messaging** — WebSocket-based with Socket.io, sub-100ms latency
- **Workspace channels** — public/private channels with invite-only access
- **Threaded replies** — reply to any message without cluttering the main feed
- **File sharing** — drag-and-drop file uploads with preview (images, PDFs, code files)
- **Firebase Auth** — Google, GitHub, and email/password sign-in
- **Message reactions** — emoji reactions with live counter updates
- **Online presence** — real-time user online/away/offline status via Redis pub/sub
- **Search** — full-text message search across channels

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Socket.io-client, TailwindCSS |
| Backend | Node.js, Express, Socket.io |
| Database | MySQL (messages & channels), Redis (pub/sub, presence) |
| Auth | Firebase Authentication |
| File Storage | Firebase Storage |
| Deployment | Railway (API), Vercel (client) |

## Project Structure

```
talkflow/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Channel list + DM list
│   │   │   ├── MessageFeed.tsx   # Virtual-scrolled message list
│   │   │   ├── MessageInput.tsx  # Composer with file upload
│   │   │   └── ThreadPanel.tsx   # Slide-in thread view
│   │   ├── hooks/
│   │   │   ├── useSocket.ts      # Socket.io connection + event binding
│   │   │   └── usePresence.ts    # Online status subscription
│   │   └── store/                # Zustand state management
├── server/
│   ├── socket/
│   │   ├── index.ts              # Socket.io server setup
│   │   ├── messageHandlers.ts    # send, edit, delete, react
│   │   └── presenceHandlers.ts   # join/leave, heartbeat
│   ├── routes/
│   │   ├── channels.ts
│   │   ├── messages.ts
│   │   └── files.ts
│   ├── services/
│   │   ├── redis.ts              # Pub/sub + presence TTL
│   │   └── search.ts             # Full-text search
│   └── db/
│       └── migrations/           # MySQL schema files
└── shared/
    └── types.ts                  # Shared TS types (client + server)
```

## Getting Started

```bash
git clone https://github.com/michelllepiper/talkflow.git
cd talkflow

# Install root + workspace dependencies
npm install
cd client && npm install && cd ..

# Set up environment
cp .env.example .env
# Add MySQL, Redis, and Firebase credentials

# Run migrations
npm run db:migrate

# Start everything
npm run dev     # Concurrently runs API (:4001) + client (:3000)
```

### Environment Variables

```env
# Server
DATABASE_URL=mysql://user:pass@localhost:3306/talkflow
REDIS_URL=redis://localhost:6379
PORT=4001
CORS_ORIGIN=http://localhost:3000

# Firebase (server-side Admin SDK)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

## WebSocket Architecture

Each Socket.io connection is scoped to a workspace. Redis pub/sub fans out messages to all connected servers, enabling horizontal scaling:

```
Client A (Server 1) → emits "message:send"
Server 1 → publishes to Redis channel "workspace:acme"
Redis → delivers to Server 2
Server 2 → broadcasts to all clients in workspace "acme"
```

### Key Socket Events

```typescript
// Client → Server
socket.emit('message:send',   { channelId, content, threadId? })
socket.emit('message:react',  { messageId, emoji })
socket.emit('channel:join',   { channelId })
socket.emit('typing:start',   { channelId })

// Server → Client
socket.on('message:new',      (message) => ...)
socket.on('message:updated',  (message) => ...)
socket.on('presence:update',  ({ userId, status }) => ...)
socket.on('typing:update',    ({ userId, channelId, isTyping }) => ...)
```

## Performance

- 500+ concurrent users load-tested with Artillery
- Message fan-out P99 latency: 87ms
- Redis pub/sub handles ~8,000 events/second on a single node

---

Built by [Michelle Piper](https://github.com/michelllepiper)

