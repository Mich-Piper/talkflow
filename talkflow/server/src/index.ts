// server/src/index.ts
import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import { initSocketServer } from './socket';
import channelRoutes  from './routes/channels';
import messageRoutes  from './routes/messages';
import fileRoutes     from './routes/files';
import authMiddleware from './middleware/auth';

const app    = express();
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true },
  transports: ['websocket', 'polling'],
});

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// REST routes
app.use('/api/channels', authMiddleware, channelRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/files',    authMiddleware, fileRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// WebSocket server
initSocketServer(io);

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => console.log(`TalkFlow server running on :${PORT}`));
