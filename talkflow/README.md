# TalkFlow — Real-Time Team Chat App

Slack-style team communication app with real-time messaging, file sharing, threaded replies, and workspace channels. Supports **500+ concurrent users** at sub-100ms latency.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Socket.io-client |
| Backend | Node.js, Express, Socket.io, TypeScript |
| Database | MySQL (messages/channels), Redis (pub/sub, presence) |
| Auth | Firebase Authentication |
| Storage | Firebase Storage (file uploads) |
| Deploy | Railway (API), Vercel (client) |

## Project Structure

```
talkflow/
├── client/src/
│   ├── components/       # Sidebar, MessageFeed, MessageInput, ThreadPanel
│   └── hooks/
│       └── useSocket.ts  # Socket.io connection + JWT auth + heartbeat
├── server/src/
│   ├── index.ts          # HTTP + Socket.io server bootstrap
│   ├── socket/
│   │   ├── index.ts              # Auth middleware, Redis sub, room management
│   │   ├── messageHandlers.ts    # send, react, typing events
│   │   └── presenceHandlers.ts   # online/away/offline via Redis TTL
│   └── db/
│       └── migrations/
│           └── 001_initial_schema.sql
└── server/package.json
```

## Quick Start

```bash
git clone https://github.com/michelllepiper/talkflow.git
cd talkflow/server
npm install
cp .env.example .env
npm run dev      # Socket.io server on :4001

# New terminal
cd ../client && npm install && npm run dev
```

## WebSocket Architecture

Redis pub/sub fans messages out across multiple server instances for horizontal scaling. Each socket joins a room per workspace channel; the Redis subscriber delivers to all servers simultaneously.

## Performance

- 500+ concurrent users (Artillery load tested)
- P99 message latency: 87ms
- Redis handles ~8,000 events/sec on a single node

---
Built by [Michelle Piper](https://github.com/michelllepiper)
